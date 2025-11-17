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
            th {
              background: #f3f4f6;
            }
          </style>
        </head>
        <body>
          ${printContents}
        </body>
      </html>
    `);

    win.document.close();
    win.focus();
    win.print();
    win.close();
  };

  // Годы для селекта (например, текущий -1, текущий, +1)
  const years = [
    now.getFullYear() - 1,
    now.getFullYear(),
    now.getFullYear() + 1
  ];

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6 text-white">
      {/* Заголовок + фильтры */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold">Finansų panelė</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Profesionali pajamų / išlaidų suvestinė su PDF ataskaita.
          </p>
        </div>

        <div className="flex gap-2">
          <select
            className="bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
          >
            {monthNames.map((m, idx) => (
              <option key={m} value={idx}>
                {m}
              </option>
            ))}
          </select>

          <select
            className="bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm"
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Карточки сумм */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border border-emerald-500/40 p-4">
          <p className="text-xs uppercase tracking-wide text-emerald-300">
            Pajamos
          </p>
          <p className="text-2xl font-semibold mt-1">
            €{totalIncome.toFixed(2)}
          </p>
          <p className="text-xs text-zinc-400 mt-1">
            Visos mėnesio uždirbtos lėšos
          </p>
        </div>

        <div className="rounded-2xl bg-gradient-to-br from-rose-500/20 to-rose-500/5 border border-rose-500/40 p-4">
          <p className="text-xs uppercase tracking-wide text-rose-300">
            Išlaidos (30%)
          </p>
          <p className="text-2xl font-semibold mt-1">
            €{totalExpense.toFixed(2)}
          </p>
          <p className="text-xs text-zinc-400 mt-1">
            Automatiškai skaičiuojama 30% nuo pajamų
          </p>
        </div>

        <div className="rounded-2xl bg-gradient-to-br from-indigo-500/20 to-indigo-500/5 border border-indigo-500/40 p-4">
          <p className="text-xs uppercase tracking-wide text-indigo-300">
            Balansas
          </p>
          <p className="text-2xl font-semibold mt-1">
            €{balance.toFixed(2)}
          </p>
          <p className="text-xs text-zinc-400 mt-1">
            Pajamos minus 30% išlaidų
          </p>
        </div>
      </div>

      {/* Форма добавления */}
      <div className="rounded-2xl bg-zinc-900/70 border border-zinc-800 p-4 md:p-5 space-y-4">
        <h2 className="text-xl font-semibold">Pridėti įrašą</h2>
        <div className="grid md:grid-cols-4 gap-3">
          <input
            type="date"
            className="bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-sm"
            value={formDate}
            onChange={(e) => setFormDate(e.target.value)}
          />

          <input
            type="number"
            min="0"
            step="0.01"
            className="bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-sm"
            placeholder="Suma €"
            value={formAmount}
            onChange={(e) => setFormAmount(e.target.value)}
          />

          <input
            type="text"
            className="bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-sm"
            placeholder="Aprašymas"
            value={formDescription}
            onChange={(e) => setFormDescription(e.target.value)}
          />

          <button
            onClick={handleAdd}
            className="bg-gradient-to-r from-purple-500 to-indigo-500 hover:brightness-110 transition rounded-xl px-4 py-2 text-sm font-semibold"
          >
            Pridėti
          </button>
        </div>
        <p className="text-xs text-zinc-500">
          Išlaidos šio mėnesio suvestinėje visuomet bus 30% nuo visų pajamų.
        </p>
      </div>

      {/* Отчёт для PDF + таблица + мини-график */}
      <div className="rounded-2xl bg-zinc-900/70 border border-zinc-800 p-4 md:p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">Istorija</h2>
          <button
            onClick={handleExportPDF}
            className="bg-gradient-to-r from-fuchsia-500 to-indigo-500 hover:brightness-110 transition rounded-xl px-4 py-2 text-sm font-semibold flex items-center gap-2"
          >
            📄 Eksportuoti PDF
          </button>
        </div>

        {/* Этот блок попадёт в PDF */}
        <div id="finance-report">
          <h1>
            Finansų ataskaita – {monthNames[selectedMonth]} {selectedYear}
          </h1>

          <div className="summary mt-2 mb-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-black md:text-inherit">
            <div className="card bg-white md:bg-white/95 rounded-xl p-3 md:p-4 border border-zinc-200">
              <div className="card-title">Pajamos</div>
              <div className="card-value">
                €{totalIncome.toFixed(
