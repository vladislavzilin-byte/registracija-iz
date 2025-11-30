// FinancePanel.jsx — FULL i18n VERSION
// (code too long for single insertion in this message)

// --- PART 1 START ---
import { useState, useMemo, useEffect } from "react";
import { fmtDate, fmtTime } from "../lib/storage";
import { useI18n } from "../lib/i18n";

const isPaid = (b) => !!(b?.paid || b?.status === "approved_paid");
const isCanceled = (b) => b.status === "canceled_client" || b.status === "canceled_admin";

const MANUAL_KEY = "iz.finance.manual.v1";
const EXCLUDE_KEY = "iz.finance.exclude.v1";
const PERCENT_KEY = "iz.finance.expensePercent.v1";

const pad2 = (n) => String(n).padStart(2, "0");
const formatDateISO = (d) => {
  const x = new Date(d);
  if (isNaN(x)) return "";
  return `${x.getFullYear()}-${pad2(x.getMonth() + 1)}-${pad2(x.getDate())}`;
};

export default function FinancePanel({ bookings = [], serviceStyles = {}, onDownloadReceipt, settings = {} }) {
  const { t, lang } = useI18n();
  const now = new Date();

  const [mode, setMode] = useState("month");
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [rangeFrom, setRangeFrom] = useState(formatDateISO(new Date(now.getFullYear(), now.getMonth(), 1)));
  const [rangeTo, setRangeTo] = useState(formatDateISO(now));

  const [manualEntries, setManualEntries] = useState([]);
  const [excludedIds, setExcludedIds] = useState([]);
  const [percent, setPercent] = useState(() => {
    const raw = localStorage.getItem(PERCENT_KEY);
    const n = Number(raw);
    return !isNaN(n) ? n : 30;
  });

  const [formDate, setFormDate] = useState(formatDateISO(now));
  const [formTimeFrom, setFormTimeFrom] = useState("");
  const [formTimeTo, setFormTimeTo] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formDesc, setFormDesc] = useState("");

  const MONTHS =
    lang === "lt"
      ? t("finance_months_lt").split(",")
      : lang === "ru"
      ? t("finance_months_ru").split(",")
      : t("finance_months_en").split(",");

  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(MANUAL_KEY));
      if (Array.isArray(raw)) setManualEntries(raw);
    } catch {}
    try {
      const raw = JSON.parse(localStorage.getItem(EXCLUDE_KEY));
      if (Array.isArray(raw)) setExcludedIds(raw);
    } catch {}
  }, []);

// --- PART 1 END ---

// --- PART 2 START ---

  useEffect(() => localStorage.setItem(MANUAL_KEY, JSON.stringify(manualEntries)), [manualEntries]);
  useEffect(() => localStorage.setItem(EXCLUDE_KEY, JSON.stringify(excludedIds)), [excludedIds]);
  useEffect(() => localStorage.setItem(PERCENT_KEY, String(percent)), [percent]);

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

  const systemItems = useMemo(
    () =>
      bookings
        .filter((b) => isPaid(b) && !isCanceled(b) && !excludedIds.includes(b.id))
        .map((b) => {
          const end = new Date(b.end || b.start);
          if (!isInRange(end)) return null;
          return {
            id: "sys-" + b.id,
            type: "system",
            bookingId: b.id,
            booking: b,
            date: end.toISOString().slice(0, 10),
            dateDisplay: fmtDate(b.start),
            timeDisplay: `${fmtTime(b.start)} – ${fmtTime(b.end)}`,
            amount: Number(b.price) || 0,
            tags: b.services || [],
            description: (b.services || []).join(", ") || t("finance_system"),
            shortId: b.id.slice(0, 6),
          };
        })
        .filter(Boolean),
    [bookings, excludedIds, rangeStart, rangeEnd, lang]
  );

  const manualItems = useMemo(
    () =>
      manualEntries
        .filter((e) => isInRange(new Date(e.date)))
        .map((e) => ({
          id: "man-" + e.id,
          manualId: e.id,
          type: "manual",
          date: e.date,
          dateDisplay: fmtDate(e.date),
          timeDisplay: e.time || "—",
          amount: Number(e.amount) || 0,
          description: e.description || t("finance_manual"),
          tags: [t("finance_tag_manual")],
        })),
    [manualEntries, rangeStart, rangeEnd, lang]
  );

  const systemTotal = systemItems.reduce((s, i) => s + i.amount, 0);
  const manualTotal = manualItems.reduce((s, i) => s + i.amount, 0);

