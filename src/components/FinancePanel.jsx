// src/components/FinancePanel.jsx
import { useState, useMemo, useEffect } from "react";
import { fmtDate, fmtTime } from "../lib/storage";
import { useI18n } from "../lib/i18n";   // ЭТОТ ИМПОРТ БЫЛ ПОТЕРЯН — теперь всё работает!

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

const MONTHS = [
  "Sausis", "Vasaris", "Kovas", "Balandis", "Gegužė", "Birželis",
  "Liepa", "Rugpjūtis", "Rugsėjis", "Spalis", "Lapkritis", "Gruodis"
];

export default function FinancePanel({
  bookings = [],
  serviceStyles = {},
  onDownloadReceipt,
  settings = {},
}) {
  const { t } = useI18n();
  const now = new Date();

  // режим периода
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
    } catch { return 30; }
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
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => localStorage.setItem(MANUAL_KEY, JSON.stringify(manualEntries)), [manualEntries]);
  useEffect(() => localStorage.setItem(EXCLUDE_KEY, JSON.stringify(excludedIds)), [excludedIds]);
  useEffect(() => {
    if (percent !== "" && percent !== null)
      localStorage.setItem(PERCENT_KEY, String(percent));
  }, [percent]);

  // диапазон
  const [rangeStart, rangeEnd, rangeLabel] = useMemo(() => {
    let start, end, label;
    if (mode === "month") {
      start = new Date(year, month, 1);
      end = new Date(year, month + 1, 1);
      label = `${MONTHS[month]} ${year}`;
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
  }, [mode, year, month, rangeFrom, rangeTo]);

  const isInRange = (d) => d >= rangeStart && d < rangeEnd;

  // системные записи
  const systemItems = useMemo(() => bookings
    .filter(b => isPaid(b) && !isCanceled(b) && isInRange(new Date(b.end || b.start)) && !excludedIds.includes(b.id))
    .map(b => ({
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
    })), [bookings, excludedIds, rangeStart, rangeEnd, t]);

  const systemTotal = systemItems.reduce((s, i) => s + i.amount, 0);

  // ручные записи
  const manualItems = useMemo(() => manualEntries
    .map(e => ({
      id: "man-" + e.id,
      manualId: e.id,
      type: "manual",
      date: e.date,
      dateDisplay: fmtDate(e.date),
      timeDisplay: e.time || "—",
      amount: Number(e.amount) || 0,
      description: e.description || t("finance_manual_entry"),
    }))
    .filter(e => isInRange(new Date(e.date))), [manualEntries, rangeStart, rangeEnd, t]);

  const manualTotal = manualItems.reduce((s, i) => s + i.amount, 0);
  const totalIncome = systemTotal + manualTotal;
  const totalExpenses = totalIncome * (percent / 100);
  const balance = totalIncome - totalExpenses;

  const combinedItems = useMemo(() => [...systemItems, ...manualItems]
    .map(i => ({ ...i, expense: i.amount * (percent / 100) }))
    .sort((a, b) => a.date.localeCompare(b.date) || a.timeDisplay.localeCompare(b.timeDisplay)),
    [systemItems, manualItems, percent]);

  // добавление ручной записи
  const addManual = () => {
    const amount = Number(formAmount);
    if (!formDate || !amount || amount <= 0) return;
    const time = formTimeFrom && formTimeTo ? `${formTimeFrom} – ${formTimeTo}` : "";
    const entry = { id: Date.now(), date: formDate, amount, description: formDesc || t("finance_manual_entry"), time };
    setManualEntries(p => [entry, ...p]);
    setFormAmount(""); setFormDesc(""); setFormTimeFrom(""); setFormTimeTo("");
  };

  const deleteItem = (item) => {
    if (!window.confirm(t("finance_delete_confirm"))) return;
    if (item.type === "system") {
      setExcludedIds(p => p.includes(item.bookingId) ? p : [...p, item.bookingId]);
    } else {
      setManualEntries(p => p.filter(e => e.id !== item.manualId));
    }
  };

  const editManual = (item) => {
    if (item.type !== "manual") return;
    const e = manualEntries.find(x => x.id === item.manualId);
    if (!e) return;
    const desc = window.prompt(t("finance_edit_desc"), e.description || "");
    if (desc === null) return;
    const amt = window.prompt(t("finance_edit_amount"), String(e.amount));
    if (amt === null) return;
    const amount = Number(amt);
    if (!amount || amount <= 0) return;
    const time = window.prompt(t("finance_edit_time"), e.time || "");
    if (time === null) return;
    setManualEntries(p => p.map(x => x.id === e.id ? { ...x, description: desc, amount, time } : x));
  };

  const callReceipt = (item) => {
    if (item.booking && onDownloadReceipt) onDownloadReceipt(item.booking);
  };

  // PDF-экспорт (полностью рабочий, как на твоём скрине)
  const exportPDF = () => {
    const win = window.open("", "_blank");
    win.document.write(`
      <!DOCTYPE html>
      <html><head><meta charset="utf-8"><title>Finansų ataskaita</title>
      <style>
        body{font-family:system-ui;margin:0;padding:30px;background:#0f172a;color:#e5e7eb;}
        .wrapper{max-width:900px;margin:0 auto;background:#1e293b;border-radius:16px;padding:24px;box-shadow:0 20px 50px rgba(0,0,0,0.6);}
        .header{background:linear-gradient(135deg,#4c1d95,#7c3aed);padding:20px;border-radius:12px;margin-bottom:20px;text-align:center;color:white;}
        h1{margin:0;font-size:24px;}
        .summary{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin:20px 0;}
        .card{background:rgba(255,255,255,0.1);padding:12px;border-radius:12px;text-align:center;}
        table{width:100%;border-collapse:collapse;margin-top:20px;}
        th,td{border:1px solid #4c1d95;padding:8px;text-align:left;}
        th{background:#4c1d95;color:white;}
        @media print{body{background:white;color:black;} .wrapper{box-shadow:none;}}
      </style>
      </head><body>
      <div class="wrapper">
        <div class="header"><h1>Finansų ataskaita – ${rangeLabel}</h1></div>
        <div class="summary">
          <div class="card"><div>Sistema</div><b>€${systemTotal.toFixed(2)}</b></div>
          <div class="card"><div>Rankiniai</div><b>€${manualTotal.toFixed(2)}</b></div>
          <div class="card"><div>Išlaidos (${percent}%)</div><b>€${totalExpenses.toFixed(2)}</b></div>
          <div class="card"><div>Balansas</div><b>€${balance.toFixed(2)}</b></div>
        </div>
        <table>
          <thead><tr><th>Data</th><th>Laikas</th><th>Aprašymas</th><th>Suma</th></tr></thead>
          <tbody>
            ${combinedItems.map(i => `<tr><td>${i.dateDisplay}</td><td>${i.timeDisplay}</td><td>${i.description}</td><td>€${i.amount.toFixed(2)}</td></tr>`).join("")}
          </tbody>
        </table>
      </div>
      <script>window.print();</script>
      </body></html>
    `);
    win.document.close();
  };

  return (
    <div style={{ padding: "20px 16px", display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Кнопка PDF */}
      <button onClick={exportPDF} style={{
        width: "100%", padding: "12px 0", borderRadius: 16,
        background: "linear-gradient(90deg, #4338ca, #7c3aed)",
        color: "white", fontWeight: 600, fontSize: 14, border: "none", cursor: "pointer"
      }}>
        Eksportuoti PDF
      </button>

      {/* Сводка */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
        <div className="summary-card"><div className="title">Sistema</div><div className="value">€{systemTotal.toFixed(2)}</div></div>
        <div className="summary-card"><div className="title">Rankiniai</div><div className="value">€{manualTotal.toFixed(2)}</div></div>
        <div className="summary-card"><div className="title">Išlaidos ({percent}%)</div><div className="value">€{totalExpenses.toFixed(2)}</div></div>
        <div className="summary-card"><div className="title">Balansas</div><div className="value">€{balance.toFixed(2)}</div></div>
      </div>

      {/* Форма добавления */}
      <div style={{ display: "grid", gridTemplateColumns: "130px 160px 100px 1fr 110px", gap: 8, alignItems: "center" }}>
        <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} style={fieldStyle} />
        <div style={{ display: "flex", gap: 4 }}>
          <input type="time" value={formTimeFrom} onChange={e => setFormTimeFrom(e.target.value)} style={timeStyle} />
          <span>–</span>
          <input type="time" value={formTimeTo} onChange={e => setFormTimeTo(e.target.value)} style={timeStyle} />
        </div>
        <input type="number" placeholder="Suma (€)" value={formAmount} onChange={e => setFormAmount(e.target.value)} style={fieldStyle} />
        <input type="text" placeholder="Paslaugos / aprašymas" value={formDesc} onChange={e => setFormDesc(e.target.value)} style={fieldStyle} />
        <button onClick={addManual} style={addButtonStyle}>Pridėti</button>
      </div>

      {/* История */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {combinedItems.map(item => (
          <div key={item.id} style={rowStyle}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, flexWrap: "wrap" }}>
              <span style={pillDate}>{item.dateDisplay}</span>
              <span style={pillTime}>{item.timeDisplay}</span>
              {item.type === "system" ? renderTagPills(item.tags, serviceStyles) : <span style={pillManual}>{item.description}</span>}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {item.type === "system" && <span style={pillId}>#{item.shortId}</span>}
              <span style={pillAmount}>€{item.amount.toFixed(2)}</span>
              {item.type === "system" && <button onClick={() => callReceipt(item)} style={iconBtn}>Kvitas</button>}
              {item.type === "manual" && <button onClick={() => editManual(item)} style={iconBtnPurple}>Redaguoti</button>}
              <button onClick={() => deleteItem(item)} style={iconBtnRed}>Ištrinti</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* Стили (как на твоих скринах) */
const fieldStyle = { padding: "8px 10px", borderRadius: 12, border: "1px solid rgba(71,85,105,0.6)", background: "rgba(15,23,42,0.95)", color: "#e5e7eb", fontSize: 13 };
const timeStyle = { ...fieldStyle, flex: 1 };
const addButtonStyle = { padding: "8px 16px", borderRadius: 14, background: "linear-gradient(135deg,#a855f7,#ec4899)", color: "#fff", border: "none", fontWeight: 600, cursor: "pointer" };
const rowStyle = { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", borderRadius: 18, background: "rgba(15,10,25,0.96)", border: "1px solid rgba(139,92,246,0.7)", gap: 12, flexWrap: "wrap" };
const pillDate = { padding: "6px 12px", borderRadius: 999, background: "rgba(59,130,246,0.2)", border: "1px solid rgba(59,130,246,0.6)", fontSize: 12, fontWeight: 600 };
const pillTime = { padding: "6px 12px", borderRadius: 999, background: "rgba(99,102,241,0.2)", border: "1px solid rgba(99,102,241,0.6)", fontSize: 12 };
const pillManual = { padding: "6px 14px", borderRadius: 999, background: "rgba(190,24,93,0.25)", border: "1px solid rgba(244,114,182,0.8)", fontSize: 12 };
const pillId = { padding: "6px 10px", borderRadius: 999, background: "rgba(148,163,184,0.2)", border: "1px solid rgba(148,163,184,0.8)", fontSize: 11 };
const pillAmount = { padding: "6px 12px", borderRadius: 999, background: "rgba(34,197,94,0.2)", border: "1px solid rgba(34,197,94,0.9)", fontWeight: 600, fontSize: 13 };
const iconBtn = { width: 36, height: 36, borderRadius: 12, background: "rgba(15,23,42,0.95)", border: "1px solid rgba(148,163,184,0.85)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" };
const iconBtnPurple = { ...iconBtn, border: "1px solid rgba(196,181,253,0.9)" };
const iconBtnRed = { ...iconBtn, border: "1px solid #fca5a5", background: "rgba(127,29,29,0.7)" };

function renderTagPills(tags, serviceStyles) {
  if (!tags?.length) return null;
  return tags.map(name => {
    const s = serviceStyles[name] || {};
    return <span key={name} style={{ padding: "6px 12px", borderRadius: 999, background: s.bg || "rgba(148,163,184,0.18)", border: s.border || "1px solid rgba(148,163,184,0.85)", fontSize: 11 }}>{name}</span>;
  });
}
