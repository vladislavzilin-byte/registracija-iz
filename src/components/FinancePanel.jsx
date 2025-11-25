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

  // localStorage
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
    if (percent !== "" && percent !== null) localStorage.setItem(PERCENT_KEY, String(percent));
  }, [percent]);

  // диапазон
  const [rangeStart, rangeEnd, rangeLabel] = useMemo(() => {
    let start, end, label;
    if (mode === "month") {
      start = new Date(year, month, 1);
      end = new Date(year, month + 1, 1);
      label = `${t(`month_${month}`)} ${year}`;
    } else if (mode === "year") {
      start = new Date(year, 0, 1);
      end = new Date(year + 1, 0, 1);
      label = year;
    } else {
      start = rangeFrom ? new Date(rangeFrom) : new Date(year, month, 1);
      end = new Date((rangeTo || now).toString() + "T23:59:59");
      end.setDate(end.getDate() + 1);
      label = `${rangeFrom || "..."} – ${rangeTo || "..."}`;
    }
    return [start, end, label];
  }, [mode, year, month, rangeFrom, rangeTo, t]);

  const isInRange = (d) => d >= rangeStart && d < rangeEnd;

  const systemItems = useMemo(() => {
    return bookings
      .filter((b) => {
        if (isCanceled(b) || !isPaid(b)) return false;
        const end = new Date(b.end || b.start);
        if (!isInRange(end)) return false;
        if (excludedIds.includes(b.id)) return false;
        return true;
      })
      .map((b) => ({
        id: "sys-" + b.id,
        type: "system",
        bookingId: b.id,
        booking: b,
        date: (new Date(b.end || b.start)).toISOString().slice(0, 10),
        dateDisplay: fmtDate(b.start),
        timeDisplay: `${fmtTime(b.start)} – ${fmtTime(b.end || b.start)}`,
        amount: Number(b.price) || 0,
        tags: Array.isArray(b.services) ? b.services : [],
        description: Array.isArray(b.services) ? b.services.join(", ") : t("finance_system_entry"),
        shortId: b.id.slice(0, 6),
      }));
  }, [bookings, excludedIds, rangeStart, rangeEnd, t]);

  const systemTotal = systemItems.reduce((s, i) => s + i.amount, 0);

  const manualItems = useMemo(
    () =>
      manualEntries
        .map((e) => ({
          id: "man-" + e.id,
          manualId: e.id,
          type: "manual",
          date: e.date,
          dateDisplay: fmtDate(e.date),
          timeDisplay: e.time || "—",
          amount: Number(e.amount) || 0,
          description: e.description || t("finance_manual_entry"),
        }))
        .filter((e) => isInRange(new Date(e.date))),
    [manualEntries, rangeStart, rangeEnd, t]
  );

  const manualTotal = manualItems.reduce((s, i) => s + i.amount, 0);
  const totalIncome = systemTotal + manualTotal;
  const totalExpenses = totalIncome * (percent / 100);
  const balance = totalIncome - totalExpenses;

  const combinedItems = useMemo(() => {
    return [...systemItems, ...manualItems].sort(
      (a, b) => a.date.localeCompare(b.date) || a.timeDisplay.localeCompare(b.timeDisplay)
    );
  }, [systemItems, manualItems]);

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

  return (
    <div style={{ padding: "20px 16px", display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Сводка */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
        <div className="summary-card">
          <div className="title">{t("finance_system")}</div>
          <div className="value">€{systemTotal.toFixed(2)}</div>
          <div className="subtitle">Užbaigtos ir apmokėtos rezervacijos</div>
        </div>
        <div className="summary-card">
          <div className="title">{t("finance_manual")}</div>
          <div className="value">€{manualTotal.toFixed(2)}</div>
          <div className="subtitle">Papildomi rankiniai įrašai</div>
        </div>
        <div className="summary-card">
          <div className="title">{t("finance_expenses")} ({percent}%)</div>
          <div className="value">€{totalExpenses.toFixed(2)}</div>
        </div>
        <div className="summary-card">
          <div className="title">{t("finance_balance")}</div>
          <div className="value">€{balance.toFixed(2)}</div>
        </div>
      </div>

      {/* Форма добавления */}
      <div>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>{t("finance_add_manual")}</div>
        <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 12 }}>
          Pvz. grynais ar papildomos paslaugos.
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "130px 160px 100px 1fr 110px", gap: 8, alignItems: "center" }}>
          <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} style={fieldStyle} />

          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <input type="time" value={formTimeFrom} onChange={(e) => setFormTimeFrom(e.target.value)} style={timeStyle} />
            <span style={{ opacity: 0.6 }}>–</span>
            <input type="time" value={formTimeTo} onChange={(e) => setFormTimeTo(e.target.value)} style={timeStyle} />
          </div>

          <input
            type="number"
            placeholder="Suma (€)"
            value={formAmount}
            onChange={(e) => setFormAmount(e.target.value)}
            style={fieldStyle}
          />

          <input
            type="text"
            placeholder="Paslaugos / aprašymas"
            value={formDesc}
            onChange={(e) => setFormDesc(e.target.value)}
            style={fieldStyle}
          />

          <button onClick={addManual} style={addButtonStyle}>
            Pridėti
          </button>
        </div>
      </div>

      {/* История */}
      <div>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>{t("finance_history")}</div>
        <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 12 }}>
          Visi įrašai pagal pasirinktą laikotarpį.
        </div>

        {combinedItems.length === 0 ? (
          <div style={{ textAlign: "center", padding: 32, opacity: 0.6 }}>
            {t("finance_no_records") || "Nėra įrašų"}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {combinedItems.map((item) => (
              <div key={item.id} style={rowStyle}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", flex: 1 }}>
                  <span style={pillDate}>{item.dateDisplay}</span>
                  <span style={pillTime}>{item.timeDisplay}</span>
                  {item.type === "system" ? (
                    renderTagPills(item.tags, serviceStyles)
                  ) : (
                    <span style={pillManual}>{item.description}</span>
                  )}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {item.type === "system" && <span style={pillId}>#{item.shortId}</span>}
                  <span style={pillAmount}>€{item.amount.toFixed(2)}</span>

                  {/* SVG иконки */}
                  {item.type === "system" && (
                    <button onClick={() => callReceipt(item)} style={iconBtn} title="Kvitas">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 12h6M12 9v6M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                        <path d="M12 3v1m0 16v1m8-9h-1M5 12H4m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707M17.657 17.657l.707.707" />
                      </svg>
                    </button>
                  )}

                  {item.type === "manual" && (
                    <button onClick={() => editManual(item)} style={iconBtnPurple} title="Redaguoti">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5l3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                  )}

                  <button onClick={() => deleteItem(item)} style={iconBtnRed} title="Ištrinti">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m-8 0h10l-1 14a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2L7 6z" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ====================== СТИЛИ ====================== */
const fieldStyle = {
  padding: "8px 10px",
  borderRadius: 12,
  border: "1px solid rgba(71, 85, 105, 0.6)",
  background: "rgba(15, 23, 42, 0.95)",
  color: "#e5e7eb",
  fontSize: 13,
};

const timeStyle = { ...fieldStyle, flex: 1 };

const addButtonStyle = {
  padding: "8px 16px",
  borderRadius: 14,
  background: "linear-gradient(135deg, #a855f7, #ec4899)",
  color: "#fff",
  border: "none",
  fontWeight: 600,
  cursor: "pointer",
};

const rowStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "10px 12px",
  borderRadius: 18,
  background: "rgba(15, 10, 25, 0.96)",
  border: "1px solid rgba(139, 92, 246, 0.7)",
  gap: 12,
  flexWrap: "wrap",
};

const pillDate = { padding: "6px 12px", borderRadius: 999, background: "rgba(59, 130, 246, 0.2)", border: "1px solid rgba(59, 130, 246, 0.6)", fontSize: 12, fontWeight: 600 };
const pillTime = { padding: "6px 12px", borderRadius: 999, background: "rgba(99, 102, 241, 0.2)", border: "1px solid rgba(99, 102, 241, 0.6)", fontSize: 12 };
const pillManual = { padding: "6px 14px", borderRadius: 999, background: "rgba(190, 24, 93, 0.25)", border: "1px solid rgba(244, 114, 182, 0.8)", fontSize: 12 };
const pillId = { padding: "6px 10px", borderRadius: 999, background: "rgba(148, 163, 184, 0.2)", border: "1px solid rgba(148, 163, 184, 0.8)", fontSize: 11 };
const pillAmount = { padding: "6px 12px", borderRadius: 999, background: "rgba(34, 197, 94, 0.2)", border: "1px solid rgba(34, 197, 94, 0.9)", fontWeight: 600, fontSize: 13 };

const iconBtn = { width: 36, height: 36, borderRadius: 12, background: "rgba(15, 23, 42, 0.95)", border: "1px solid rgba(148, 163, 184, 0.85)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" };
const iconBtnPurple = { ...iconBtn, border: "1px solid rgba(196, 181, 253, 0.9)" };
const iconBtnRed = { ...iconBtn, border: "1px solid #fca5a5", background: "rgba(127, 29, 29, 0.7)" };

function renderTagPills(tags, serviceStyles) {
  if (!tags?.length) return null;
  return tags.map((name) => {
    const s = serviceStyles[name] || {};
    return (
      <span
        key={name}
        style={{
          padding: "6px 12px",
          borderRadius: 999,
          background: s.bg || "rgba(148, 163, 184, 0.18)",
          border: s.border || "1px solid rgba(148, 163, 184, 0.85)",
          fontSize: 11,
        }}
      >
        {name}
      </span>
    );
  });
}
