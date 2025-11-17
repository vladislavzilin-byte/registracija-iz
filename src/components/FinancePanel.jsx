import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { Download } from "lucide-react";

export default function FinancePanel() {
  const [transactions, setTransactions] = useState([]);
  const [amount, setAmount] = useState(0);
  const [type, setType] = useState("income");
  const [description, setDescription] = useState("");

  const totalIncome = transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = totalIncome - totalExpense;

  const addTransaction = () => {
    if (!amount || !description) return;
    const newEntry = {
      id: Date.now(),
      type,
      amount: Number(amount),
      description,
      date: new Date().toLocaleString(),
    };
    setTransactions([newEntry, ...transactions]);
    setAmount(0);
    setDescription("");
  };

  const exportJSON = () => {
    const dataStr = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(transactions, null, 2)
    )}`;
    const dl = document.createElement("a");
    dl.setAttribute("href", dataStr);
    dl.setAttribute("download", "finance_data.json");
    dl.click();
  };

  return (
    <div className="p-6 grid gap-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-center">Finansų panelė</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="shadow-lg rounded-2xl p-4">
          <CardContent>
            <p className="text-lg font-semibold">Pajamos</p>
            <motion.p
              className="text-3xl font-bold"
              animate={{ opacity: 1 }}
              initial={{ opacity: 0 }}
            >
              €{totalIncome.toFixed(2)}
            </motion.p>
          </CardContent>
        </Card>

        <Card className="shadow-lg rounded-2xl p-4">
          <CardContent>
            <p className="text-lg font-semibold">Išlaidos</p>
            <p className="text-3xl font-bold">€{totalExpense.toFixed(2)}</p>
          </CardContent>
        </Card>

        <Card className="shadow-lg rounded-2xl p-4">
          <CardContent>
            <p className="text-lg font-semibold">Balansas</p>
            <p className="text-3xl font-bold">€{balance.toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Add Transaction */}
      <Card className="p-4 rounded-2xl shadow-md">
        <CardContent className="grid gap-4">
          <h2 className="text-xl font-semibold">Pridėti įrašą</h2>
          <div className="grid md:grid-cols-4 gap-4">
            <select
              className="border p-2 rounded-xl"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="income">Pajamos</option>
              <option value="expense">Išlaidos</option>
            </select>

            <Input
              type="number"
              placeholder="Suma €"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />

            <Input
              type="text"
              placeholder="Aprašymas"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            <Button onClick={addTransaction}>Pridėti</Button>
          </div>
        </CardContent>
      </Card>

      {/* Transaction List */}
      <Card className="p-4 rounded-2xl shadow-md">
        <CardContent className="grid gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Istorija</h2>
            <Button variant="outline" onClick={exportJSON}>
              <Download className="w-4 h-4 mr-2" /> Eksportuoti
            </Button>
          </div>

          <div className="grid gap-3">
            {transactions.map((t) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-xl border flex items-center justify-between"
              >
                <div>
                  <p className="font-semibold">
                    {t.type === "income" ? "➕ Pajamos" : "➖ Išlaidos"}
                  </p>
                  <p className="text-sm opacity-70">{t.description}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold">€{t.amount.toFixed(2)}</p>
                  <p className="text-xs opacity-60">{t.date}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