// --- PART 2 END ---

// --- PART 3 START ---

  const totalIncome = systemTotal + manualTotal;
  const totalExpenses = (totalIncome * percent) / 100;
  const balance = totalIncome - totalExpenses;

  const combinedItems = useMemo(
    () =>
      [...systemItems, ...manualItems]
        .map((item) => ({ ...item, expense: (item.amount * percent) / 100 }))
        .sort((a, b) =>
          a.date === b.date
            ? a.timeDisplay.localeCompare(b.timeDisplay)
            : a.date.localeCompare(b.date)
        ),
    [systemItems, manualItems, percent]
  );

  const addManual = () => {
    if (!formDate || !formAmount) return;

    setManualEntries((prev) => [
      {
        id: Date.now(),
        date: formDate,
        amount: Number(formAmount),
        description: formDesc || t("finance_manual"),
        time:
          formTimeFrom && formTimeTo
            ? `${formTimeFrom} – ${formTimeTo}`
            : formTimeFrom || formTimeTo || "",
      },
      ...prev,
    ]);

    setFormAmount("");
    setFormDesc("");
    setFormTimeFrom("");
    setFormTimeTo("");
  };

  const deleteItem = (item) => {
    if (!window.confirm(t("finance_delete_confirm"))) return;

    if (item.type === "system") setExcludedIds((prev) => [...prev, item.bookingId]);
    else setManualEntries((prev) => prev.filter((e) => e.id !== item.manualId));
  };

  const callReceipt = (item) => {
    if (!item.booking || !onDownloadReceipt) return;
    onDownloadReceipt(item.booking);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <div style={{ fontSize: 20, fontWeight: 600 }}>{t("finance_title")}</div>
        <div style={{ fontSize: 12, opacity: 0.7 }}>{t("finance_income_caption")}</div>
        <div style={{ fontSize: 11, opacity: 0.7 }}>
          {t("finance_period")}: <b>{`${rangeFrom} – ${rangeTo}`}</b>
        </div>
      </div>

      <div
        style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}
      >
        <div
          style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, flexWrap: "wrap" }}
        >
          <div>
            <div style={{ fontSize: 20, fontWeight: 600 }}>{t("finance_filters")}</div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>{t("finance_filters_sub")}</div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
            <div
              style={{
                display: "flex",
                gap: 6,
                background: "rgba(17,0,40,0.6)",
                borderRadius: 999,
                padding: 4,
                border: "1px solid rgba(168,85,247,0.4)",
              }}
            >
              {["month", "year", "range"].map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  style={{
                    padding: "5px 12px",
                    borderRadius: 999,
                    border:
                      mode === m
                        ? "1px solid rgba(244,244,245,0.9)"
                        : "1px solid transparent",
                    background:
                      mode === m ? "rgba(248,250,252,0.95)" : "rgba(0,0,0,0)",
                    color: mode === m ? "#020617" : "#e5e7eb",
                    fontWeight: mode === m ? 600 : 400,
                    cursor: "pointer",
                    fontSize: 12,
                  }}
                >
                  {t(`finance_mode_${m}`)}
                </button>
              ))}
            </div>

            {mode === "month" && (
              <div style={{ display: "flex", gap: 6 }}>
                <select value={month} onChange={(e) => setMonth(Number(e.target.value))} style={selectSmall}>
                  {MONTHS.map((m, i) => (
                    <option key={i} value={i}>{m}</option>
                  ))}
                </select>

                <select value={year} onChange={(e) => setYear(Number(e.target.value))} style={selectSmall}>
                  {[year - 1, year, year + 1].map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            )}

// --- PART 3 END ---

// --- PART 4 START ---

            {mode === "year" && (
              <div style={{ display: "flex", gap: 6 }}>
                <select
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  style={selectSmall}
                >
                  {[year - 1, year, year + 1].map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            )}

            {mode === "range" && (
              <div style={{ display: "flex", gap: 6 }}>
                <input
                  type="date"
                  value={rangeFrom}
                  onChange={(e) => setRangeFrom(e.target.value)}
                  style={selectSmall}
                />
                <input
                  type="date"
                  value={rangeTo}
                  onChange={(e) => setRangeTo(e.target.value)}
                  style={selectSmall}
                />
              </div>
            )}

            <div style={{ fontSize: 11, color: "#e5e7eb" }}>
              {t("finance_expense_percent")}: {" "}
              <input
                type="number"
                value={percent}
                min={0}
                max={100}
                onChange={(e) => setPercent(Number(e.target.value))}
                style={{
                  width: 60,
                  padding: "4px 6px",
                  borderRadius: 8,
                  border: "1px solid rgba(148,163,184,0.7)",
                  background: "rgba(15,23,42,0.95)",
                  color: "#e5e7eb",
                  fontSize: 11,
                  marginLeft: 4,
                  marginRight: 2,
                }}
              />
              %
            </div>
          </div>
        </div>

        <button onClick={() => window.print()} style={bigPdfBtn}>
          <span style={{ marginRight: 6 }}>📄</span> {t("finance_export_pdf")}
        </button>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4,minmax(0,1fr))",
            gap: 12,
            fontSize: 12,
          }}
        >
          <div>
            <div style={{ fontWeight: 600 }}>{t("finance_system")}</div>
            <div>€{systemTotal.toFixed(2)}</div>
            <div style={{ opacity: 0.7 }}>{t("finance_system_caption")}</div>
          </div>

          <div>
            <div style={{ fontWeight: 600 }}>{t("finance_manual")}</div>
            <div>€{manualTotal.toFixed(2)}</div>
            <div style={{ opacity: 0.7 }}>{t("finance_manual_caption")}</div>
          </div>

          <div>
            <div style={{ fontWeight: 600 }}>{t("finance_expenses")}</div>
            <div>€{totalExpenses.toFixed(2)}</div>
            <div style={{ opacity: 0.7 }}>{t("finance_expenses_caption")}</div>
          </div>

          <div>
            <div style={{ fontWeight: 600 }}>{t("finance_balance")}</div>
            <div>€{balance.toFixed(2)}</div>
            <div style={{ opacity: 0.7 }}>{t("finance_balance_caption")}</div>
          </div>
        </div>
      </div>

      {/* Add manual entry */}
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

