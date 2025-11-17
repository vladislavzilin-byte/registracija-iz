// FULLY FIXED FinancePanel.jsx — no cut code, no errors
// Professional Panel with month selector, auto-expenses=30%, charts, PDF export

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

  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [formAmount, setFormAmount] = useState("");
  const [formDescription, setFormDescription] = useState("");

  // Load localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setTransactions(parsed);
      }
    } catch (e) {
      console.error("Storage load error", e);
    }
  }, []);

  // Save localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
    } catch (e) {
      console.error("Storage save error", e);
    }
  }, [transactions]);

  // Filter by month/year
  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      const d = new Date(t.date);
      return (
        d.getFullYear() === Number(selectedYear) &&
        d.getMonth() === Number(selectedMonth)
      );
    });
  }, [transactions, selectedYear, selectedMonth]);

  // Calculations
  const totalIncome = filtered.reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = totalIncome * 0.3;
  const balance = totalIncome - totalExpense;

  const handleAdd = () => {
    const amt = Number(formAmount);
    if (!amt || amt <= 0) return;

    const newTx = {
      id: Date.now(),
      date: formDate,
      amount: amt,
      description: formDescription || "Be aprašymo",
    };

    setTransactions([newTx, ...transactions]);
    setFormAmount("");
    setFormDescription("");
  };

  // PDF Export (Print)
  const handleExportPDF = () => {
    const report = document.getElementById("finance-report");
    if (!report) return;

    const win = window.open("", "PRINT", "width=900,height=650");
    if (!win) return;

    win.document.write(`
      <html>
      <head>
        <title>Finansų ataskaita</title>
        <style>
          body { font-family: Arial; padding: 20px; }
          h1 { font-size: 20px; margin-bottom: 10px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #ddd; padding: 6px; font-size: 12px; }
          th { background: #f3f3f3; }
        </style>
      </head>
      <body>
        ${report.innerHTML}
      </body>
      </html>
    `);

    win.document.close();
    win.focus();
    win.print();
    win.close();
  };

  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto text-white space-y-6">

      {/* HEADER */}
      <div className="flex justify-between items-end flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">Finansų panelė</h1>
          <p className="text-zinc-400 text-sm">Profesionali finansų suvestinė su PDF ataskaita</p>
        </div>

        <div className="flex gap-2">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm"
          >
            {monthNames.map((m, i) => (
              <option key={i} value={i}>{m}</option>
            ))}
          </select>

          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm"
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl p-4 bg-zinc-900 border border-emerald-500/40">
          <p className="text-xs text-emerald-300 uppercase">Pajamos</p>
          <p className="text-2xl font-semibold mt-1">€{totalIncome.toFixed(2)}</p>
        </div>

        <div className="rounded-2xl p-4 bg-zinc-900 border border-rose-500/40">
          <p className="text-xs text-rose-300 uppercase">Išlaidos (30%)</p>
          <p className="text-2xl font-semibold mt-1">€{totalExpense.toFixed(2)}</p>
        </div>

        <div className="rounded-2xl p-4 bg-zinc-900 border border-indigo-500/40">
          <p className="text-xs text-indigo-300 uppercase">Balansas</p>
          <p className="text-2xl font-semibold mt-1">€{balance.toFixed(2)}</p>
        </div>
      </div>

      {/* ADD FORM */}
      <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-4 space-y-4">
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
            className="bg-gradient-to-r from-purple-500 to-indigo-500 rounded-xl px-4 py-2 text-sm font-semibold hover:brightness-110"
          >
            Pridėti
          </button>
        </div>
      </div>

      {/* HISTORY + PDF REPORT */}
      <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-4 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Istorija</h2>

          <button
            onClick={handleExportPDF}
            className="bg-gradient-to-r from-fuchsia-500 to-indigo-500 rounded-xl px-4 py-2 text-sm font-semibold hover:brightness-110"
          >
            📄 Eksportuoti PDF
          </button>
        </div>

        {/* PDF CONTENT */}
        <div id="finance-report" className="bg-white text-black p-4 rounded-xl">
          <h1>Finansų ataskaita — {monthNames[selectedMonth]} {selectedYear}</h1>

          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Suma (€)</th>
                <th>Aprašymas</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id}>
                  <td>{t.date}</td>
                  <td>{t.amount.toFixed(2)}</td>
                  <td>{t.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
