// src/components/FinancePanel.jsx
import { useState, useMemo, useEffect } from "react";
import { fmtDate, fmtTime } from "../lib/storage";
import { useI18n } from "../lib/i18n";

const isPaid = (b) => !!(b?.paid || b?.status === "approved_paid");
const isCanceled = (b) =>
  b?.status === "canceled_client" || b?.status === "canceled_admin";

const MANUAL_KEY = "iz.finance.manual.v1";
const EXCLUDE_KEY = "iz.finance.exclude.v1";
const PERCENT_KEY = "iz.finance.expensePercent.v1";

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
  settings = {},
}) {
  const { t } = useI18n();
  const now = new Date();

  const [mode, setMode] = useState("month");
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [rangeFrom, setRangeFrom] = useState(
    new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  );
  const [rangeTo, setRangeTo] = useState(now.toISOString().slice(0, 10));

  const [manualEntries, setManualEntries] = useState([]);
  const [excludedIds, setExcludedIds] = useState([]);

  const [percent, setPercent] = useState(() => {
    try {
      const raw = localStorage.getItem(PERCENT_KEY);
      if (!raw) return 30;
      const n = Number(raw);
      return !isNaN(n) && n >= 0 && n <= 100 ? n : 30;
    } catch {
      return 30;
    }
  });

  const [formDate, setFormDate] = useState(formatDateISO(now));
  const [formTimeFrom, setFormTimeFrom] = useState("");
  const [formTimeTo, setFormTimeTo] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formDesc, setFormDesc] = useState("");

  // === localStorage ===
  useEffect(() => {
    try {
      const m = localStorage.getItem(MANUAL_KEY);
      if (m) setManualEntries(JSON.parse(m) || []);
      const e = localStorage.getItem(EXCLUDE_KEY);
      if (e) setExcludedIds(JSON.parse(e) || []);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => localStorage.setItem(MANUAL_KEY, JSON.stringify(manualEntries)), [manualEntries]);
  useEffect(() => localStorage.setItem(EXCLUDE_KEY, JSON.stringify(excludedIds)), [excludedIds]);
  useEffect(() => {
    if (percent !== "" && percent !== null)
      localStorage.setItem(PERCENT_KEY, String(percent));
  }, [percent]);

  // === диапазон ===
  const [rangeStart, rangeEnd, rangeLabel] = useMemo(() => {
    let start, end, label;
    if (mode === "month") {
      start = new Date(year, month, 1);
      end = new Date(year, month + 1, 1);
      label = `${t(`month_${month}`)} ${year}`;
    } else if (mode === "year") {
      start = new Date(year, 0, 1);
      end = new Date(year + 1, 0, 1);
      label = `${year} ${t("finance_mode_year")}`;
    } else {
      start = rangeFrom ? new Date(rangeFrom) : new Date(year, month, 1);
      end = rangeTo ? new Date(rangeTo) : now;
      end = new Date(end.getFullYear(), end.getMonth(), end.getDate() + 1);
      label = `${t("finance_mode_range")}: ${rangeFrom || "…"} – ${rangeTo || "…"}`;
    }
    return [start, end, label];
  }, [mode, year, month, rangeFrom, rangeTo, t]);

  const isInRange = (d) => d >= rangeStart && d < rangeEnd;

  // === системные записи ===
  const systemItems = useMemo(() => {
    return bookings
      .filter((b) => isPaid(b) && !isCanceled(b) && isInRange(new Date(b.end || b.start)) && !excludedIds.includes(b.id))
      .map((b) => ({
        id: "sys-" + b.id,
        type: "system",
        bookingId: b.id,
        booking: b,
        date: new Date(b.end || b.start).toISOString().slice(0, 10),
        dateDisplay: fmtDate(b.start),
        timeDisplay: `${fmtTime(b.start)} – ${fmtTime(b.end || b.start)}`,
        amount: Number(b.price) || 0,
        tags: Array.isArray(b.services) ? b.services : [],
        description: Array.isArray(b.services) ? b.services.join(", ") : t("finance_system_entry"),
        shortId: b.id.slice(0, 6),
      }));
  }, [bookings, excludedIds, rangeStart, rangeEnd, t]);

  const systemTotal = systemItems.reduce((s, i) => s + i.amount, 0);

  // === ручные записи ===
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
        description: e.description || t("finance_manual_entry"),
        tags: ["rankinis"],
      }))
      .filter((e) => isInRange(new Date(e.date)));
  }, [manualEntries, rangeStart, rangeEnd, t]);

  const manualTotal = manualItems.reduce((s, i) => s + i.amount, 0);
  const totalIncome = systemTotal + manualTotal;
  const totalExpenses = totalIncome * (percent / 100);
  const balance = totalIncome - totalExpenses;

  const combinedItems = useMemo(() => {
    return [...systemItems, ...manualItems]
      .map((i) => ({ ...i, expense: i.amount * (percent / 100) }))
      .sort((a, b) => a.date.localeCompare(b.date) || a.timeDisplay.localeCompare(b.timeDisplay));
  }, [systemItems, manualItems, percent]);

  const addManual = () => {
    const amount = Number(formAmount);
    if (!formDate || !amount || amount <= 0) return;
    const time = formTimeFrom && formTimeTo ? `${formTimeFrom} – ${formTimeTo}` : "";
    const entry = {
      id: Date.now(),
      date: formDate,
      amount,
      description: formDesc || t("finance_manual_entry"),
      time,
    };
    setManualEntries((p) => [entry, ...p]);
    setFormAmount("");
    setFormDesc("");
    setFormTimeFrom("");
    setFormTimeTo("");
  };

  const deleteItem = (item) => {
    if (!window.confirm(t("finance_delete_confirm"))) return;
    if (item.type === "system") {
      setExcludedIds((p) => (p.includes(item.bookingId) ? p : [...p, item.bookingId]));
    } else {
      setManualEntries((p) => p.filter((e) => e.id !== item.manualId));
    }
  };

  const editManual = (item) => {
    if (item.type !== "manual") return;
    const e = manualEntries.find((x) => x.id === item.manualId);
    if (!e) return;
    const desc = window.prompt(t("finance_edit_desc"), e.description || "");
    if (desc === null) return;
    const amt = window.prompt(t("finance_edit_amount"), String(e.amount));
    if (amt === null) return;
    const amount = Number(amt);
    if (!amount || amount <= 0) return;
    const time = window.prompt(t("finance_edit_time"), e.time || "");
    if (time === null) return;
    setManualEntries((p) =>
      p.map((x) => (x.id === e.id ? { ...x, description: desc, amount, time } : x))
    );
  };

  const callReceipt = (item) => {
    if (item.booking && onDownloadReceipt) onDownloadReceipt(item.booking);
  };

  // === PDF экспорт ===
  const exportPDF = () => {
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${t("finance_report_title")}</title>
        <style>
          body{font-family:system-ui;margin:0;padding:30px;background:#0b1120;color:#e5e7eb;}
          .shell{max-width:900px;margin:0 auto;background:#1e293b;border-radius:16px;padding:30px;box-shadow:0 20px 60px rgba(0,0,0,0.7);}
          .header{background:linear-gradient(135deg,#4c1d95,#7c3aed);padding:20px;border-radius:12px;text-align:center;color:white;margin-bottom:20px;}
          h1{margin:0;font-size:24px;}
          .summary{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;margin:20px 0;}
          .card{background:rgba(255,255,255,0.1);padding:14px;border-radius:12px;text-align:center;}
          table{width:100%;border-collapse:collapse;margin-top:20px;font-size:13px;}
          th,td{border:1px solid #6b7280;padding:8px;text-align:left;}
          th{background:#4c1d95;color:white;}
          @media print{body{background:white;color:black;padding:0;} .shell{box-shadow:none;}}
        </style>
      </head>
      <body>
        <div class="shell">
          <div class="header"><h1>${t("finance_report_title")} – ${rangeLabel}</h1></div>
          <div class="summary">
            <div class="card"><div>${t("finance_system")}</div><b>€${systemTotal.toFixed(2)}</b></div>
            <div class="card"><div>${t("finance_manual")}</div><b>€${manualTotal.toFixed(2)}</b></div>
            <div class="card"><div>${t("finance_expenses")} (${percent}%)</div><b>€${totalExpenses.toFixed(2)}</b></div>
            <div class="card"><div>${t("finance_balance")}</div><b>€${balance.toFixed(2)}</b></div>
          </div>
          <table>
            <thead><tr><th>${t("date")}</th><th>${t("time")}</th><th>${t("description")}</th><th>${t("amount")}</th></tr></thead>
            <tbody>
              ${combinedItems.map(i => 
                `<tr><td>${i.dateDisplay}</td><td>${i.timeDisplay}</td><td>${i.description}</td><td>€${i.amount.toFixed(2)}</td></tr>`
              ).join("")}
            </tbody>
          </table>
        </div>
        <script>window.print();</script>
      </body>
      </html>
    `);
    win.document.close();
  };

  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

  return (
    <div style={wrapStyle}>
      {/* Заголовок + период + PDF */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 600 }}>{t("finance_title")}</div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>{t("finance_subtitle")}</div>
            <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>
              {t("period")}: <b>{rangeLabel}</b>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
            <div style={{ display: "flex", gap: 6, background: "rgba(17,0,40,0.6)", borderRadius: 999, padding: 4, border: "1px solid rgba(168,85,247,0.4)" }}>
              {["month", "year", "range"].map((m) => (
                <button key={m} onClick={() => setMode(m)} style={{
                  ...pillBase,
                  padding: "5px 12px",
                  borderRadius: 999,
                  border: mode === m ? "1px solid #f3f4f6" : "1px solid transparent",
                  background: mode === m ? "#f8fafc" : "transparent",
                  color: mode === m ? "#0f172a" : "#e5e7eb",
                  fontWeight: mode === m ? 600 : 400,
                }}>
                  {t(`finance_mode_${m}`)}
                </button>
              ))}
            </div>

            {mode === "month" && (
              <div style={{ display: "flex", gap: 6 }}>
                <select value={month} onChange={(e) => setMonth(+e.target.value)} style={selectSmall}>
                  {[0,1,2,3,4,5,6,7,8,9,10,11].map(i => (
                    <option key={i} value={i}>{t(`month_${i}`)}</option>
                  ))}
                </select>
                <select value={year} onChange={(e) => setYear(+e.target.value)} style={selectSmall}>
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            )}
            {mode === "year" && (
              <select value={year} onChange={(e) => setYear(+e.target.value)} style={selectSmall}>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            )}
            {mode === "range" && (
              <div style={{ display: "flex", gap: 6 }}>
                <input type="date" value={rangeFrom} onChange={e => setRangeFrom(e.target.value)} style={selectSmall} />
                <input type="date" value={rangeTo} onChange={e => setRangeTo(e.target.value)} style={selectSmall} />
              </div>
            )}

            <div style={{ fontSize: 11 }}>
              {t("finance_expense_percent")}{" "}
              <input
                type="number"
                value={percent}
                min={0}
                max={100}
                onChange={(e) => setPercent(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                style={{ width: 50, padding: "2px 4px", borderRadius: 6, background: "rgba(15,23,42,0.95)", border: "1px solid #64748b", color: "#e5e7eb" }}
              />%
            </div>
          </div>
        </div>

        <button onClick={exportPDF} style={bigPdfBtn}>
          Export PDF {t("finance_export_pdf")}
        </button>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
          <div style={summaryCard}>{t("finance_system")}<br/><b>€{systemTotal.toFixed(2)}</b></div>
          <div style={summaryCard}>{t("finance_manual")}<br/><b>€{manualTotal.toFixed(2)}</b></div>
          <div style={summaryCard}>{t("finance_expenses")} ({percent}%)<br/><b>€{totalExpenses.toFixed(2)}</b></div>
          <div style={summaryCard}>{t("finance_balance")}<br/><b>€{balance.toFixed(2)}</b></div>
        </div>
      </div>

      {/* Добавление записи */}
      <div style={{ marginTop: 20 }}>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>{t("finance_add_manual")}</div>
        <div style={{ display: "grid", gridTemplateColumns: "140px 180px 100px 1fr 100px", gap: 8, alignItems: "center" }}>
          <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} style={manualField} />
          <div style={{ display: "flex", gap: 4 }}>
            <input type="time" value={formTimeFrom} onChange={e => setFormTimeFrom(e.target.value)} style={{ ...manualField, flex: 1 }} />
            <span>–</span>
            <input type="time" value={formTimeTo} onChange={e => setFormTimeTo(e.target.value)} style={{ ...manualField, flex: 1 }} />
          </div>
          <input type="number" placeholder={t("finance_amount_placeholder")} value={formAmount} onChange={e => setFormAmount(e.target.value)} style={manualField} />
          <input type="text" placeholder={t("finance_desc_placeholder")} value={formDesc} onChange={e => setFormDesc(e.target.value)} style={manualField} />
          <button onClick={addManual} style={manualAddBtn}>{t("add")}</button>
        </div>
      </div>

      {/* История */}
      <div style={{ marginTop: 20 }}>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>{t("finance_history")}</div>
        {combinedItems.length === 0 ? (
          <div style={{ padding: 20, textAlign: "center", opacity: 0.6 }}>{t("finance_no_records")}</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {combinedItems.map((item) => (
              <div key={item.id} style={rowStyle}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, flexWrap: "wrap" }}>
                  <span style={pillDate}>{item.dateDisplay}</span>
                  <span style={pillTime}>{item.timeDisplay}</span>
                  {item.type === "system" ? renderTagPills(item.tags, serviceStyles) : <span style={pillManual}>{item.description}</span>}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {item.type === "system" && <span style={pillId}>#{item.shortId}</span>}
                  <span style={pillAmount}>€{item.amount.toFixed(2)}</span>
                  {item.type === "system" && <button onClick={() => callReceipt(item)} style={iconBtn}>Receipt</button>}
                  {item.type === "manual" && <button onClick={() => editManual(item)} style={iconBtnPurple}>Edit</button>}
                  <button onClick={() => deleteItem(item)} style={iconBtnRed}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* === Стили === */
const wrapStyle = {
  padding: "20px 16px",
  background: "linear-gradient(135deg, #0f0225, #1a0033)",
  minHeight: "100vh",
  color: "#e5e7eb",
};

const pillBase = {
  padding: "4px 10px",
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 500,
};

const pillDate = { ...pillBase, background: "rgba(59,130,246,0.2)", border: "1px solid rgba(59,130,246,0.7)" };
const pillTime = { ...pillBase, background: "rgba(99,102,241,0.2)", border: "1px solid rgba(99,102,241,0.7)" };
const pillManual = { ...pillBase, background: "rgba(190,24,93,0.25)", border: "1px solid rgba(244,114,182,0.8)" };
const pillId = { ...pillBase, background: "rgba(148,163,184,0.2)", border: "1px solid rgba(148,163,184,0.8)" };
const pillAmount = { ...pillBase, background: "rgba(34,197,94,0.2)", border: "1px solid rgba(34,197,94,0.9)", fontWeight: 600 };

const rowStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "10px 12px",
  borderRadius: 18,
  background: "rgba(15,10,25,0.96)",
  border: "1px solid rgba(139,92,246,0.7)",
  boxShadow: "0 0 18px rgba(15,23,42,0.95)",
  gap: 12,
  flexWrap: "wrap",
};

const selectSmall = {
  padding: "6px 10px",
  borderRadius: 10,
  border: "1px solid rgba(148,163,184,0.6)",
  background: "rgba(15,23,42,0.95)",
  color: "#e5e7eb",
  fontSize: 11,
};

const bigPdfBtn = {
  width: "100%",
  borderRadius: 16,
  padding: "12px 0",
  border: "1px solid rgba(129,140,248,0.85)",
  background: "linear-gradient(90deg, rgba(67,56,202,0.95), rgba(124,58,237,0.95))",
  color: "#f9fafb",
  fontWeight: 600,
  fontSize: 14,
  cursor: "pointer",
  boxShadow: "0 10px 36px rgba(55,48,163,0.8)",
};

const manualField = {
  borderRadius: 14,
  border: "1px solid rgba(51,65,85,0.8)",
  background: "rgba(15,23,42,0.95)",
  padding: "6px 10px",
};

const manualAddBtn = {
  borderRadius: 14,
  border: "1px solid rgba(139,92,246,0.8)",
  background: "linear-gradient(135deg, rgba(88,28,135,0.95), rgba(124,58,237,0.95))",
  color: "#f9fafb",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};

const iconBtn = {
  width: 32,
  height: 32,
  borderRadius: 10,
  border: "1px solid rgba(148,163,184,0.85)",
  background: "rgba(15,23,42,0.95)",
  color: "#e5e7eb",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const iconBtnPurple = { ...iconBtn, border: "1px solid rgba(139,92,246,0.85)" };
const iconBtnRed = { ...iconBtn, border: "1px solid #fca5a5", background: "rgba(127,29,29,0.7)" };

const summaryCard = {
  background: "rgba(15,23,42,0.95)",
  padding: "12px",
  borderRadius: 14,
  border: "1px solid rgba(139,92,246,0.4)",
  textAlign: "center",
  fontSize: 13,
};

function renderTagPills(tags, serviceStyles) {
  if (!tags?.length) return null;
  return tags.map((name) => {
    const s = serviceStyles[name] || {};
    return (
      <span key={name} style={{
        padding: "4px 12px",
        borderRadius: 999,
        fontSize: 11,
        background: s.bg || "rgba(148,163,184,0.18)",
        border: s.border || "1px solid rgba(148,163,184,0.85)",
        whiteSpace: "nowrap",
      }}>
        {name}
      </span>
    );
  });
}
