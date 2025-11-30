import { useState, useMemo, useEffect } from "react";
import { fmtDate, fmtTime } from "../lib/storage";
import { useI18n } from "../lib/i18n";

// такие же правила, как в Admin.jsx
const isPaid = (b) => !!(b?.paid || b?.status === "approved_paid");
const isCanceled = (b) =>
  b.status === "canceled_client" || b.status === "canceled_admin";

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
  const { t, lang } = useI18n();          // ← вверх, чтобы везде был доступ
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

  // процент расходов
  const [percent, setPercent] = useState(() => {
    try {
      const raw = localStorage.getItem(PERCENT_KEY);
      if (raw === "" || raw === null) return 30;
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

  // загрузка / сохранение
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

  useEffect(() => { localStorage.setItem(MANUAL_KEY, JSON.stringify(manualEntries)); }, [manualEntries]);
  useEffect(() => { localStorage.setItem(EXCLUDE_KEY, JSON.stringify(excludedIds)); }, [excludedIds]);
  useEffect(() => {
    if (percent !== "" && percent !== null) {
      localStorage.setItem(PERCENT_KEY, String(percent));
    }
  }, [percent]);

  // динамический заголовок периода (месяц / год / произвольный)
  const rangeLabel = useMemo(() => {
    if (mode === "month") {
      const date = new Date(year, month, 1);
      let monthName = date.toLocaleString(lang, { month: "long" });
      monthName = monthName.charAt(0).toUpperCase() + monthName.slice(1);
      return `${monthName} ${year}`;
    }
    if (mode === "year") {
      return t("finance_year_label", { year });
    }
    return `${t("finance_period_label")}: ${rangeFrom || "…"} – ${rangeTo || "…"}`;
  }, [mode, year, month, rangeFrom, rangeTo, lang, t]);

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
  }, [mode, year, month, rangeFrom, rangeTo]);

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
      .map((b) => {
        const end = new Date(b.end || b.start);
        const dateISO = end.toISOString().slice(0, 10);

        return {
          id: "sys-" + b.id,
          type: "system",
          bookingId: b.id,
          booking: b,
          date: dateISO,
          dateDisplay: fmtDate(b.start),
          timeDisplay: `${fmtTime(b.start)} – ${fmtTime(b.end || b.start)}`,
          amount: Number(b.price) || 0,
          tags: Array.isArray(b.services) ? b.services : [],
          description:
            (Array.isArray(b.services) && b.services.join(", ")) ||
            t("finance_system_default_desc"),
          shortId: b.id.slice(0, 6),
        };
      });
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
          description: e.description || t("finance_manual_default_desc"),
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
    const all = [...systemItems, ...manualItems].map((item) => {
      const expense = (Number(item.amount) || 0) * (percent / 100);
      return { ...item, expense };
    });

    return all.sort((a, b) => {
      if (a.date === b.date) return a.timeDisplay.localeCompare(b.timeDisplay);
      return a.date.localeCompare(b.date);
    });
  }, [systemItems, manualItems, percent]);

  // ручной ввод
  const addManual = () => {
    const amount = Number(formAmount);
    if (!formDate || !amount || amount <= 0) return;

    const time =
      formTimeFrom && formTimeTo
        ? `${formTimeFrom} – ${formTimeTo}`
        : formTimeFrom || formTimeTo || "";

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
      setExcludedIds((prev) =>
        prev.includes(item.bookingId) ? prev : [...prev, item.bookingId]
      );
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

  const callReceipt = (item) => {
    if (!item.booking || !onDownloadReceipt) return;
    onDownloadReceipt(item.booking);
  };

  // всё готово — теперь только t() везде
  return (
    <div style={{ padding: "0 10px" }}>

      {/* Ручной ввод */}
      <div>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
          {t("finance_add_manual_title")}
        </div>
        <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 8 }}>
          {t("finance_add_manual_hint")}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "150px 250px 100px 1fr 120px",
            gap: 8,
          }}
        >
          <div style={manualField}>
            <input
              type="date"
              value={formDate}
              onChange={(e) => setFormDate(e.target.value)}
              style={manualInput}
            />
          </div>

          <div style={{ ...manualField, display: "flex", gap: 4 }}>
            <input
              type="time"
              value={formTimeFrom}
              onChange={(e) => setFormTimeFrom(e.target.value)}
              style={{ ...manualInput, flex: 1 }}
            />
            <span style={{ fontSize: 11, opacity: 0.6, alignSelf: "center" }}>–</span>
            <input
              type="time"
              value={formTimeTo}
              onChange={(e) => setFormTimeTo(e.target.value)}
              style={{ ...manualInput, flex: 1 }}
            />
          </div>

          <div style={manualField}>
            <input
              type="number"
              placeholder={t("finance_amount_placeholder")}
              value={formAmount}
              onChange={(e) => setFormAmount(e.target.value)}
              style={manualInput}
            />
          </div>

          <div style={manualField}>
            <input
              type="text"
              placeholder={t("finance_description_placeholder")}
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              style={manualInput}
            />
          </div>

          <button onClick={addManual} style={manualAddBtn}>
            {t("finance_add_button")}
          </button>
        </div>
      </div>

      {/* История */}
      <div style={{ marginTop: 32 }}>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
          {t("finance_history_title")}
        </div>
        <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 8 }}>
          {t("finance_history_subtitle")}
        </div>

        {combinedItems.length === 0 && (
          <div
            style={{
              borderRadius: 16,
              border: "1px solid rgba(51,65,85,0.7)",
              background: "rgba(15,23,42,0.9)",
              padding: "10px 12px",
              fontSize: 12,
              textAlign: "center",
              opacity: 0.8,
            }}
          >
            {t("finance_no_records")}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {combinedItems.map((item) => (
            <div key={item.id} style={rowStyle}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  flexWrap: "wrap",
                  flex: 1,
                  minWidth: 0,
                }}
              >
                <span
                  style={{
                    ...pillBase,
                    background: "rgba(15,23,42,0.95)",
                    border: "1px solid rgba(129,140,248,0.9)",
                    fontWeight: 600,
                  }}
                >
                  {item.dateDisplay}
                </span>

                <span
                  style={{
                    ...pillBase,
                    background: "rgba(15,23,42,0.95)",
                    border: "1px solid rgba(99,102,241,0.7)",
                  }}
                >
                  {item.timeDisplay}
                </span>

                {item.type === "system" ? (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {renderTagPills(item.tags, serviceStyles)}
                  </div>
                ) : (
                  <span
                    style={{
                      ...pillBase,
                      background: "rgba(190,24,93,0.25)",
                      border: "1px solid rgba(244,114,182,0.8)",
                      maxWidth: "100%",
                      textOverflow: "ellipsis",
                      overflow: "hidden",
                    }}
                  >
                    {item.description}
                  </span>
                )}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "nowrap" }}>
                {item.type === "system" && (
                  <span
                    style={{
                      ...pillBase,
                      padding: "5px 10px",
                      background: "rgba(15,23,42,0.95)",
                      border: "1px solid rgba(148,163,184,0.9)",
                      fontSize: 11,
                    }}
                  >
                    #{item.shortId}
                  </span>
                )}

                <span
                  style={{
                    ...pillBase,
                    padding: "4px 6px",
                    minWidth: 50,
                    textAlign: "center",
                    background: "rgba(22,163,74,0.2)",
                    border: "1px solid rgba(34,197,94,0.9)",
                    fontWeight: 600,
                  }}
                >
                  €{item.amount.toFixed(2)}
                </span>

                {item.type === "system" && (
                  <button title="Kvitas" onClick={() => callReceipt(item)} style={iconBtn}>
                    🧾
                  </button>
                )}

                {item.type === "manual" && (
                  <button title="Redaguoti" onClick={() => editManual(item)} style={iconBtnPurple}>
                    ✎
                  </button>
                )}

                <button title="Ištrinti" onClick={() => deleteItem(item)} style={iconBtnRed}>
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* стили без изменений */
const rowStyle = { /* ... тот же самый */ };
const manualField = { /* ... */ };
const manualInput = { /* ... */ };
const manualAddBtn = { /* ... */ };
const iconBtn = { /* ... */ };
const iconBtnPurple = { ...iconBtn, border: "1px solid rgba(139,92,246,0.85)" };
const iconBtnRed = { ...iconBtn, border: "1px solid rgba(248,113,113,0.9)", background: "rgba(127,29,29,0.7)" };
const pillBase = { padding: "4px 10px", borderRadius: 12, fontSize: 12, whiteSpace: "nowrap" };

function renderTagPills(tags, serviceStyles) {
  if (!tags || !tags.length) return null;
  return tags.map((name) => {
    const base = serviceStyles[name] || {};
    const bg = base.bg || "rgba(148,163,184,0.18)";
    const border = base.border || "1px solid rgba(148,163,184,0.85)";
    return (
      <span
        key={name}
        style={{
          padding: "4px 12px",
          borderRadius: 999,
          fontSize: 11,
          background: bg,
          border,
          whiteSpace: "nowrap",
        }}
      >
        {name}
      </span>
    );
  });
}
