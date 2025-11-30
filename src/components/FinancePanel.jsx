import { useState, useMemo, useEffect } from "react";
import { fmtDate, fmtTime } from "../lib/storage";
import { useI18n } from "../lib/i18n"; // ← добавлено

const isPaid = (b) => !!(b?.paid || b?.status === "approved_paid");
const isCanceled = (b) =>
  b.status === "canceled_client" || b.status === "canceled_admin";

const MANUAL_KEY = "iz.finance.manual.v1";
const EXCLUDE_KEY = "iz.finance.exclude.v1";

const pad2 = (n) => String(n).padStart(2, "0");

const formatDateISO = (dateLike) => {
  const d = new Date(dateLike);
  if (isNaN(d)) return "";
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};

export default function FinancePanel({
  bookings = [],
  serviceStyles = {},
  onDownloadReceipt,
}) {
  const { t, lang } = useI18n(); // ← добавлено

  const now = new Date();

  const [mode, setMode] = useState("month"); // month | year | range
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [rangeFrom, setRangeFrom] = useState(
    new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  );
  const [rangeTo, setRangeTo] = useState(now.toISOString().slice(0, 10));

  const [manualEntries, setManualEntries] = useState([]);
  const [excludedIds, setExcludedIds] = useState([]);

  const [formDate, setFormDate] = useState(formatDateISO(now));
  const [formTimeFrom, setFormTimeFrom] = useState("");
  const [formTimeTo, setFormTimeTo] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formDesc, setFormDesc] = useState("");

  // годы для селекта
  const years = useMemo(() => {
    const start = 2023; // поменяй если нужно раньше
    const curr = now.getFullYear();
    return Array.from({ length: curr - start + 2 }, (_, i) => start + i);
  }, []);

  // загрузка/сохранение manual и exclude
  useEffect(() => {
    try {
      const raw = localStorage.getItem(MANUAL_KEY);
      if (raw) setManualEntries(JSON.parse(raw) || []);
    } catch (e) { console.error(e); }
    try {
      const raw = localStorage.getItem(EXCLUDE_KEY);
      if (raw) setExcludedIds(JSON.parse(raw) || []);
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => {
    localStorage.setItem(MANUAL_KEY, JSON.stringify(manualEntries));
  }, [manualEntries]);

  useEffect(() => {
    localStorage.setItem(EXCLUDE_KEY, JSON.stringify(excludedIds));
  }, [excludedIds]);

  // диапазон дат
  const [rangeStart, rangeEnd] = useMemo(() => {
    let start, end;
    if (mode === "month") {
      start = new Date(year, month, 1);
      end = new Date(year, month + 1, 1);
    } else if (mode === "year") {
      start = new Date(year, 0, 1);
      end = new Date(year + 1, 0, 1);
    } else {
      const from = rangeFrom ? new Date(rangeFrom) : new Date(year, month, 1);
      const to = rangeTo ? new Date(rangeTo) : now;
      start = from;
      end = new Date(to.getFullYear(), to.getMonth(), to.getDate() + 1);
    }
    return [start, end];
  }, [mode, year, month, rangeFrom, rangeTo, now]);

  const isInRange = (d) => d >= rangeStart && d < rangeEnd;

  // метка периода (с локализацией месяцев)
  const rangeLabel = useMemo(() => {
    if (mode === "month") {
      const date = new Date(year, month, 1);
      let monthName = date.toLocaleString(lang, { month: "long" });
      monthName = monthName.charAt(0).toUpperCase() + monthName.slice(1);
      return `${monthName} ${year}`;
    }
    if (mode === "year") {
      return `${year}${t("finance_year_suffix")}`;
    }
    return `${t("finance_period_label")}: ${rangeFrom || "…"} – ${rangeTo || "…"}`;
  }, [mode, year, month, rangeFrom, rangeTo, lang, t]);

  // системные записи
  const systemItems = useMemo(() => {
    return bookings
      .filter((b) => {
        if (isCanceled(b) || !isPaid(b)) return false;
        const end = new Date(b.end || b.start);
        if (!isInRange(end)) return false;
        if (excludedIds.includes(b.id)) return false;
        return true;
      })
      .map((b) => {
        const end = new Date(b.end || b.start);
        const dateISO = end.toISOString().slice(0, 10);
        const services = Array.isArray(b.services) ? b.services : [];

        return {
          id: "sys-" + b.id,
          type: "system",
          bookingId: b.id,
          booking: b,
          date: dateISO,
          dateDisplay: fmtDate(b.start),
          timeDisplay: `${fmtTime(b.start)} – ${fmtTime(b.end || b.start)}`,
          amount: Number(b.price) || 0,
          tags: services,
          description: services.length > 0 ? services.join(", ") : t("finance_system_default_desc"),
          shortId: b.id.slice(0, 6),
        };
      });
  }, [bookings, excludedIds, rangeStart, rangeEnd, t]);

  const systemTotal = systemItems.reduce((s, i) => s + i.amount, 0);

  // ручные записи
  const manualItems = useMemo(() => {
    return manualEntries
      .map((e) => ({
        id: "man-" + e.id,
        manualId: e.id,
        type: "manual",
        date: e.date,
        dateDisplay: fmtDate(e.date),
        timeDisplay: e.time || "—",
        amount: Number(e.amount) || 0,
        description: e.description || t("finance_manual_default_desc"),
        tags: [],
      }))
      .filter((e) => isInRange(new Date(e.date)));
  }, [manualEntries, rangeStart, rangeEnd, t]);

  const manualTotal = manualItems.reduce((s, i) => s + i.amount, 0);

  const totalIncome = systemTotal + manualTotal;
  const totalExpenses = totalIncome * 0.3;
  const balance = totalIncome - totalExpenses;

  const combinedItems = useMemo(() => {
    const all = [...systemItems, ...manualItems];
    return all.sort((a, b) => a.date.localeCompare(b.date) || a.timeDisplay.localeCompare(b.timeDisplay));
  }, [systemItems, manualItems]);

  const addManual = () => {
    const amount = Number(formAmount);
    if (!formDate || !amount || amount <= 0) return;

    const time = formTimeFrom && formTimeTo ? `${formTimeFrom} – ${formTimeTo}` : formTimeFrom || formTimeTo || "";

    const entry = {
      id: Date.now(),
      date: formDate,
      amount,
      description: formDesc || t("finance_manual_default_desc"),
      time,
    };

    setManualEntries((prev) => [entry, ...prev]);
    setFormAmount("");
    setFormDesc("");
    setFormTimeFrom("");
    setFormTimeTo("");
  };

  const deleteItem = (item) => {
    if (!window.confirm(t("finance_delete_confirm"))) return;

    if (item.type === "system") {
      setExcludedIds((prev) => prev.includes(item.bookingId) ? prev : [...prev, item.bookingId]);
    } else {
      setManualEntries((prev) => prev.filter((e) => e.id !== item.manualId));
    }
  };

  const editManual = (item) => {
    if (item.type !== "manual") return;
    const entry = manualEntries.find((e) => e.id === item.manualId);
    if (!entry) return;

    const newDesc = window.prompt(t("finance_edit_desc_prompt"), entry.description || "");
    if (newDesc === null) return;

    const newAmountStr = window.prompt(t("finance_edit_amount_prompt"), String(entry.amount));
    if (newAmountStr === null) return;
    const newAmount = Number(newAmountStr);
    if (!newAmount || newAmount <= 0) return;

    const newTime = window.prompt(t("finance_edit_time_prompt"), entry.time || "");
    if (newTime === null) return;

    setManualEntries((prev) =>
      prev.map((e) =>
        e.id === entry.id
          ? { ...e, description: newDesc, amount: newAmount, time: newTime }
          : e
      )
    );
  };

  const exportPDF = () => {
    const win = window.open("", "PRINT", "width=960,height=720");
    if (!win) return;

    win.document.write(`
      <html>
        <head>
          <title>${t("finance_pdf_title")}</title>
          <style>
            body {font-family: system-ui, sans-serif; padding: 30px; background:#0f172a; color:#e2e8f0;}
            .shell {max-width:900px; margin:0 auto; background:#f8fafc; border-radius:16px; overflow:hidden; box-shadow:0 20px 60px rgba(0,0,0,0.4);}
            .header {padding:20px 30px; background:linear-gradient(135deg,#ec4899,#8b5cf6); color:white; display:flex; justify-content:space-between; align-items:center;}
            .header h1 {margin:0; font-size:24px;}
            .header small {opacity:0.9; font-size:14px;}
            .content {padding:25px 30px; line-height:1.5;}
            .summary {display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:16px; margin:20px 0;}
            .card {background:#fff; border-radius:12px; padding:14px; border:1px solid #e2e8f0;}
            .card-title {font-size:12px; color:#64748b; text-transform:uppercase; margin-bottom:6px;}
            .card-value {font-size:18px; font-weight:600; color:#1e293b;}
          </style>
        </head>
        <body>
          <div class="shell">
            <div class="header">
              <div>
                <h1>${t("finance_pdf_title")}</h1>
                <small>${rangeLabel}</small>
              </div>
              <div style="text-align:right;">
                <b>IZ HAIR TREND</b><br>${t("finance_pdf_subtitle")}
              </div>
            </div>
            <div class="content">
              <p>${t("finance_pdf_description")}</p>
              <div class="summary">
                <div class="card">
                  <div class="card-title">${t("finance_system")}</div>
                  <div class="card-value">€${systemTotal.toFixed(2)}</div>
                </div>
                <div class="card">
                  <div class="card-title">${t("finance_manual")}</div>
                  <div class="card-value">€${manualTotal.toFixed(2)}</div>
                </div>
                <div class="card">
                  <div class="card-title">${t("finance_expenses")}</div>
                  <div class="card-value">€${totalExpenses.toFixed(2)}</div>
                </div>
                <div class="card">
                  <div class="card-title">${t("finance_balance")}</div>
                  <div class="card-value">€${balance.toFixed(2)}</div>
                </div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `);

    win.document.close();
    setTimeout(() => {
      win.print();
      win.close();
    }, 500);
  };

  // ====================== RENDER ======================
  return (
    <div style={{ padding: "0 10px" }}>

      {/* Выбор режима периода */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 15 }}>{t("finance_period_label")}</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={() => setMode("month")} style={mode === "month" ? activeBtnStyle : btnStyle}>
            {t("finance_mode_month")}
          </button>
          <button onClick={() => setMode("year")} style={mode === "year" ? activeBtnStyle : btnStyle}>
            {t("finance_mode_year")}
          </button>
          <button onClick={() => setMode("range")} style={mode === "range" ? activeBtnStyle : btnStyle}>
            {t("finance_mode_range")}
          </button>
        </div>
      </div>

      {/* Селекты периода */}
      <div style={{ marginBottom: 20, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        {mode === "month" && (
          <>
            <select value={month} onChange={(e) => setMonth(Number(e.target.value))} style={selectSmall}>
              {Array.from({ length: 12 }, (_, i) => {
                const date = new Date(2024, i, 1);
                let name = date.toLocaleString(lang, { month: "long" });
                name = name.charAt(0).toUpperCase() + name.slice(1);
                return <option key={i} value={i}>{name}</option>;
              })}
            </select>
            <select value={year} onChange={(e) => setYear(Number(e.target.value))} style={selectSmall}>
              {years.map((y) => (<option key={y}>{y}</option>))}
            </select>
          </>
        )}
        {mode === "year" && (
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} style={selectSmall}>
            {years.map((y) => (<option key={y}>{y}</option>))}
          </select>
        )}
        {mode === "range" && (
          <>
            <input type="date" value={rangeFrom} onChange={(e) => setRangeFrom(e.target.value)} style={selectSmall} />
            <input type="date" value={rangeTo} onChange={(e) => setRangeTo(e.target.value)} style={selectSmall} />
          </>
        )}
      </div>

      <button onClick={exportPDF} style={bigPdfBtn}>
        <span style={{ marginRight: 8 }}>📄</span> {t("finance_export_pdf")}
      </button>

      {/* Сводка */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px,1fr))", gap: 16, margin: "24px 0" }}>
        <div className="card">
          <div style={{ fontWeight: 600, color: "#94a3b8" }}>{t("finance_system")}</div>
          <div style={{ fontSize: 20, fontWeight: 600 }}>€{systemTotal.toFixed(2)}</div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>{t("finance_system_desc")}</div>
        </div>
        <div className="card">
          <div style={{ fontWeight: 600, color: "#94a3b8" }}>{t("finance_manual")}</div>
          <div style={{ fontSize: 20, fontWeight: 600 }}>€{manualTotal.toFixed(2)}</div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>{t("finance_manual_desc")}</div>
        </div>
        <div className="card">
          <div style={{ fontWeight: 600, color: "#94a3b8" }}>{t("finance_expenses")}</div>
          <div style={{ fontSize: 20, fontWeight: 600 }}>€{totalExpenses.toFixed(2)}</div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>{t("finance_expenses_desc")}</div>
        </div>
        <div className="card">
          <div style={{ fontWeight: 600, color: "#94a3b8" }}>{t("finance_balance")}</div>
          <div style={{ fontSize: 20, fontWeight: 600, color: balance >= 0 ? "#86efac" : "#f87171" }}>
            €{balance.toFixed(2)}
          </div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>{t("finance_balance_desc")}</div>
        </div>
      </div>

      {/* Ручной ввод */}
      <div style={{ marginTop: 32 }}>
        <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 6 }}>{t("finance_add_manual")}</div>
        <div style={{ fontSize: 13, opacity: 0.7, marginBottom: 12 }}>{t("finance_add_example")}</div>

        <div style={{ display: "grid", gridTemplateColumns: "140px 220px 100px 1fr 110px", gap: 8, alignItems: "end" }}>
          <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} style={inputStyle} />
          <div style={{ display: "flex", gap: 4 }}>
            <input type="time" value={formTimeFrom} onChange={(e) => setFormTimeFrom(e.target.value)} style={inputStyle} />
            <span style={{ alignSelf: "center", opacity: 0.6 }}>–</span>
            <input type="time" value={formTimeTo} onChange={(e) => setFormTimeTo(e.target.value)} style={inputStyle} />
          </div>
          <input type="number" placeholder={t("finance_amount_placeholder")} value={formAmount} onChange={(e) => setFormAmount(e.target.value)} style={inputStyle} />
          <input type="text" placeholder={t("finance_description_placeholder")} value={formDesc} onChange={(e) => setFormDesc(e.target.value)} style={inputStyle} />
          <button onClick={addManual} style={addBtnStyle}>{t("finance_add_button")}</button>
        </div>
      </div>

      {/* История */}
      <div style={{ marginTop: 32 }}>
        <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 6 }}>{t("finance_history")}</div>
        <div style={{ fontSize: 13, opacity: 0.7, marginBottom: 12 }}>{t("finance_history_desc")}</div>

        {combinedItems.length === 0 && (
          <div style={{ textAlign: "center", padding: "30px", opacity: 0.6, border: "1px dashed rgba(100,100,100,0.3)", borderRadius: 16 }}>
            {t("finance_no_records")}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {combinedItems.map((item) => (
            <div key={item.id} style={rowStyle}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, flexWrap: "wrap", minWidth: 0 }}>
                <span style={datePill}>{item.dateDisplay}</span>
                <span style={timePill}>{item.timeDisplay}</span>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {renderTagPills(item.tags, serviceStyles)}
                  {(item.type === "manual" || item.tags.length === 0) && (
                    <span style={descPill}>{item.description}</span>
                  )}
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {item.type === "system" && <span style={idPill}>#{item.shortId}</span>}
                <span style={amountPill}>€{item.amount.toFixed(2)}</span>

                {item.type === "system" && onDownloadReceipt && (
                  <button onClick={() => onDownloadReceipt(item.booking)} style={iconBtn}>🧾</button>
                )}
                {item.type === "manual" && (
                  <button onClick={() => editManual(item)} style={iconBtnPurple}>✎</button>
                )}
                <button onClick={() => deleteItem(item)} style={iconBtnRed}>✕</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ====================== СТИЛИ ======================
const activeBtnStyle = {
  padding: "8px 16px",
  borderRadius: 12,
  background: "rgba(139,92,246,0.35)",
  border: "1.5px solid rgba(168,85,247,0.9)",
  color: "#fff",
  fontWeight: 600,
};

const btnStyle = {
  padding: "8px 16px",
  borderRadius: 12,
  background: "rgba(30,30,50,0.6)",
  border: "1px solid rgba(100,100,100,0.4)",
  color: "#ccc",
};

const selectSmall = {
  padding: "8px 12px",
  borderRadius: 12,
  background: "rgba(15,23,42,0.95)",
  border: "1px solid rgba(148,163,184,0.5)",
  color: "#e5e7eb",
};

const bigPdfBtn = {
  width: "100%",
  padding: "12px 0",
  marginBottom: 20,
  borderRadius: 16,
  background: "linear-gradient(90deg, rgba(79,70,229,0.9), rgba(124,58,237,0.9))",
  border: "1px solid rgba(129,140,248,0.8)",
  color: "#fff",
  fontSize: 15,
  fontWeight: 600,
  cursor: "pointer",
  boxShadow: "0 8px 30px rgba(79,70,229,0.4)",
};

const inputStyle = {
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(100,100,100,0.5)",
  background: "rgba(15,23,42,0.95)",
  color: "#e5e7eb",
  fontSize: 13,
};

const addBtnStyle = {
  padding: "10px 16px",
  borderRadius: 12,
  background: "linear-gradient(135deg, rgba(88,28,135,0.9), rgba(124,58,237,0.9))",
  border: "1px solid rgba(139,92,246,0.8)",
  color: "#fff",
  fontWeight: 600,
};

const rowStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "10px 14px",
  borderRadius: 16,
  background: "rgba(20,15,35,0.95)",
  border: "1px solid rgba(139,92,246,0.5)",
  gap: 12,
  flexWrap: "wrap",
};

const datePill = {
  padding: "6px 12px",
  borderRadius: 12,
  background: "rgba(15,23,42,0.95)",
  border: "1px solid rgba(129,140,248,0.9)",
  fontWeight: 600,
  fontSize: 13,
};

const timePill = {
  padding: "6px 10px",
  borderRadius: 12,
  background: "rgba(15,23,42,0.95)",
  border: "1px solid rgba(99,102,241,0.7)",
  fontSize: 12,
};

const descPill = {
  padding: "6px 12px",
  borderRadius: 12,
  background: "rgba(190,24,93,0.25)",
  border: "1px solid rgba(244,114,182,0.8)",
  fontSize: 12,
};

const idPill = {
  padding: "6px 10px",
  borderRadius: 10,
  background: "rgba(15,23,42,0.95)",
  border: "1px solid rgba(148,163,184,0.9)",
  fontSize: 11,
  opacity: 0.8,
};

const amountPill = {
  padding: "6px 10px",
  borderRadius: 10,
  background: "rgba(22,163,74,0.25)",
  border: "1px solid rgba(34,197,94,0.9)",
  fontWeight: 600,
  fontSize: 14,
};

const iconBtn = {
  width: 32,
  height: 32,
  borderRadius: 10,
  background: "rgba(15,23,42,0.95)",
  border: "1px solid rgba(148,163,184,0.8)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
};

const iconBtnPurple = { ...iconBtn, border: "1px solid rgba(139,92,246,0.9)" };
const iconBtnRed = { ...iconBtn, border: "1px solid rgba(248,113,113,0.9)", background: "rgba(127,29,29,0.7)" };

// оставляем твою функцию renderTagPills без изменений
function renderTagPills(tags, serviceStyles) {
  if (!tags || !tags.length) return null;
  return tags.map((name) => {
    const style = serviceStyles[name] || {};
    return (
      <span
        key={name}
        style={{
          padding: "6px 12px",
          borderRadius: 12,
          fontSize: 12,
          background: style.bg || "rgba(148,163,184,0.2)",
          border: style.border || "1px solid rgba(148,163,184,0.8)",
          whiteSpace: "nowrap",
        }}
      >
        {name}
      </span>
    );
  });
}
