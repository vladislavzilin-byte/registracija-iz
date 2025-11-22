import { useState, useMemo, useEffect } from "react";
import { fmtDate, fmtTime } from "../lib/storage";

// те же правила оплаты/отмены, что и в Admin
const isPaid = (b) => !!(b?.paid || b?.status === "approved_paid");
const isCanceled = (b) =>
  b.status === "canceled_client" || b.status === "canceled_admin";

const MANUAL_KEY = "iz.finance.manual.v1";
const EXCLUDE_KEY = "iz.finance.exclude.v1";

const MONTHS = [
  "Sausis",
  "Vasaris",
  "Kovas",
  "Balandis",
  "Gegužė",
  "Birželis",
  "Liepa",
  "Rugpjūtis",
  "Rugsėjis",
  "Spalis",
  "Lapkritis",
  "Gruodis",
];

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
  const now = new Date();

  // режим периода
  const [mode, setMode] = useState("month"); // month | year | range
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [rangeFrom, setRangeFrom] = useState(
    new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  );
  const [rangeTo, setRangeTo] = useState(now.toISOString().slice(0, 10));

  // ручные записи и исключённые системные id
  const [manualEntries, setManualEntries] = useState([]);
  const [excludedIds, setExcludedIds] = useState([]);

  // форма ручной записи
  const [formDate, setFormDate] = useState(formatDateISO(now));
  const [formTimeFrom, setFormTimeFrom] = useState("");
  const [formTimeTo, setFormTimeTo] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formDesc, setFormDesc] = useState("");

  // === загрузка / сохранение localStorage ===
  useEffect(() => {
    try {
      const raw = localStorage.getItem(MANUAL_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setManualEntries(parsed);
      }
    } catch (e) {
      console.error("Finance manual load error", e);
    }
    try {
      const raw2 = localStorage.getItem(EXCLUDE_KEY);
      if (raw2) {
        const parsed = JSON.parse(raw2);
        if (Array.isArray(parsed)) setExcludedIds(parsed);
      }
    } catch (e) {
      console.error("Finance exclude load error", e);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(MANUAL_KEY, JSON.stringify(manualEntries));
    } catch (e) {
      console.error("Finance manual save error", e);
    }
  }, [manualEntries]);

  useEffect(() => {
    try {
      localStorage.setItem(EXCLUDE_KEY, JSON.stringify(excludedIds));
    } catch (e) {
      console.error("Finance exclude save error", e);
    }
  }, [excludedIds]);

  // === расчёт диапазона дат ===
  const [rangeStart, rangeEnd, rangeLabel] = useMemo(() => {
    let start, end, label;

    if (mode === "month") {
      start = new Date(year, month, 1);
      end = new Date(year, month + 1, 1);
      label = `${MONTHS[month]} ${year}`;
    } else if (mode === "year") {
      start = new Date(year, 0, 1);
      end = new Date(year + 1, 0, 1);
      label = `${year} metai`;
    } else {
      const from = rangeFrom ? new Date(rangeFrom) : new Date(year, month, 1);
      const to = rangeTo ? new Date(rangeTo) : now;
      start = from;
      end = new Date(to.getFullYear(), to.getMonth(), to.getDate() + 1);
      label = `Laikotarpis: ${rangeFrom || "…"} – ${rangeTo || "…"} `;
    }

    return [start, end, label];
  }, [mode, year, month, rangeFrom, rangeTo]);

  const isInRange = (d) => d >= rangeStart && d < rangeEnd;

  // === системные доходы (из бронирований) ===
  const systemItems = useMemo(() => {
    return bookings
      .filter((b) => {
        if (isCanceled(b)) return false;
        if (!isPaid(b)) return false;
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
            "Sisteminė pajamų įmoka",
          shortId: b.id.slice(0, 6),
        };
      });
  }, [bookings, excludedIds, rangeStart, rangeEnd]);

  const systemTotal = systemItems.reduce((s, i) => s + i.amount, 0);

  // === ручные доходы ===
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
        description: e.description || "Rankinė pajamų įmoka",
        tags: ["rankinis"],
      }))
      .filter((e) => isInRange(new Date(e.date)));
  }, [manualEntries, rangeStart, rangeEnd]);

  const manualTotal = manualItems.reduce((s, i) => s + i.amount, 0);

  // === сводка ===
  const totalIncome = systemTotal + manualTotal;
  const totalExpenses = totalIncome * 0.3;
  const balance = totalIncome - totalExpenses;

  // === общий список для таблицы/экспорта ===
  const combinedItems = useMemo(() => {
    const all = [...systemItems, ...manualItems];
    return all.sort((a, b) => {
      if (a.date === b.date) return a.timeDisplay.localeCompare(b.timeDisplay);
      return a.date.localeCompare(b.date);
    });
  }, [systemItems, manualItems]);

  const groupedByDate = useMemo(() => {
    const map = {};
    combinedItems.forEach((item) => {
      if (!map[item.date]) {
        map[item.date] = {
          date: item.date,
          dateDisplay: item.dateDisplay,
          items: [],
        };
      }
      map[item.date].items.push(item);
    });
    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
  }, [combinedItems]);

  // === ручной ввод ===
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
      description: formDesc || "Rankinė pajamų įmoka",
      time,
    };

    setManualEntries((prev) => [entry, ...prev]);

    setFormAmount("");
    setFormDesc("");
    setFormTimeFrom("");
    setFormTimeTo("");
  };

  const deleteManual = (id) => {
    setManualEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const deleteItem = (item) => {
    if (
      !window.confirm(
        "Ištrinti šį įrašą iš finansų suvestinės? Rezervacija neliečiama."
      )
    )
      return;

    if (item.type === "system") {
      setExcludedIds((prev) =>
        prev.includes(item.bookingId) ? prev : [...prev, item.bookingId]
      );
    } else {
      deleteManual(item.manualId);
    }
  };

  const editManual = (item) => {
    if (item.type !== "manual") return;
    const entry = manualEntries.find((e) => e.id === item.manualId);
    if (!entry) return;

    const newDesc = window.prompt("Aprašymas:", entry.description || "");
    if (newDesc === null) return;

    const newAmountStr = window.prompt("Suma €:", String(entry.amount));
    if (newAmountStr === null) return;
    const newAmount = Number(newAmountStr);
    if (!newAmount || newAmount <= 0) return;

    const newTime = window.prompt(
      "Laikas (pvz. 04:00 – 13:00):",
      entry.time || ""
    );
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

  // === экспорт PDF ===
  const exportPDF = () => {
    const win = window.open("", "PRINT", "width=900,height=650");
    if (!win) return;

    win.document.write(`
      <html>
      <head>
        <title>Finansų ataskaita</title>
        <style>
          body {
            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            padding: 24px;
            background: #0f172a;
            color: #0f172a;
          }
          .shell {
            max-width: 900px;
            margin: 0 auto;
            background: #f9fafb;
            border-radius: 16px;
            border: 1px solid #d1d5db;
            box-shadow: 0 18px 50px rgba(15,23,42,0.25);
            overflow: hidden;
          }
          .header {
            padding: 16px 22px;
            background: linear-gradient(135deg,#ec4899,#8b5cf6);
            color: white;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .header h1 {
            margin: 0;
            font-size: 20px;
          }
          .header small {
            opacity: 0.9;
            font-size: 12px;
          }
          .logo {
            text-align: right;
            font-size: 12px;
          }
          .content {
            padding: 16px 20px 22px;
            font-size: 13px;
          }
          .summary {
            display: flex;
            gap: 10px;
            margin: 10px 0 14px;
          }
          .card {
            flex: 1;
            border-radius: 12px;
            border: 1px solid #e5e7eb;
            background: #f9fafb;
            padding: 8px 10px;
          }
          .card-title {
            text-transform: uppercase;
            font-size: 11px;
            color: #6b7280;
            margin-bottom: 4px;
          }
          .card-value {
            font-weight: 600;
            font-size: 15px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 6px;
            font-size: 12px;
          }
          th, td {
            border: 1px solid #e5e7eb;
            padding: 6px 8px;
          }
          th {
            background: #fdf2f8;
            text-align: left;
          }
          tbody tr:nth-child(even) {
            background: #fce7f3;
          }
        </style>
      </head>
      <body>
        <div class="shell">
          <div class="header">
            <div>
              <h1>Finansų ataskaita</h1>
              <small>${rangeLabel}</small>
            </div>
            <div class="logo">
              <b>IZ HAIR TREND</b><br/>
              Finansų suvestinė
            </div>
          </div>
          <div class="content">
            <div>
              Suvestinė pagal pasirinktą laikotarpį: pajamos iš sistemos ir rankinių įrašų,
              automatinės išlaidos (30%) ir balansas.
            </div>
            <div class="summary">
              <div class="card">
                <div class="card-title">Sistema</div>
                <div class="card-value">€${systemTotal.toFixed(2)}</div>
              </div>
              <div class="card">
                <div class="card-title">Rankiniai</div>
                <div class="card-value">€${manualTotal.toFixed(2)}</div>
              </div>
              <div class="card">
                <div class="card-title">Išlaidos (30%)</div>
                <div class="card-value">€${totalExpenses.toFixed(2)}</div>
              </div>
              <div class="card">
                <div class="card-title">Balansas</div>
                <div class="card-value">€${balance.toFixed(2)}</div>
              </div>
            </div>

            <h2 style="margin:8px 0 4px;font-size:14px;">Įrašų sąrašas</h2>
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Laikas</th>
                  <th>Paslaugos / aprašymas</th>
                  <th>Suma (€)</th>
                  <th>Kvito nr.</th>
                  <th>Žymos</th>
                </tr>
              </thead>
              <tbody>
                ${
                  groupedByDate.length === 0
                    ? `<tr><td colspan="6" style="text-align:center;color:#9ca3af;padding:8px;">Nėra įrašų</td></tr>`
                    : groupedByDate
                        .map((g) =>
                          g.items
                            .map((item, idx) => {
                              const tagsStr = (item.tags || []).join(", ");
                              const kv =
                                item.type === "system" ? item.shortId || "" : "";
                              const dateCell =
                                idx === 0 ? g.dateDisplay : "";
                              return `<tr>
                                <td>${dateCell}</td>
                                <td>${item.timeDisplay}</td>
                                <td>${item.description || ""}</td>
                                <td>€${item.amount.toFixed(2)}</td>
                                <td>${kv ? "#" + kv : ""}</td>
                                <td>${tagsStr}</td>
                              </tr>`;
                            })
                            .join("")
                        )
                        .join("")
                }
              </tbody>
            </table>
          </div>
        </div>
      </body>
      </html>
    `);

    win.document.close();
    win.focus();
    win.print();
    win.close();
  };

  // === стили-помощники ===
  const wrapStyle = {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  };

  const pillBase = {
    padding: "6px 14px",
    borderRadius: 999,
    fontSize: 12,
    whiteSpace: "nowrap",
  };

  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

  // === render ===
  return (
    <div style={wrapStyle}>
      {/* верх: заголовок + диапазон + экспорт */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={{ fontSize: 20, fontWeight: 600 }}>Finansai</div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>
              Pajamos iš rezervacijų ir rankinių įrašų.
            </div>
            <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>
              Laikotarpis: <b>{rangeLabel}</b>
            </div>
          </div>

          {/* выбор периода */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              alignItems: "flex-end",
            }}
          >
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
              {[
                { v: "month", label: "Mėnuo" },
                { v: "year", label: "Metai" },
                { v: "range", label: "Laikotarpis" },
              ].map((o) => (
                <button
                  key={o.v}
                  onClick={() => setMode(o.v)}
                  style={{
                    ...pillBase,
                    padding: "5px 12px",
                    borderRadius: 999,
                    border:
                      mode === o.v
                        ? "1px solid rgba(244,244,245,0.9)"
                        : "1px solid transparent",
                    background:
                      mode === o.v
                        ? "rgba(248,250,252,0.95)"
                        : "rgba(0,0,0,0)",
                    color: mode === o.v ? "#020617" : "#e5e7eb",
                    fontWeight: mode === o.v ? 600 : 400,
                    cursor: "pointer",
                  }}
                >
                  {o.label}
                </button>
              ))}
            </div>

            {/* конкретные контролы */}
            {mode === "month" && (
              <div style={{ display: "flex", gap: 6 }}>
                <select
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
                  style={selectSmall}
                >
                  {MONTHS.map((m, i) => (
                    <option key={m} value={i}>
                      {m}
                    </option>
                  ))}
                </select>
                <select
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  style={selectSmall}
                >
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {mode === "year" && (
              <div style={{ display: "flex", gap: 6 }}>
                <select
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  style={selectSmall}
                >
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
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
          </div>
        </div>

        {/* большая полоса PDF */}
        <button onClick={exportPDF} style={bigPdfBtn}>
          <span style={{ marginRight: 6 }}>📄</span> Eksportuoti PDF
        </button>

        {/* текстовая сводка, как у тебя */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4,minmax(0,1fr))",
            gap: 12,
            fontSize: 12,
          }}
        >
          <div>
            <div style={{ fontWeight: 600 }}>Sistema</div>
            <div>€{systemTotal.toFixed(2)}</div>
            <div style={{ opacity: 0.7 }}>Užbaigtos ir apmokėtos rezervacijos</div>
          </div>
          <div>
            <div style={{ fontWeight: 600 }}>Rankiniai</div>
            <div>€{manualTotal.toFixed(2)}</div>
            <div style={{ opacity: 0.7 }}>Papildomi rankiniai įrašai</div>
          </div>
          <div>
            <div style={{ fontWeight: 600 }}>Išlaidos (30%)</div>
            <div>€{totalExpenses.toFixed(2)}</div>
            <div style={{ opacity: 0.7 }}>Automatinės išlaidos nuo pajamų</div>
          </div>
          <div>
            <div style={{ fontWeight: 600 }}>Balansas</div>
            <div>€{balance.toFixed(2)}</div>
            <div style={{ opacity: 0.7 }}>Pajamos minus 30% išlaidų</div>
          </div>
        </div>
      </div>

      {/* Ручной ввод */}
      <div>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
          Pridėti rankinį įrašą
        </div>
        <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 8 }}>
          Pvz. grynieji ar papildomos paslaugos.
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "150px 240px 100px 1fr 120px",
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
            <span
              style={{ fontSize: 11, opacity: 0.6, alignSelf: "center" }}
            >
              –
            </span>
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
              placeholder="Suma €"
              value={formAmount}
              onChange={(e) => setFormAmount(e.target.value)}
              style={manualInput}
            />
          </div>

          <div style={manualField}>
            <input
              type="text"
              placeholder="Aprašymas"
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              style={manualInput}
            />
          </div>

          <button onClick={addManual} style={manualAddBtn}>
            Pridėti
          </button>
        </div>
      </div>

      {/* История — строки-пилюли */}
      <div>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
          Istorija
        </div>
        <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 8 }}>
          Visi įrašai pagal pasirinktą laikotarpį.
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
            Nėra įrašų šiam laikotarpiui
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {combinedItems.map((item) => (
            <div key={item.id} style={rowStyle}>
              {/* левая часть: дата, время, теги / описание */}
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
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 4,
                    }}
                  >
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

              {/* правая часть: сумма, номер, кнопки */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  flexWrap: "nowrap",
                }}
              >
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
                padding: "4px 6px",       // ← было 5px 12px — стало в 2 раза меньше
    minWidth: 50,             // ← чтобы выглядело одинаково
    textAlign: "center",
    background: "rgba(22,163,74,0.2)",
    border: "1px solid rgba(34,197,94,0.9)",
    fontWeight: 600,
                  }}
                >
                  €{item.amount.toFixed(2)}
                </span>

                {/* кнопки */}
                {item.type === "system" && (
                  <button
                    title="Kvitas"
                    onClick={() => callReceipt(item)}
                    style={iconBtn}
                  >
                    🧾
                  </button>
                )}

                {item.type === "manual" && (
                  <button
                    title="Redaguoti"
                    onClick={() => editManual(item)}
                    style={iconBtnPurple}
                  >
                    ✎
                  </button>
                )}

                <button
                  title="Ištrinti"
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

