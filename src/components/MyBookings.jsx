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
