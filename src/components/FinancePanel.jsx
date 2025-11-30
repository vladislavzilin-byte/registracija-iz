// Updated FinancePanel.jsx with i18n integration
// (Full file provided by ChatGPT)

import { useState, useMemo, useEffect } from "react";
import { fmtDate, fmtTime } from "../lib/storage";
import { useI18n } from "../lib/i18n";

// FULL UPDATED FinancePanel.jsx WITH i18n

import { useState, useMemo, useEffect } from "react";
import { fmtDate, fmtTime } from "../lib/storage";
import { useI18n } from "../lib/i18n";

const isPaid = (b) => !!(b?.paid || b?.status === "approved_paid");
const isCanceled = (b) =>
  b.status === "canceled_client" || b.status === "canceled_admin";

const MANUAL_KEY = "iz.finance.manual.v1";
const EXCLUDE_KEY = "iz.finance.exclude.v1";

const MONTHS_LT = [
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

export default function FinancePanel({ bookings = [], serviceStyles = {}, onDownloadReceipt }) {
  const { t, lang } = useI18n();
  const now = new Date();

  const [mode, setMode] = useState("month");
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [rangeFrom, setRangeFrom] = useState(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10));
  const [rangeTo, setRangeTo] = useState(now.toISOString().slice(0, 10));

  const [manualEntries, setManualEntries] = useState([]);
  const [excludedIds, setExcludedIds] = useState([]);

  const [formDate, setFormDate] = useState(formatDateISO(now));
  const [formTimeFrom, setFormTimeFrom] = useState("");
  const [formTimeTo, setFormTimeTo] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formDesc, setFormDesc] = useState("");

  const MONTHS = lang === "lt" ? MONTHS_LT : lang === "ru" ?
    ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"] :
    ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  useEffect(() => {
    try {
      const raw = localStorage.getItem(MANUAL_KEY);
      if (raw) setManualEntries(JSON.parse(raw));
    } catch {}
    try {
      const raw2 = localStorage.getItem(EXCLUDE_KEY);
      if (raw2) setExcludedIds(JSON.parse(raw2));
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem(MANUAL_KEY, JSON.stringify(manualEntries));
  }, [manualEntries]);

  useEffect(() => {
    localStorage.setItem(EXCLUDE_KEY, JSON.stringify(excludedIds));
  }, [excludedIds]);

  const [rangeStart, rangeEnd, rangeLabel] = useMemo(() => {
    let start, end, label;

    if (mode === "month") {
      start = new Date(year, month, 1);
      end = new Date(year, month + 1, 1);
      label = `${MONTHS[month]} ${year}`;
    } else if (mode === "year") {
      start = new Date(year, 0, 1);
      end = new Date(year + 1, 0, 1);
      label = `${year}`;
    } else {
      const from = rangeFrom ? new Date(rangeFrom) : new Date(year, month, 1);
      const to = rangeTo ? new Date(rangeTo) : now;
      start = from;
      end = new Date(to.getFullYear(), to.getMonth(), to.getDate() + 1);
      label = `${t("finance_range")}: ${rangeFrom || "…"} – ${rangeTo || "…"}`;
    }
    return [start, end, label];
  }, [mode, year, month, rangeFrom, rangeTo, lang]);

  const isInRange = (d) => d >= rangeStart && d < rangeEnd;

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
        return {
          id: "sys-" + b.id,
          type: "system",
          bookingId: b.id,
          booking: b,
          date: end.toISOString().slice(0, 10),
          dateDisplay: fmtDate(b.start),
          timeDisplay: `${fmtTime(b.start)} – ${fmtTime(b.end || b.start)}`,
          amount: Number(b.price) || 0,
          tags: b.services || [],
          description: b.services?.join(", ") || "System income",
          shortId: b.id.slice(0, 6),
        };
      });
  }, [bookings, excludedIds, rangeStart, rangeEnd, lang]);

  const systemTotal = systemItems.reduce((s, i) => s + i.amount, 0);

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
        description: e.description || t("finance_manual"),
        tags: ["manual"],
      }))
      .filter((e) => isInRange(new Date(e.date)));
  }, [manualEntries, rangeStart, rangeEnd, lang]);

  const manualTotal = manualItems.reduce((s, i) => s + i.amount, 0);

  const totalIncome = systemTotal + manualTotal;
  const totalExpenses = totalIncome * 0.3;
  const balance = totalIncome - totalExpenses;

  const combinedItems = useMemo(() => {
    return [...systemItems, ...manualItems].sort((a, b) => {
      if (a.date === b.date) return a.timeDisplay.localeCompare(b.timeDisplay);
      return a.date.localeCompare(b.date);
    });
  }, [systemItems, manualItems]);

  const groupedByDate = useMemo(() => {
    const map = {};
    combinedItems.forEach((item) => {
      if (!map[item.date]) {
        map[item.date] = { date: item.date, dateDisplay: item.dateDisplay, items: [] };
      }
      map[item.date].items.push(item);
    });
    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
  }, [combinedItems]);

  const addManual = () => {
    const amount = Number(formAmount);
    if (!formDate || !amount || amount <= 0) return;

    const time = formTimeFrom && formTimeTo ? `${formTimeFrom} – ${formTimeTo}` : formTimeFrom || formTimeTo || "";

    const entry = { id: Date.now(), date: formDate, amount, description: formDesc, time };
    setManualEntries((prev) => [entry, ...prev]);

    setFormAmount("");
    setFormDesc("");
    setFormTimeFrom("");
    setFormTimeTo("");
  };

  const deleteManual = (id) => {
    set