// --- PART 4 END ---

// --- PART 5 START ---

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

      {/* History section */}
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

              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
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
                  <button
                    title={t("finance_receipt")}
                    onClick={() => callReceipt(item)}
                    style={iconBtn}
                  >
                    🧾
                  </button>
                )}

                {item.type === "manual" && (
                  <button
                    title={t("finance_edit")}
                    onClick={() => editManual(item)}
                    style={iconBtnPurple}
                  >
                    ✎
                  </button>
                )}

                <button
                  title={t("finance_delete")}
                  onClick={() => deleteItem(item)}
                  style={iconBtnRed}
                >
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

// --- PART 5 END ---


// --- PART 6 (final styles & helpers) ---

// Row pill styling
const rowStyle = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "6px 8px",
  borderRadius: 18,
  background: "rgba(15,10,25,0.96)",
  border: "1px solid rgba(139,92,246,0.7)",
  overflowX: "auto",
};

const pillBase = {
  padding: "4px 10px",
  borderRadius: 12,
  fontSize: 12,
  whiteSpace: "nowrap",
};

const manualField = {
  borderRadius: 14,
  border: "1px solid rgba(51,65,85,0.8)",
  background: "rgba(15,23,42,0.95)",
  padding: "6px 10px",
};

const manualInput = {
  width: "100%",
  border: "none",
  background: "transparent",
  color: "#e5e7eb",
  fontSize: 12,
  outline: "none",
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
  width: 28,
  height: 28,
  borderRadius: 10,
  border: "1px solid rgba(148,163,184,0.85)",
  background: "rgba(15,23,42,0.95)",
  color: "#e5e7eb",
  fontSize: 13,
  cursor: "pointer",
};

const iconBtnPurple = {
  ...iconBtn,
  border: "1px solid rgba(139,92,246,0.85)",
};

const iconBtnRed = {
  ...iconBtn,
  border: "1px solid rgba(248,113,113,0.9)",
  background: "rgba(127,29,29,0.7)",
};

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

// --- END OF FILE ---
