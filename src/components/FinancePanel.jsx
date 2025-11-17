import React, { useEffect, useMemo, useState } from 'react'
import { getBookings } from '../lib/storage'

// ключ для ручных записей
const MANUAL_KEY = 'iz.finance.manual.v1'

// месяцы по-литовски
const MONTHS = [
  'Sausis',
  'Vasaris',
  'Kovas',
  'Balandis',
  'Gegužė',
  'Birželis',
  'Liepa',
  'Rugpjūtis',
  'Rugsėjis',
  'Spalis',
  'Lapkritis',
  'Gruodis'
]

// оплачено ли бронирование — та же логика, что в MyBookings
const isPaid = (b) => !!(b?.paid || b?.status === 'approved_paid')

// не отменена ли бронь
const isCanceled = (b) =>
  b.status === 'canceled_client' || b.status === 'canceled_admin'

export default function FinancePanel() {
  const now = new Date()

  // выбранный месяц/год
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())

  // ручные записи: {id,date,amount,description}
  const [manualEntries, setManualEntries] = useState([])

  // форма добавления ручной записи
  const [formDate, setFormDate] = useState(now.toISOString().slice(0, 10))
  const [formAmount, setFormAmount] = useState('')
  const [formDesc, setFormDesc] = useState('')

  // редактирование
  const [editingId, setEditingId] = useState(null)
  const [editAmount, setEditAmount] = useState('')
  const [editDesc, setEditDesc] = useState('')

  // чтобы реагировать на изменения из админки
  const [bookingsVersion, setBookingsVersion] = useState(0)

  // === ЗАГРУЗКА / СОХРАНЕНИЕ РУЧНЫХ ЗАПИСЕЙ ===
  useEffect(() => {
    try {
      const raw = localStorage.getItem(MANUAL_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) setManualEntries(parsed)
      }
    } catch (e) {
      console.error('Cannot load manual finance entries', e)
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(MANUAL_KEY, JSON.stringify(manualEntries))
    } catch (e) {
      console.error('Cannot save manual finance entries', e)
    }
  }, [manualEntries])

  // слушаем изменения броней из других вкладок (как в MyBookings)
  useEffect(() => {
    const onStorage = (e) => {
      if (!e.key || e.key === 'iz.bookings.v7') {
        setBookingsVersion((v) => v + 1)
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  // === ДОХОДЫ ИЗ БРОНИРОВАНИЙ ===
  const systemIncomeItems = useMemo(() => {
    const allBookings = getBookings()

    const items = allBookings
      .filter((b) => {
        const end = new Date(b.end)
        // только завершённые
        if (end > now) return false
        // только не отменённые
        if (isCanceled(b)) return false
        // только оплаченные
        if (!isPaid(b)) return false
        // фильтр по месяцу/году
        if (end.getFullYear() !== Number(year)) return false
        if (end.getMonth() !== Number(month)) return false
        return true
      })
      .map((b) => {
        const end = new Date(b.end)
        const amount = Number(b.price) || 0
        return {
          id: `sys-${b.id}`,
          type: 'system',
          date: end.toISOString().slice(0, 10),
          amount,
          description:
            (b.services && b.services.join(', ')) || 'Sisteminė pajamų įmoka'
        }
      })

    return items
  }, [year, month, bookingsVersion])

  const systemIncomeTotal = systemIncomeItems.reduce(
    (sum, item) => sum + item.amount,
    0
  )

  // === РУЧНЫЕ ДОХОДЫ (фильтр по месяцу/году) ===
  const manualItemsForPeriod = useMemo(
    () =>
      manualEntries.filter((e) => {
        const d = new Date(e.date)
        return (
          d.getFullYear() === Number(year) && d.getMonth() === Number(month)
        )
      }),
    [manualEntries, year, month]
  )

  const manualIncomeTotal = manualItemsForPeriod.reduce(
    (sum, item) => sum + item.amount,
    0
  )

  // === ОБЩИЕ ЦИФРЫ ===
  const totalIncome = systemIncomeTotal + manualIncomeTotal
  const totalExpense = totalIncome * 0.3
  const balance = totalIncome - totalExpense

  // === ДОБАВЛЕНИЕ РУЧНОГО ЗАПИСИ ===
  const addManual = () => {
    const amount = Number(formAmount)
    if (!formDate || !amount || amount <= 0) return

    const entry = {
      id: Date.now(),
      date: formDate,
      amount,
      description: formDesc || 'Rankinė pajamų įmoka'
    }
    setManualEntries((prev) => [entry, ...prev])
    setFormAmount('')
    setFormDesc('')
  }

  // === РЕДАКТИРОВАНИЕ / УДАЛЕНИЕ РУЧНЫХ ===
  const startEdit = (entry) => {
    setEditingId(entry.id)
    setEditAmount(String(entry.amount))
    setEditDesc(entry.description)
  }

  const saveEdit = () => {
    const amount = Number(editAmount)
    if (!amount || amount <= 0) return

    setManualEntries((prev) =>
      prev.map((e) =>
        e.id === editingId ? { ...e, amount, description: editDesc } : e
      )
    )
    setEditingId(null)
  }

  const deleteManual = (id) => {
    if (!window.confirm('Удалить этот ручной доход?')) return
    setManualEntries((prev) => prev.filter((e) => e.id !== id))
  }

  // объединяем системные и ручные для таблицы
  const combinedItems = useMemo(() => {
    const all = [
      ...systemIncomeItems.map((i) => ({ ...i, sourceLabel: 'Sistema' })),
      ...manualItemsForPeriod.map((i) => ({ ...i, sourceLabel: 'Rankinis' }))
    ]
    return all.sort((a, b) => (a.date > b.date ? 1 : a.date < b.date ? -1 : 0))
  }, [systemIncomeItems, manualItemsForPeriod])

  // === ЭКСПОРТ В PDF (через печать) ===
  const exportPDF = () => {
    const report = document.getElementById('finance-report')
    if (!report) return

    const win = window.open('', 'PRINT', 'width=900,height=650')
    if (!win) return

    win.document.write(`
      <html>
      <head>
        <title>Finansų ataskaita</title>
        <style>
          body {
            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            padding: 24px;
            color: #111827;
          }
          h1 { font-size: 22px; margin-bottom: 4px; }
          h2 { font-size: 16px; margin: 16px 0 8px; }
          .summary {
            display: flex;
            gap: 12px;
            margin-top: 8px;
            margin-bottom: 12px;
          }
          .card {
            flex: 1;
            border-radius: 12px;
            border: 1px solid #e5e7eb;
            padding: 10px 12px;
            font-size: 12px;
          }
          .card-title {
            text-transform: uppercase;
            font-size: 11px;
            color: #6b7280;
            margin-bottom: 4px;
          }
          .card-value {
            font-weight: 600;
            font-size: 16px;
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
          }
          th {
            background: #f3f4f6;
            text-align: left;
          }
          .source {
            font-size: 11px;
            color: #6b7280;
          }
        </style>
      </head>
      <body>
        ${report.innerHTML}
      </body>
      </html>
    `)

    win.document.close()
    win.focus()
    win.print()
    win.close()
  }

  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1]

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6 text-white">
      {/* ШАПКА + ФИЛЬТРЫ */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold">Finansų panelė</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Pajamos iš sistemos + rankiniai įrašai, automatinės išlaidos (30%) ir PDF ataskaita.
          </p>
        </div>

        <div className="flex gap-2">
          <select
            className="bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm"
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
          >
            {MONTHS.map((m, idx) => (
              <option key={m} value={idx}>
                {m}
              </option>
            ))}
          </select>

          <select
            className="bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* КАРТОЧКИ С ЦИФРАМИ */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-zinc-900 border border-emerald-500/40 p-4">
          <p className="text-xs uppercase text-emerald-300">Sistema</p>
          <p className="text-2xl font-semibold mt-1">€{systemIncomeTotal.toFixed(2)}</p>
          <p className="text-xs text-zinc-400 mt-1">Pajamos iš užbaigtų ir apmokėtų įrašų</p>
        </div>

        <div className="rounded-2xl bg-zinc-900 border border-sky-500/40 p-4">
          <p className="text-xs uppercase text-sky-300">Rankiniai įrašai</p>
          <p className="text-2xl font-semibold mt-1">€{manualIncomeTotal.toFixed(2)}</p>
          <p className="text-xs text-zinc-400 mt-1">Papildomos pajamos, pridėtos ranka</p>
        </div>

        <div className="rounded-2xl bg-zinc-900 border border-amber-500/40 p-4">
          <p className="text-xs uppercase text-amber-300">Išlaidos (30%)</p>
          <p className="text-2xl font-semibold mt-1">€{totalExpense.toFixed(2)}</p>
          <p className="text-xs text-zinc-400 mt-1">Automatiškai skaičiuojama nuo visų pajamų</p>
        </div>

        <div className="rounded-2xl bg-zinc-900 border border-indigo-500/40 p-4">
          <p className="text-xs uppercase text-indigo-300">Balansas</p>
          <p className="text-2xl font-semibold mt-1">€{balance.toFixed(2)}</p>
          <p className="text-xs text-zinc-400 mt-1">Pajamos minus 30% išlaidų</p>
        </div>
      </div>

      {/* БЛОК ДОБАВЛЕНИЯ РУЧНЫХ ЗАПИСЕЙ */}
      <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-4 md:p-5 space-y-4">
        <h2 className="text-xl font-semibold">Pridėti rankinį įrašą</h2>

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
            value={formDesc}
            onChange={(e) => setFormDesc(e.target.value)}
          />
          <button
            onClick={addManual}
            className="bg-gradient-to-r from-purple-500 to-indigo-500 rounded-xl px-4 py-2 text-sm font-semibold hover:brightness-110"
          >
            Pridėti
          </button>
        </div>

        <p className="text-xs text-zinc-500">
          Sistemos pajamos skaičiuojamos automatiškai iš užbaigtų ir apmokėtų įrašų. Čia galite pridėti papildomų pajamų.
        </p>
      </div>

      {/* ИСТОРИЯ + PDF ОТЧЁТ */}
      <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-4 md:p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">Istorija</h2>
          <button
            onClick={exportPDF}
            className="bg-gradient-to-r from-fuchsia-500 to-indigo-500 rounded-xl px-4 py-2 text-sm font-semibold hover:brightness-110"
          >
            📄 Eksportuoti PDF
          </button>
        </div>

        {/* Всё, что внутри этого блока, попадает в PDF */}
        <div id="finance-report" className="bg-white text-black p-4 rounded-xl">
          <h1>
            Finansų ataskaita — {MONTHS[month]} {year}
          </h1>

          <div className="summary flex flex-col md:flex-row gap-3 mt-2 mb-3">
            <div className="card bg-white border border-gray-200 rounded-xl p-3 flex-1">
              <div className="card-title text-xs uppercase text-gray-500">
                Sistema
              </div>
              <div className="card-value text-lg font-semibold">
                €{systemIncomeTotal.toFixed(2)}
              </div>
            </div>
            <div className="card bg-white border border-gray-200 rounded-xl p-3 flex-1">
              <div className="card-title text-xs uppercase text-gray-500">
                Rankiniai
              </div>
              <div className="card-value text-lg font-semibold">
                €{manualIncomeTotal.toFixed(2)}
              </div>
            </div>
            <div className="card bg-white border border-gray-200 rounded-xl p-3 flex-1">
              <div className="card-title text-xs uppercase text-gray-500">
                Išlaidos (30%)
              </div>
              <div className="card-value text-lg font-semibold">
                €{totalExpense.toFixed(2)}
              </div>
            </div>
            <div className="card bg-white border border-gray-200 rounded-xl p-3 flex-1">
              <div className="card-title text-xs uppercase text-gray-500">
                Balansas
              </div>
              <div className="card-value text-lg font-semibold">
                €{balance.toFixed(2)}
              </div>
            </div>
          </div>

          <h2 className="mt-4 mb-2 text-base font-semibold">Įrašų sąrašas</h2>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                <th className="border border-gray-200 px-2 py-1 text-left">Data</th>
                <th className="border border-gray-200 px-2 py-1 text-left">Suma (€)</th>
                <th className="border border-gray-200 px-2 py-1 text-left">Aprašymas</th>
                <th className="border border-gray-200 px-2 py-1 text-left">Šaltinis</th>
              </tr>
            </thead>
            <tbody>
              {combinedItems.map((item) => (
                <tr key={item.id}>
                  <td className="border border-gray-200 px-2 py-1">{item.date}</td>
                  <td className="border border-gray-200 px-2 py-1">
                    €{item.amount.toFixed(2)}
                  </td>
                  <td className="border border-gray-200 px-2 py-1">
                    {item.description}
                  </td>
                  <td className="border border-gray-200 px-2 py-1">
                    {item.sourceLabel}
                  </td>
                </tr>
              ))}
              {!combinedItems.length && (
                <tr>
                  <td
                    colSpan={4}
                    className="border border-gray-200 px-2 py-3 text-center text-gray-500"
                  >
                    Nėra įrašų šiam laikotarpiui
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Отдельная таблица в интерфейсе с возможностью редактировать ручные */}
        {manualItemsForPeriod.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-semibold mb-2">Rankiniai įrašai (redaguojami)</h3>
            <div className="space-y-2">
              {manualItemsForPeriod.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col md:flex-row md:items-center justify-between gap-2 border border-zinc-800 rounded-xl px-3 py-2"
                >
                  <div>
                    <div className="text-xs text-zinc-400">{item.date}</div>
                    {editingId === item.id ? (
                      <input
                        className="mt-1 bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-sm w-full md:w-64"
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                      />
                    ) : (
                      <div className="text-sm">{item.description}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {editingId === item.id ? (
                      <>
                        <input
                          type="number"
                          className="bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-sm w-24"
                          value={editAmount}
                          onChange={(e) => setEditAmount(e.target.value)}
                        />
                        <button
                          className="bg-emerald-600 hover:bg-emerald-500 rounded px-3 py-1 text-xs font-semibold"
                          onClick={saveEdit}
                        >
                          Сохранить
                        </button>
                        <button
                          className="bg-zinc-700 hover:bg-zinc-600 rounded px-3 py-1 text-xs"
                          onClick={() => setEditingId(null)}
                        >
                          Отмена
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="text-sm font-semibold">
                          €{item.amount.toFixed(2)}
                        </div>
                        <button
                          className="bg-zinc-800 hover:bg-zinc-700 rounded px-3 py-1 text-xs"
                          onClick={() => startEdit(item)}
                        >
                          Ред.
                        </button>
                        <button
                          className="bg-rose-700 hover:bg-rose-600 rounded px-3 py-1 text-xs"
                          onClick={() => deleteManual(item.id)}
                        >
                          ✕
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
