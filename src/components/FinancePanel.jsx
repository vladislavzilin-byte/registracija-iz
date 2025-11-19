import React, { useEffect, useMemo, useState } from 'react'
import { getBookings, fmtDate, fmtTime } from '../lib/storage'

const MANUAL_KEY = 'iz.finance.manual.v1'
const EXCLUDE_KEY = 'iz.finance.exclude.v1'

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

// те же условия, что в Admin / MyBookings
const isPaid = (b) => !!(b?.paid || b?.status === 'approved_paid')
const isCanceled = (b) =>
  b.status === 'canceled_client' || b.status === 'canceled_admin'

export default function FinancePanel() {
  const now = new Date()

  // режим фильтра
  const [mode, setMode] = useState('month') // 'month' | 'year' | 'range'
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [rangeFrom, setRangeFrom] = useState(
    new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  )
  const [rangeTo, setRangeTo] = useState(now.toISOString().slice(0, 10))

  const [manualEntries, setManualEntries] = useState([])
  const [excludedIds, setExcludedIds] = useState([]) // id броней, исключённых из фин.расчёта

  // форма ручного ввода
  const [formDate, setFormDate] = useState(now.toISOString().slice(0, 10))
  const [formAmount, setFormAmount] = useState('')
  const [formDesc, setFormDesc] = useState('')

  // редактирование ручных
  const [editingId, setEditingId] = useState(null)
  const [editAmount, setEditAmount] = useState('')
  const [editDesc, setEditDesc] = useState('')

  // версия бронирований для форс-обновления
  const [bookingsVersion, setBookingsVersion] = useState(0)

  // ===== загрузка / сохранение данных =====
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

    try {
      const rawEx = localStorage.getItem(EXCLUDE_KEY)
      if (rawEx) {
        const parsed = JSON.parse(rawEx)
        if (Array.isArray(parsed)) setExcludedIds(parsed)
      }
    } catch (e) {
      console.error('Cannot load excluded finance ids', e)
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(MANUAL_KEY, JSON.stringify(manualEntries))
    } catch (e) {
      console.error('Cannot save manual finance entries', e)
    }
  }, [manualEntries])

  useEffect(() => {
    try {
      localStorage.setItem(EXCLUDE_KEY, JSON.stringify(excludedIds))
    } catch (e) {
      console.error('Cannot save excluded finance ids', e)
    }
  }, [excludedIds])

  // слушаем изменения в localStorage (обновления из Admin / MyBookings)
  useEffect(() => {
    const onStorage = (e) => {
      if (!e.key || e.key === 'iz.bookings.v7') {
        setBookingsVersion((v) => v + 1)
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  // авто-refresh каждые 2 сек
  useEffect(() => {
    const id = setInterval(() => {
      setBookingsVersion((v) => v + 1)
    }, 2000)
    return () => clearInterval(id)
  }, [])

  // ===== диапазон дат по выбранному режиму =====
  const [rangeStart, rangeEnd, rangeLabel] = useMemo(() => {
    let start, end, label

    if (mode === 'month') {
      start = new Date(year, month, 1)
      end = new Date(year, month + 1, 1)
      label = `${MONTHS[month]} ${year}`
    } else if (mode === 'year') {
      start = new Date(year, 0, 1)
      end = new Date(year + 1, 0, 1)
      label = `${year} metai`
    } else {
      const from = rangeFrom ? new Date(rangeFrom) : new Date(year, month, 1)
      const to = rangeTo ? new Date(rangeTo) : now
      start = from
      end = new Date(to.getFullYear(), to.getMonth(), to.getDate() + 1)
      label = `Laikotarpis: ${rangeFrom || '…'} – ${rangeTo || '…'}`
    }

    return [start, end, label]
  }, [mode, year, month, rangeFrom, rangeTo])

  const isInRange = (d) => d >= rangeStart && d < rangeEnd

  // ===== доходы из бронирований (системные) =====
  const systemIncomeItems = useMemo(() => {
    const allBookings = getBookings()

    return allBookings
      .filter((b) => {
        const end = new Date(b.end)
        if (end > new Date()) return false // учитывать только завершённые
        if (isCanceled(b)) return false
        if (!isPaid(b)) return false
        if (excludedIds.includes(b.id)) return false
        if (!isInRange(end)) return false
        return true
      })
      .map((b) => {
        const end = new Date(b.end)
        const dateISO = end.toISOString().slice(0, 10)

        const dateDisplay = fmtDate(b.start)
        const timeDisplay = `${fmtTime(b.start)} – ${fmtTime(b.end)}`
        const amount = Number(b.price) || 0
        const services = Array.isArray(b.services) ? b.services : []

        const hasAtvykimas = services.includes('Atvykimas')

        return {
          id: `sys-${b.id}`,
          type: 'system',
          bookingId: b.id,
          booking: b,
          receiptNumber: String(b.id).slice(0, 6),
          date: dateISO,
          dateDisplay,
          timeDisplay,
          amount,
          description: services.join(', ') || 'Sisteminė pajamų įmoka',
          tags: services,
          tagType: hasAtvykimas ? 'atvykimas' : 'system'
        }
      })
  }, [bookingsVersion, rangeStart, rangeEnd, excludedIds])

  const systemIncomeTotal = systemIncomeItems.reduce(
    (sum, item) => sum + item.amount,
    0
  )

  // ===== ручные доходы =====
  const manualItemsForPeriod = useMemo(
    () =>
      manualEntries
        .map((e) => ({
          ...e,
          date: e.date,
          dateDisplay: e.date,
          timeDisplay: '—',
          tags: ['ranka'],
          type: 'manual'
        }))
        .filter((e) => isInRange(new Date(e.date))),
    [manualEntries, rangeStart, rangeEnd]
  )

  const manualIncomeTotal = manualItemsForPeriod.reduce(
    (sum, item) => sum + item.amount,
    0
  )

  // ===== общие суммы =====
  const totalIncome = systemIncomeTotal + manualIncomeTotal
  const totalExpense = totalIncome * 0.3
  const balance = totalIncome - totalExpense

  // ===== объединённый список для UI / PDF =====
  const combinedItems = useMemo(() => {
    const manualMapped = manualItemsForPeriod.map((e) => ({
      id: `man-${e.id}`,
      manualId: e.id,
      type: 'manual',
      bookingId: null,
      booking: null,
      receiptNumber: null,
      date: e.date,
      dateDisplay: e.dateDisplay,
      timeDisplay: e.timeDisplay,
      amount: e.amount,
      description: e.description,
      tags: e.tags
    }))

    const all = [...systemIncomeItems, ...manualMapped]
    return all.sort((a, b) => (a.date > b.date ? 1 : a.date < b.date ? -1 : 0))
  }, [systemIncomeItems, manualItemsForPeriod])

  // ===== группировка по дате для UI / PDF =====
  const groupedByDate = useMemo(() => {
    const map = {}
    combinedItems.forEach((item) => {
      const key = item.date
      if (!map[key]) {
        map[key] = {
          date: key,
          dateDisplay: item.dateDisplay,
          items: []
        }
      }
      map[key].items.push(item)
    })
    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date))
  }, [combinedItems])

  // ===== добавить ручную запись =====
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

  // ===== редактирование / удаление ручных =====
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
    setManualEntries((prev) => prev.filter((e) => e.id !== id))
  }

  const deleteItem = (item) => {
    if (
      !window.confirm(
        'Ištrinti šį įrašą iš finansų suvestinės? (rezervacija neliečiama)'
      )
    )
      return

    if (item.type === 'system') {
      setExcludedIds((prev) =>
        prev.includes(item.bookingId) ? prev : [...prev, item.bookingId]
      )
    } else {
      deleteManual(item.manualId || item.id)
    }
  }

  // редактирование из главной таблицы
  const editFromTable = (item) => {
    if (item.type !== 'manual') return
    const manualId = item.manualId
    const entry = manualEntries.find((e) => e.id === manualId)
    if (!entry) return
    setEditingId(entry.id)
    setEditAmount(String(entry.amount))
    setEditDesc(entry.description)
  }

  // ===== Kvitas по брони =====
  const downloadReceipt = (item) => {
    if (!item.booking) return
    const b = item.booking
    const shortId = String(b.id).slice(0, 6)

    const dateStr = fmtDate(b.start)
    const timeStr = `${fmtTime(b.start)} – ${fmtTime(b.end)}`
    const servicesStr = (b.services || []).join(', ') || '—'
    const amount = Number(b.price) || item.amount || 0

    const win = window.open('', '_blank', 'width=720,height=900')
    if (!win) return

    const html = `<!doctype html>
<html>
<head>
  <meta charSet="utf-8" />
  <title>Kvitas #${shortId}</title>
  <style>
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: radial-gradient(circle at top,#4c1d95 0,#020617 55%);
      color: #f9fafb;
      margin: 0;
      padding: 24px;
    }
    .wrap {
      max-width: 640px;
      margin: 0 auto;
      border-radius: 18px;
      border: 1px solid rgba(168,85,247,0.7);
      background:
        radial-gradient(circle at top left, rgba(168,85,247,0.25), transparent 55%),
        radial-gradient(circle at bottom right, rgba(59,130,246,0.2), transparent 60%),
        rgba(15,23,42,0.96);
      padding: 24px 28px 28px;
      box-shadow: 0 22px 60px rgba(15,23,42,0.9);
    }
    h1 {
      margin: 0 0 8px;
      font-size: 22px;
      font-weight: 700;
    }
    .row {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      margin: 4px 0;
      font-size: 14px;
    }
    .label {
      opacity: 0.8;
    }
    .value {
      font-weight: 500;
      text-align: right;
    }
    .section {
      margin-top: 14px;
      padding-top: 10px;
      border-top: 1px dashed rgba(148,163,184,0.5);
    }
    .footer {
      margin-top: 20px;
      font-size: 11px;
      opacity: 0.8;
      line-height: 1.6;
    }
  </style>
</head>
<body>
  <div class="wrap">
    <h1>Kvitas #${shortId}</h1>

    <div class="section">
      <div class="row">
        <div class="label">Data:</div>
        <div class="value">${dateStr}</div>
      </div>
      <div class="row">
        <div class="label">Laikas:</div>
        <div class="value">${timeStr}</div>
      </div>
      <div class="row">
        <div class="label">Paslaugos:</div>
        <div class="value">${servicesStr}</div>
      </div>
    </div>

    <div class="section">
      <div class="row">
        <div class="label">Suma:</div>
        <div class="value">${amount.toFixed(2)} €</div>
      </div>
    </div>

    <div class="footer">
      Šis kvitas sugeneruotas automatiškai ir galioja be parašo.
      Jei reikia, galite jį išsaugoti kaip PDF: naršyklėje pasirinkite
      „Spausdinti“ → „Išsaugoti kaip PDF“.
    </div>
  </div>

  <script>
    window.focus();
    setTimeout(function(){ window.print(); }, 400);
  </script>
</body>
</html>`

    win.document.open()
    win.document.write(html)
    win.document.close()
  }

  // ===== экспорт в PDF (описание + таблица) =====
  const exportPDF = () => {
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
            background: #e5e7eb;
            color: #0f172a;
          }
          .shell {
            max-width: 900px;
            margin: 0 auto;
            background: #f9fafb;
            border-radius: 18px;
            border: 1px solid #d1d5db;
            box-shadow: 0 18px 50px rgba(15,23,42,0.25);
            overflow: hidden;
          }
          .header {
            padding: 18px 22px;
            background: linear-gradient(135deg,#4c1d95,#6d28d9);
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
            opacity: 0.8;
            font-size: 12px;
          }
          .logo {
            display:flex;
            flex-direction:column;
            align-items:flex-end;
            gap:4px;
            font-size:12px;
          }
          .content {
            padding: 16px 20px 20px;
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
            padding: 8px 10px;
            font-size: 12px;
            background: #f9fafb;
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
            margin-top: 8px;
            font-size: 12px;
          }
          th, td {
            border: 1px solid #e5e7eb;
            padding: 6px 8px;
          }
          th {
            background: #eef2ff;
            text-align: left;
          }
          tbody tr:nth-child(even) {
            background: #f3f4ff;
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
              <b>IZ HAIR TREND</b>
              <span>Finansų suvestinė</span>
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
                <div class="card-value">€${systemIncomeTotal.toFixed(2)}</div>
              </div>
              <div class="card">
                <div class="card-title">Rankiniai</div>
                <div class="card-value">€${manualIncomeTotal.toFixed(2)}</div>
              </div>
              <div class="card">
                <div class="card-title">Išlaidos (30%)</div>
                <div class="card-value">€${totalExpense.toFixed(2)}</div>
              </div>
              <div class="card">
                <div class="card-title">Balansas</div>
                <div class="card-value">€${balance.toFixed(2)}</div>
              </div>
            </div>

            <h2 style="margin:10px 0 6px;font-size:14px;">Įrašų sąrašas</h2>
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Laikas</th>
                  <th>Paslauga</th>
                  <th>Suma (€)</th>
                  <th>Kvito Nr.</th>
                  <th>Žymos</th>
                </tr>
              </thead>
              <tbody>
                ${groupedByDate
                  .map((group) =>
                    group.items
                      .map((item, idx) => {
                        const tagsStr = (item.tags || []).join(', ')
                        const kv =
                          item.type === 'system' ? item.receiptNumber || '' : ''
                        const dateCell = idx === 0 ? group.dateDisplay : ''
                        return `<tr>
                          <td>${dateCell}</td>
                          <td>${item.timeDisplay}</td>
                          <td>${item.description || ''}</td>
                          <td>€${item.amount.toFixed(2)}</td>
                          <td>${kv ? '#' + kv : ''}</td>
                          <td>${tagsStr}</td>
                        </tr>`
                      })
                      .join('')
                  )
                  .join('')}
                ${
                  !combinedItems.length
                    ? `<tr><td colspan="6" style="text-align:center;color:#9ca3af;padding:8px;">Nėra įrašų šiam laikotarpiui</td></tr>`
                    : ''
                }
              </tbody>
            </table>
          </div>
        </div>
      </body>
      </html>
    `)

    win.document.close()
    win.focus()
    win.print()
    win.close()
  }

  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1]

  // ===== UI =====

  const primaryBtn =
    'bg-gradient-to-r from-[#6d28d9] to-[#4c1d95] text-white rounded-xl px-4 py-2 text-xs md:text-sm font-semibold hover:brightness-110'

  const modeBtn = (active) =>
    'px-4 py-2 text-xs md:text-sm rounded-lg border transition min-w-[100px] text-center ' +
    (active
      ? 'bg-gradient-to-r from-[#6d28d9] to-[#4c1d95] border-purple-400 text-white shadow-sm'
      : 'bg-transparent border-purple-500/40 text-zinc-300 hover:bg-zinc-900')

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6 text-white">
      {/* Шапка + фильтры */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold">Finansų panelė</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Pajamos iš sistemos ir rankinių įrašų, automatinės išlaidos (30%) ir
            profesionali PDF ataskaita.
          </p>
          <p className="text-xs text-zinc-500 mt-1">
            Laikotarpis: <span className="text-zinc-200">{rangeLabel}</span>
          </p>
        </div>

        <div className="flex flex-col gap-2 md:items-end w-full md:w-auto">
          {/* фильтры диапазона */}
          <div className="flex gap-2 self-end rounded-xl bg-zinc-900 border border-purple-500/40 p-1 text-xs">
            <button
              className={modeBtn(mode === 'month')}
              onClick={() => setMode('month')}
            >
              Mėnuo
            </button>
            <button
              className={modeBtn(mode === 'year')}
              onClick={() => setMode('year')}
            >
              Metai
            </button>
            <button
              className={modeBtn(mode === 'range')}
              onClick={() => setMode('range')}
            >
              Laikotarpis
            </button>
          </div>

          {/* контролы диапазона */}
          {mode === 'month' && (
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
          )}

          {mode === 'year' && (
            <div className="flex gap-2">
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
          )}

          {mode === 'range' && (
            <div className="flex gap-2">
              <input
                type="date"
                className="bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs"
                value={rangeFrom}
                onChange={(e) => setRangeFrom(e.target.value)}
              />
              <input
                type="date"
                className="bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs"
                value={rangeTo}
                onChange={(e) => setRangeTo(e.target.value)}
              />
            </div>
          )}
        </div>
      </div>

      {/* Карточки сумм */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-gradient-to-br from-emerald-500/15 to-emerald-500/5 border border-emerald-400/40 p-4">
          <p className="text-xs uppercase text-emerald-300">Sistema</p>
          <p className="text-2xl font-semibold mt-1">
            €{systemIncomeTotal.toFixed(2)}
          </p>
          <p className="text-xs text-zinc-300 mt-1">
            Pajamos iš užbaigtų ir apmokėtų rezervacijų
          </p>
        </div>

        <div className="rounded-2xl bg-gradient-to-br from-sky-500/15 to-sky-500/5 border border-sky-400/40 p-4">
          <p className="text-xs uppercase text-sky-300">Rankiniai įrašai</p>
          <p className="text-2xl font-semibold mt-1">
            €{manualIncomeTotal.toFixed(2)}
          </p>
          <p className="text-xs text-zinc-300 mt-1">
            Papildomos pajamos, pridėtos ranka
          </p>
        </div>

        <div className="rounded-2xl bg-gradient-to-br from-amber-500/15 to-amber-500/5 border border-amber-400/40 p-4">
          <p className="text-xs uppercase text-amber-300">Išlaidos (30%)</p>
          <p className="text-2xl font-semibold mt-1">
            €{totalExpense.toFixed(2)}
          </p>
          <p className="text-xs text-zinc-300 mt-1">
            Automatiškai skaičiuojama nuo visų pajamų
          </p>
        </div>

        <div className="rounded-2xl bg-gradient-to-br from-indigo-500/15 to-indigo-500/5 border border-indigo-400/40 p-4">
          <p className="text-xs uppercase text-indigo-300">Balansas</p>
          <p className="text-2xl font-semibold mt-1">
            €{balance.toFixed(2)}
          </p>
          <p className="text-xs text-zinc-300 mt-1">
            Pajamos minus 30% išlaidų
          </p>
        </div>
      </div>

      {/* Таблица-сводка Sistema | Suma | Išlaidos (30%) | Uždarbis */}
      <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800 p-4">
        <h3 className="text-sm font-semibold mb-2">
          Santrauka pagal pasirinktą laikotarpį
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs md:text-sm border-collapse">
            <thead>
              <tr className="text-zinc-300">
                <th className="border border-zinc-700 px-3 py-2 text-left">
                  Sistema
                </th>
                <th className="border border-zinc-700 px-3 py-2 text-left">
                  Suma
                </th>
                <th className="border border-zinc-700 px-3 py-2 text-left">
                  Išlaidos (30%)
                </th>
                <th className="border border-zinc-700 px-3 py-2 text-left">
                  Uždarbis
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-zinc-800 px-3 py-2">
                  Sistema + rankiniai
                </td>
                <td className="border border-zinc-800 px-3 py-2">
                  €{totalIncome.toFixed(2)}
                </td>
                <td className="border border-zinc-800 px-3 py-2">
                  €{totalExpense.toFixed(2)}
                </td>
                <td className="border border-zinc-800 px-3 py-2">
                  €{balance.toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Блок ручных записей */}
      <div className="rounded-2xl bg-gradient-to-br from-purple-950/70 to-slate-950/70 border border-purple-500/30 p-4 md:p-5 space-y-4">
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
          <button onClick={addManual} className={primaryBtn}>
            Pridėti
          </button>
        </div>

        <p className="text-xs text-zinc-400">
          Sistemos pajamos imamos automatiškai iš užbaigtų ir apmokėtų
          rezervacijų. Čia galite pridėti papildomų pajamų rankiniu būdu
          (pvz. grynieji, papildomos paslaugos).
        </p>
      </div>

      {/* История + экспорт */}
      <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800 p-4 md:p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Istorija</h2>
            <p className="text-xs text-zinc-400">
              VISI įrašai pagal pasirinktą laikotarpį: sistemos + rankiniai.
            </p>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={exportPDF} className={primaryBtn}>
              📄 Eksportuoti PDF
            </button>
          </div>
        </div>

        {/* Блок-описание для PDF (только заголовок и карточки, без таблицы) */}
        <div
          id="finance-report"
          className="bg-zinc-900/90 text-white p-4 rounded-xl border border-zinc-700"
        >
          <h1 className="text-lg md:text-xl font-semibold">
            Finansų ataskaita — {rangeLabel}
          </h1>
          <p className="text-xs md:text-sm text-zinc-300 mt-1 mb-2">
            Suvestinė pagal pasirinktą laikotarpį: pajamos iš sistemos ir
            rankinių įrašų, automatinės išlaidos (30%) ir balansas.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm mt-2 mb-1">
            <div className="bg-zinc-900 border border-emerald-400/40 rounded-xl p-3">
              <div className="text-xs uppercase text-emerald-300">Sistema</div>
              <div className="text-lg font-semibold">
                €{systemIncomeTotal.toFixed(2)}
              </div>
            </div>
            <div className="bg-zinc-900 border border-sky-400/40 rounded-xl p-3">
              <div className="text-xs uppercase text-sky-300">Rankiniai</div>
              <div className="text-lg font-semibold">
                €{manualIncomeTotal.toFixed(2)}
              </div>
            </div>
            <div className="bg-zinc-900 border border-amber-400/40 rounded-xl p-3">
              <div className="text-xs uppercase text-amber-300">
                Išlaidos (30%)
              </div>
              <div className="text-lg font-semibold">
                €{totalExpense.toFixed(2)}
              </div>
            </div>
            <div className="bg-zinc-900 border border-indigo-400/40 rounded-xl p-3">
              <div className="text-xs uppercase text-indigo-300">Balansas</div>
              <div className="text-lg font-semibold">
                €{balance.toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        {/* ГЛАВНАЯ ЖИВАЯ ТАБЛИЦА (вариант B, без Žymos) */}
        <div className="mt-4">
          <h3 className="text-sm font-semibold mb-2">Visi įrašai (lentelė)</h3>
          {groupedByDate.length ? (
            <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950/60">
              <table className="w-full text-xs md:text-sm border-collapse">
                <thead>
                  <tr className="bg-zinc-900 text-zinc-300">
                    <th className="border-b border-zinc-700 px-3 py-2 text-left">
                      Data
                    </th>
                    <th className="border-b border-zinc-700 px-3 py-2 text-left">
                      Laikas
                    </th>
                    <th className="border-b border-zinc-700 px-3 py-2 text-left">
                      Paslauga
                    </th>
                    <th className="border-b border-zinc-700 px-3 py-2 text-left">
                      Suma (€)
                    </th>
                    <th className="border-b border-zinc-700 px-3 py-2 text-left">
                      Kvito Nr.
                    </th>
                    <th className="border-b border-zinc-700 px-3 py-2 text-center">
                      Veiksmai
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {groupedByDate.map((group) =>
                    group.items.map((item, idx) => (
                      <tr
                        key={item.id}
                        className="border-t border-zinc-800 hover:bg-zinc-900/70"
                      >
                        <td className="px-3 py-2 align-top">
                          {idx === 0 ? group.dateDisplay : ''}
                        </td>
                        <td className="px-3 py-2 align-top">
                          {item.timeDisplay}
                        </td>
                        <td className="px-3 py-2 align-top">
                          {item.description || '—'}
                        </td>
                        <td className="px-3 py-2 align-top font-semibold">
                          €{item.amount.toFixed(2)}
                        </td>
                        <td className="px-3 py-2 align-top text-xs">
                          {item.type === 'system' && item.receiptNumber
                            ? `#${item.receiptNumber}`
                            : '—'}
                        </td>
                        <td className="px-3 py-2 align-top">
                          <div className="flex items-center justify-center gap-2">
                            {item.type === 'system' && (
                              <button
                                className="text-indigo-300 hover:text-indigo-400"
                                title="Kvitas"
                                onClick={() => downloadReceipt(item)}
                              >
                                🧾
                              </button>
                            )}

                            {item.type === 'manual' && (
                              <button
                                className="text-sky-300 hover:text-sky-400"
                                title="Redaguoti"
                                onClick={() => editFromTable(item)}
                              >
                                <svg
                                  width="18"
                                  height="18"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M12 20h9" />
                                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                                </svg>
                              </button>
                            )}

                            <button
                              className="text-rose-300 hover:text-rose-400"
                              title="Ištrinti"
                              onClick={() => deleteItem(item)}
                            >
                              <svg
                                width="18"
                                height="18"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m5 0V4a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v2" />
                                <line x1="10" y1="11" x2="10" y2="17" />
                                <line x1="14" y1="11" x2="14" y2="17" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                  {!combinedItems.length && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-3 py-3 text-center text-zinc-400 border-t border-zinc-800 bg-zinc-950"
                      >
                        Nėra įrašų šiam laikotarpiui
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-xs text-center text-zinc-400 py-2">
              Nėra įrašų šiam laikotarpiui
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
