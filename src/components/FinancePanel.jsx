import { useState, useEffect, useMemo } from "react";

const STORAGE_KEY = "iz_finance_transactions_v1";

const monthNames = [
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
  "Gruodis"
];

export default function FinancePanel() {
  const now = new Date();
  const [transactions, setTransactions] = useState([]);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());

  const [formDate, setFormDate] = useState(
    new Date().toISOString().slice(0, 10)
  ); // yyyy-mm-dd
  const [formAmount, setFormAmount] = useState("");
  const [formDescription, setFormDescription] = useState("");

  // 🔄 Загружаем из localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setTransactions(parsed);
      }
    } catch (e) {
      console.error("Failed to load finance data", e);
    }
  }, []);

  // 💾 Сохраняем в localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
    } catch (e) {
      console.error("Failed to save finance data", e);
    }
  }, [transactions]);

  // 🔍 Фильтрация по месяцу и году
  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      const d = new Date(t.date);
      return (
        d.getFullYear() === Number(selectedYear) &&
        d.getMonth() === Number(selectedMonth)
      );
    });
  }, [transactions, selectedYear, selectedMonth]);

  // 📊 Расчёты
  const totalIncome = filtered.reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = totalIncome * 0.3; // 30% от дохода
  const balance = totalIncome - totalExpense;

  // Для графика
  const maxAmount = filtered.reduce(
    (max, t) => (t.amount > max ? t.amount : max),
    0
  );

  // ➕ Добавить доход
  const handleAdd = () => {
    const amt = Number(formAmount);
    if (!amt || amt <= 0) return;
    if (!formDate) return;

    const newTx = {
      id: Date.now(),
      date: formDate,
      amount: amt,
      description: formDescription || "Be aprašymo"
    };

    setTransactions((prev) => [newTx, ...prev]);
    setFormAmount("");
    setFormDescription("");
  };

  // 🧾 Экспорт в PDF (через окно печати)
  const handleExportPDF = () => {
    const reportElement = document.getElementById("finance-report");
    if (!reportElement) return;

    const printContents = reportElement.innerHTML;
    const win = window.open("", "", "width=900,height=650");

    if (!win) return;

    win.document.write(`
      <html>
        <head>
          <title>Finansų ataskaita</title>
          <style>
            body {
              font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
              padding: 24px;
              color: #111827;
            }
            h1 {
              font-size: 24px;
              margin-bottom: 4px;
            }
            h2 {
              font-size: 18px;
              margin: 16px 0 8px;
            }
            .summary {
              display: flex;
              gap: 16px;
              margin-bottom: 16px;
            }
            .card {
              padding: 12px 16px;
              border-radius: 12px;
              border: 1px solid #e5e7eb;
              flex: 1;
            }
            .card-title {
              font-size: 12px;
              text-transform: uppercase;
              color: #6b7280;
              margin-bottom: 4px;
            }
            .card-value {
              font-size: 18px;
              font-weight: 600;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 8px;
              font-size: 12px;
            }
            th, td {
              border: 1px solid #e5e7eb;
              padding: 6px 8px;
              text-align: left;
            }