/* ===== Вспомогательные стили / функции для таблицы ===== */

const rowStyle = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "6px 8px",
  borderRadius: 18,
  background: "rgba(15,10,25,0.96)",
  border: "1px solid rgba(139,92,246,0.7)",
  boxShadow: "0 0 18px rgba(15,23,42,0.95)",
  overflowX: "auto",
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
  padding: "8px 0",
  border: "1px solid rgba(129,140,248,0.85)",
  background:
    "linear-gradient(90deg, rgba(67,56,202,0.95), rgba(124,58,237,0.95))",
  color: "#f9fafb",
  fontWeight: 500,
  fontSize: 13,
  cursor: "pointer",
  boxShadow: "0 10px 36px rgba(55,48,163,0.8)",
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
  background:
    "linear-gradient(135deg, rgba(88,28,135,0.95), rgba(124,58,237,0.95))",
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

const manualTagStyle = {
  padding: "4px 10px",
  borderRadius: 999,
  fontSize: 11,
  background: "rgba(190,24,93,0.25)",
  border: "1px solid rgba(244,114,182,0.9)",
  color: "#fecdd3",
};

/** генерим цветные пилюли услуг, похожие на Admin */
function renderTagPills(tags, serviceStyles) {
  if (!tags || !tags.length) return null;

  return tags.map((name) => {
    const base = serviceStyles[name] || {};
    const bg =
      base.bg ||
      "rgba(148,163,184,0.18)"; /* если вдруг нет стилей для услуги */
    const border =
      base.border || "1px solid rgba(148,163,184,0.85)";

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
