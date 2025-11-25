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

  const [mode, setMode] = useState("month"); // month | year | range
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

  // диапазон дат
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
      end = new Date((rangeTo || now).toString() + "T23:59:59");
      end.setDate(end.getDate() + 1);
      label = `${t("finance_mode_range")}: ${rangeFrom || "..."} – ${rangeTo || "..."}`;
    }
    return [start, end, label];
  }, [mode, year, month, rangeFrom, rangeTo, t]);

  const isInRange = (d) => d >= rangeStart && d < rangeEnd;

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

  // ручные записи
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
          tags: ["rankinis"],
        }))
        .filter((e) => isInRange(new Date(e.date))),
    [manualEntries, rangeStart, rangeEnd, t]
  );

  const manualTotal = manualItems.reduce((s, i) => s + i.amount, 0);

  const totalIncome = systemTotal + manualTotal;
  const totalExpenses = totalIncome * (percent / 100);
  const balance = totalIncome - totalExpenses;

  const combinedItems = useMemo(() => {
    const all = [...systemItems, ...manualItems].map((i) => ({
      ...i,
      expense: i.amount * (percent / 100),
    }));
    return all.sort((a, b) => a.date.localeCompare(b.date) || a.timeDisplay.localeCompare(b.timeDisplay));
  }, [systemItems, manualItems, percent]);

  const groupedByDate = useMemo(() => {
    const map = {};
    combinedItems.forEach((i) => {
      if (!map[i.date]) map[i.date] = { date: i.date, dateDisplay: i.dateDisplay, items: [] };
      map[i.date].items.push(i);
    });
    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
  }, [combinedItems]);

  const addManual = () => {
    const amount = Number(formAmount);
    if (!formDate || !amount || amount <= 0) return;
    const time = formTimeFrom && formTimeTo ? `${formTimeFrom} – ${formTimeTo}` : formTimeFrom || formTimeTo || "";
    const entry = { id: Date.now(), date: formDate, amount, description: formDesc || t("finance_manual_entry"), time };
    setManualEntries((p) => [entry, ...p]);
    setFormAmount(""); setFormDesc(""); setFormTimeFrom(""); setFormTimeTo("");
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
    const amtStr = window.prompt(t("finance_edit_amount"), String(e.amount));
    if (amtStr === null) return;
    const amt = Number(amtStr);
    if (!amt || amt <= 0) return;
    const time = window.prompt(t("finance_edit_time"), e.time || "");
    if (time === null) return;
    setManualEntries((p) =>
      p.map((x) => (x.id === e.id ? { ...x, description: desc, amount: amt, time } : x))
    );
  };

  const callReceipt = (item) => {
    if (item.booking && onDownloadReceipt) onDownloadReceipt(item.booking);
  };

  const exportPDF = () => {
    const win = window.open("", "FINANCE_REPORT", "width=960,height=720");
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html>
      <html lang="lt">
      <head>
        <meta charset="utf-8">
        <title>${t("finance_report_title")}</title>
        <style>
          body{font-family:system-ui,sans-serif;margin:0;padding:30px;background:#0b1120;color:#f9fafb;}
          .shell{max-width:900px;margin:auto;background:#f9fafb;color:#0f172a;border-radius:18px;overflow:hidden;box-shadow:0 20px 50px rgba(0,0,0,.6);}
          .header{padding:20px;background:linear-gradient(135deg,#020617,#111827);display:flex;justify-content:space-between;align-items:center;}
          .header img{height:72px;}
          .content{padding:20px;}
          .summary{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:20px 0;}
          .card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:12px;text-align:center;}
          .card-title{font-size:11px;color:#6b7280;text-transform:uppercase;}
          .card-value{font-size:18px;font-weight:700;margin:4px 0;}
          table{width:100%;border-collapse:collapse;margin-top:10px;font-size:13px;}
          th,td{border:1px solid #e5e7eb;padding:8px;text-align:left;}
          th{background:#f3f4f6;}
          @media print{body{background:#fff;padding:0;}.shell{box-shadow:none;}}
        </style>
      </head>
      <body>
        <div class="shell">
          <div class="header">
            <div style="display:flex;align-items:center;gap:16px;">
              <img src="/logo2.svg" alt="Logo">
              <div>
                <div style="font-size:20px;font-weight:700;">${settings.masterName || "IZ HAIR TREND"}</div>
                <div style="font-size:12px;opacity:.8;">${t("finance_report_subtitle")}</div>
              </div>
            </div>
            <div style="text-align:right;font-size:13px;">
              <b>${rangeLabel}</b><br>${t("period")}
            </div>
          </div>
          <div class="content">
            <div class="summary">
              <div class="card"><div class="card-title">${t("finance_system")}</div><div class="card-value">€${systemTotal.toFixed(2)}</div></div>
              <div class="card"><div class="card-title">${t("finance_manual")}</div><div class="card-value">€${manualTotal.toFixed(2)}</div></div>
              <div class="card"><div class="card-title">${t("finance_expenses")} (${percent}%)</div><div class="card-value">€${totalExpenses.toFixed(2)}</div></div>
              <div class="card"><div class="card-title">${t("finance_balance")}</div><div class="card-value">€${balance.toFixed(2)}</div></div>
            </div>
            <h2 style="margin:20px 0 8px;font-size:15px;">${t("finance_history")}</h2>
            <table>
              <thead><tr><th>${t("date")}</th><th>${t("time")}</th><th>${t("description")}</th><th>${t("amount")}</th><th>ID</th></tr></thead>
              <tbody>
                ${groupedByDate.length===0 ? `<tr><td colspan="5" style="text-align:center;color:#9ca3af;">${t("finance_no_records")}</td></tr>` :
                  groupedByDate.map(g=>g.items.map((it,i)=>`
                    <tr>
                      <td>${i===0?g.dateDisplay:""}</td>
                      <td>${it.timeDisplay}</td>
                      <td>${it.description}</td>
                      <td>€${it.amount.toFixed(2)}</td>
                      <td>${it.type==="system"?"#"+it.shortId:""}</td>
                    </tr>`).join("")).join("")}
              </tbody>
            </table>
          </div>
        </div>
        <script>setTimeout(()=>window.print(),600);</script>
      </body></html>
    `);
    win.document.close();
  };

  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Заголовок + период + PDF */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
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
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  style={{
                    padding: "5px 14px",
                    borderRadius: 999,
                    background: mode === m ? "rgba(248,250,252,0.95)" : "transparent",
                    color: mode === m ? "#020617" : "#e5e7eb",
                    border: mode === m ? "1px solid #fff" : "1px solid transparent",
                    fontWeight: mode === m ? 600 : 400,
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  {t(`finance_mode_${m}`)}
                </button>
              ))}
            </div>

            {mode === "month" && (
              <div style={{ display: "flex", gap: 6 }}>
                <select value={month} onChange={(e) => setMonth(+e.target.value)} style={selectSmall}>
                  {[0,1,2,3,4,5,6,7,8,9,10,11].map(i=><option key={i} value={i}>{t(`month_${i}`)}</option>)}
                </select>
                <select value={year} onChange={(e) => setYear(+e.target.value)} style={selectSmall}>
                  {years.map(y=><option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            )}
            {mode === "year" && (
              <select value={year} onChange={(e) => setYear(+e.target.value)} style={selectSmall}>
                {years.map(y=><option key={y} value={y}>{y}</option>)}
              </select>
            )}
            {mode === "range" && (
              <div style={{ display: "flex", gap: 6 }}>
                <input type="date" value={rangeFrom} onChange={(e)=>setRangeFrom(e.target.value)} style={selectSmall} />
                <input type="date" value={rangeTo} onChange={(e)=>setRangeTo(e.target.value)} style={selectSmall} />
              </div>
            )}

            <div style={{ fontSize: 11 }}>
              {t("finance_expense_percent")}{" "}
              <input
                type="number"
                min={0}
                max={100}
                value={percent}
                onChange={(e) => setPercent(Math.max(0, Math.min(100, Number(e.target.value)||0)))}
                style={{ width: 56, padding: "2px 4px", background: "rgba(15,23,42,0.95)", color: "#e5e7eb", borderRadius: 6, border: "1px solid rgba(148,163,184,0.7)" }}
              />%
            </div>
          </div>
        </div>

        <button onClick={exportPDF} style={bigPdfBtn}>
          PDF {t("finance_export_pdf")}
        </button>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, fontSize: 12 }}>
          <div><div style={{ fontWeight: 600 }}>{t("finance_system")}</div><div>€{systemTotal.toFixed(2)}</div></div>
          <div><div style={{ fontWeight: 600 }}>{t("finance_manual")}</div><div>€{manualTotal.toFixed(2)}</div></div>
          <div><div style={{ fontWeight: 600 }}>{t("finance_expenses")} ({percent}%)</div><div>€{totalExpenses.toFixed(2)}</div></div>
          <div><div style={{ fontWeight: 600 }}>{t("finance_balance")}</div><div>€{balance.toFixed(2)}</div></div>
        </div>
      </div>

      {/* Ручной ввод */}
      <div>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{t("finance_add_manual")}</div>
        <div style={{ display: "grid", gridTemplateColumns: "140px 180px 90px 1fr 100px", gap: 8, alignItems: "center" }}>
          <input type="date" value={formDate} onChange={(e)=>setFormDate(e.target.value)} style={inputStyle} />
          <div style={{ display: "flex", gap: 4 }}>
            <input type="time" value={formTimeFrom} onChange={(e)=>setFormTimeFrom(e.target.value)} style={{...inputStyle, flex:1}} />
            <span>–</span>
            <input type="time" value={formTimeTo} onChange={(e)=>setFormTimeTo(e.target.value)} style={{...inputStyle, flex:1}} />
          </div>
          <input type="number" placeholder={t("amount")} value={formAmount} onChange={(e)=>setFormAmount(e.target.value)} style={inputStyle} />
          <input type="text" placeholder={t("description")} value={formDesc} onChange={(e)=>setFormDesc(e.target.value)} style={inputStyle} />
          <button onClick={addManual} style={addBtnStyle}>{t("add")}</button>
        </div>
      </div>

      {/* История */}
      <div>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>{t("finance_history")}</div>
        {combinedItems.length === 0 ? (
          <div style={{ textAlign: "center", padding: 20, opacity: 0.7, background: "rgba(15,23,42,0.8)", borderRadius: 12 }}>
            {t("finance_no_records")}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {combinedItems.map((item) => (
              <div key={item.id} style={rowStyle}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, flexWrap: "wrap" }}>
                  <span style={pill}>{item.dateDisplay}</span>
                  <span style={pill}>{item.timeDisplay}</span>
                  {item.type === "system" ? renderTagPills(item.tags, serviceStyles) : (
                    <span style={{...pill, background:"rgba(190,24,93,0.25)", border:"1px solid rgba(244,114,182,0.8)"}}>
                      {item.description}
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {item.type === "system" && <span style={pill}>#{item.shortId}</span>}
                  <span style={{...pill, background:"rgba(22,163,74,0.25)", border:"1px solid rgba(34,197,94,0.9)", fontWeight:600}}>
                    €{item.amount.toFixed(2)}
                  </span>
                  {item.type === "system" && (
                    <button onClick={() => callReceipt(item)} style={iconBtn}>Receipt</button>
                  )}
                  {item.type === "manual" && (
                    <button onClick={() => editManual(item)} style={iconBtnPurple}>Edit</button>
                  )}
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

/* ====================== СТИЛИ ====================== */
const inputStyle = { padding: "6px 8px", borderRadius: 8, border: "1px solid rgba(148,163,184,0.6)", background: "rgba(15,23,42,0.95)", color: "#e5e7eb", fontSize: 12 };
const addBtnStyle = { padding: "6px 12px", borderRadius: 12, background: "linear-gradient(135deg, #7c3aed, #db2777)", color: "#fff", border: "none", cursor: "pointer", fontWeight: 600 };
const bigPdfBtn = { padding: "10px 0", borderRadius: 16, background: "linear-gradient(90deg, #4338ca, #7c3aed)", color: "#fff", border: "none", fontSize: 14, cursor: "pointer", fontWeight: 600 };
const selectSmall = { padding: "4px 8px", borderRadius: 8, background: "rgba(15,23,42,0.95)", color: "#e5e7eb", border: "1px solid rgba(148,163,184,0.6)", fontSize: 11 };
const pill = { padding: "4px 10px", borderRadius: 999, background: "rgba(15,23,42,0.95)", border: "1px solid rgba(129,140,248,0.9)", fontSize: 11, whiteSpace: "nowrap" };
const rowStyle = { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", borderRadius: 16, background: "rgba(15,10,25,0.96)", border: "1px solid rgba(139,92,246,0.7)", gap: 12, flexWrap: "wrap" };
const iconBtn = { width: 32, height: 32, borderRadius: 10, background: "rgba(15,23,42,0.95)", border: "1px solid rgba(148,163,184,0.85)", cursor: "pointer" };
const iconBtnPurple = { ...iconBtn, border: "1px solid #c4b5fd" };
const iconBtnRed = { ...iconBtn, border: "1px solid #fca5a5", background: "rgba(127,29,29,0.7)" };

function renderTagPills(tags, serviceStyles) {
  if (!tags?.length) return null;
  return tags.map((name) => {
    const s = serviceStyles[name] || {};
    return (
      <span key={name} style={{ padding: "4px 10px", borderRadius: 999, background: s.bg || "rgba(148,163,184,0.18)", border: s.border || "1px solid rgba(148,163,184,0.85)", fontSize: 11 }}>
        {name}
      </span>
    );
  });
}
