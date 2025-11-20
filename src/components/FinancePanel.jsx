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
  const [excludedIds, setExcludedIds] = useState([])

  // форма ручного ввода
  const [formDate, setFormDate] = useState(now.toISOString().slice(0, 10))
  const [formAmount, setFormAmount] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formTimeFrom, setFormTimeFrom] = useState('')
  const [formTimeTo, setFormTimeTo] = useState('')

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

        // учитываем только неотменённые и оплаченные
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
  }, [rangeStart, rangeEnd, excludedIds])

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
          timeDisplay: e.time || '—',
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

  // ===== группировка по дате для PDF =====
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

    const time =
      formTimeFrom && formTimeTo
        ? `${formTimeFrom} – ${formTimeTo}`
        : formTimeFrom || formTimeTo || ''

    const entry = {
      id: Date.now(),
      date: formDate,
      amount,
      description: formDesc || 'Rankinė pajamų įmoka',
      time
    }

    setManualEntries((prev) => [entry, ...prev])
    setFormAmount('')
    setFormDesc('')
    setFormTimeFrom('')
    setFormTimeTo('')
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

  // редактирование ручного из таблицы (через prompt)
  const editFromRow = (item) => {
    if (item.type !== 'manual') return
    const manualId = item.manualId
    const entry = manualEntries.find((e) => e.id === manualId)
    if (!entry) return

    const newDesc = window.prompt('Aprašymas:', entry.description || '')
    if (newDesc === null) return

    const newAmountStr = window.prompt('Suma €:', String(entry.amount))
    if (newAmountStr === null) return
    const newAmount = Number(newAmountStr)
    if (!newAmount || newAmount <= 0) return

    const newTime = window.prompt(
      'Laikas (pvz. 04:00 – 13:00):',
      entry.time || ''
    )
    if (newTime === null) return

    setManualEntries((prev) =>
      prev.map((e) =>
        e.id === manualId
          ? { ...e, description: newDesc, amount: newAmount, time: newTime }
          : e
      )
    )
  }

  // ===== красивые теги (как в Admin), но под стиль «пилюль» =====
  const renderTags = (tags, type) => {
    if (!tags || !tags.length) {
      if (type === 'manual') {
        return (
          <span className="inline-flex items-center rounded-full border border-pink-400/70 bg-pink-500/20 px-3 py-0.5 text-[11px] text-pink-100 whitespace-nowrap">
            ranka
          </span>
        )
      }
      return null
    }

    const colorMap = {
      Atvykimas: 'border-rose-400/80 text-rose-100 bg-rose-500/20',
      'Papuošalų nuoma': 'border-amber-400/80 text-amber-100 bg-amber-500/20',
      'Tresų nuoma': 'border-sky-400/80 text-sky-100 bg-sky-500/20',
      Šukuosena: 'border-indigo-400/80 text-indigo-100 bg-indigo-500/20',
      Konsultacija: 'border-emerald-400/80 text-emerald-100 bg-emerald-500/20'
    }

    return tags.map((t) => {
      const base =
        colorMap[t] ||
        'border-fuchsia-400/80 text-fuchsia-100 bg-fuchsia-500/20'
      return (
        <span
          key={t}
          className={`inline-flex items-center rounded-full px-3 py-0.5 text-[11px] ${base} whitespace-nowrap`}
        >
          {t}
        </span>
      )
    })
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
      border: 1px solid rgba(236,72,153,0.7);
      background:
        radial-gradient(circle at top left, rgba(236,72,153,0.25), transparent 55%),
        radial-gradient(circle at bottom right, rgba(139,92,246,0.2), transparent 60%),
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

  const pillBase =
    'inline-flex items-center rounded-full px-4 py-1.5 text-[11px] md:text-xs whitespace-nowrap'

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6 text-slate-50">
      {/* ===== Верх: заголовок + фильтры + большой экспорт ===== */}
      <div className="space-y-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
              Finansų panelė
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Pajamos iš sistemos ir rankinių įrašų, automatinės išlaidos (30%)
              ir PDF ataskaita.
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Laikotarpis:{' '}
              <span className="font-medium text-slate-200">{rangeLabel}</span>
            </p>
          </div>

          <div className="flex flex-col gap-2 md:items-end">
            {/* режим */}
            <div className="flex gap-1 rounded-2xl border border-slate-700 bg-slate-950/80 px-1 py-1 text-[11px] md:text-xs">
              <button
                type="button"
                onClick={() => setMode('month')}
                className={`rounded-xl px-3 py-1.5 ${
                  mode === 'month'
                    ? 'bg-slate-100 text-slate-900 font-semibold'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                Mėnuo
              </button>
              <button
                type="button"
                onClick={() => setMode('year')}
                className={`rounded-xl px-3 py-1.5 ${
                  mode === 'year'
                    ? 'bg-slate-100 text-slate-900 font-semibold'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                Metai
              </button>
              <button
                type="button"
                onClick={() => setMode('range')}
                className={`rounded-xl px-3 py-1.5 ${
                  mode === 'range'
                    ? 'bg-slate-100 text-slate-900 font-semibold'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                Laikotarpis
              </button>
            </div>

            {/* конкретные контролы периода */}
            {mode === 'month' && (
              <div className="flex gap-2">
                <select
                  className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs"
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
                  className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs"
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
                  className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs"
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
                  className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs"
                  value={rangeFrom}
                  onChange={(e) => setRangeFrom(e.target.value)}
                />
                <input
                  type="date"
                  className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs"
                  value={rangeTo}
                  onChange={(e) => setRangeTo(e.target.value)}
                />
              </div>
            )}
          </div>
        </div>

        {/* большая фиолетовая полоса с PDF */}
        <button
          onClick={exportPDF}
          className="flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-[#5b21ff] via-[#6d28d9] to-[#8b5cf6] py-2 text-sm font-medium shadow-[0_10px_40px_rgba(88,28,135,0.8)] hover:brightness-110"
        >
          <span className="mr-2 text-base">📄</span>
          Eksportuoti PDF
        </button>

        {/* текстовая сводка, как на первом скрине */}
        <div className="grid grid-cols-2 gap-y-1 gap-x-8 text-xs md:grid-cols-4">
          <div>
            <div className="font-semibold">Sistema</div>
            <div>€{systemIncomeTotal.toFixed(2)}</div>
            <div className="text-slate-400">Užbaigtos ir apmokėtos rezervacijos</div>
          </div>
          <div>
            <div className="font-semibold">Rankiniai</div>
            <div>€{manualIncomeTotal.toFixed(2)}</div>
            <div className="text-slate-400">Papildomi rankiniai įrašai</div>
          </div>
          <div>
            <div className="font-semibold">Išlaidos (30%)</div>
            <div>€{totalExpense.toFixed(2)}</div>
            <div className="text-slate-400">Automatinės išlaidos nuo pajamų</div>
          </div>
          <div>
            <div className="font-semibold">Balansas</div>
            <div>€{balance.toFixed(2)}</div>
            <div className="text-slate-400">Pajamos minus 30% išlaidų</div>
          </div>
        </div>
      </div>

      {/* ===== Ручной ввод ===== */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Pridėti rankinį įrašą</h2>
        <p className="text-xs text-slate-400">
          Pvz. grynieji ar papildomos paslaugos.
        </p>

        <div className="grid gap-3 md:grid-cols-5">
          <div className="flex items-center rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm">
            <input
              type="date"
              className="w-full bg-transparent text-sm outline-none"
              value={formDate}
              onChange={(e) => setFormDate(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-950 px-3 py-3 text-sm">
            <input
              type="time"
              className="flex-1 bg-transparent text-sm outline-none"
              value={formTimeFrom}
              onChange={(e) => setFormTimeFrom(e.target.value)}
            />
            <span className="text-xs text-slate-500">–</span>
            <input
              type="time"
              className="flex-1 bg-transparent text-sm outline-none"
              value={formTimeTo}
              onChange={(e) => setFormTimeTo(e.target.value)}
            />
          </div>

          <div className="flex items-center rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm">
            <input
              type="number"
              className="w-full bg-transparent text-sm outline-none"
              placeholder="Suma €"
              value={formAmount}
              onChange={(e) => setFormAmount(e.target.value)}
            />
          </div>

          <div className="flex items-center rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm">
            <input
              type="text"
              className="w-full bg-transparent text-sm outline-none"
              placeholder="Aprašymas"
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
            />
          </div>

          <button
            onClick={addManual}
            className="rounded-2xl bg-gradient-to-br from-[#5b21ff] via-[#6d28d9] to-[#8b5cf6] text-sm font-medium shadow-[0_10px_40px_rgba(88,28,135,0.8)] hover:brightness-110"
          >
            Pridėti
          </button>
        </div>
      </div>

      {/* ===== История (строки-пилюли, как на твоём скрине) ===== */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Istorija</h2>
        <p className="text-xs text-slate-400">
          Visi įrašai pagal pasirinktą laikotarpį.
        </p>

        {combinedItems.length === 0 && (
          <div className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-center text-xs text-slate-400">
            Nėra įrašų šiam laikotarpiui
          </div>
        )}

        <div className="space-y-2">
          {combinedItems.map((item) => (
            <div
              key={item.id}
              className="flex flex-wrap items-center gap-2 rounded-2xl border border-violet-700/70 bg-slate-950/90 px-3 py-2 shadow-[0_10px_30px_rgba(15,23,42,0.9)]"
            >
              {/* левая часть: дата + время + теги/описание */}
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                <span
                  className={`${pillBase} bg-[#1e1235] border border-violet-500/60 font-semibold`}
                >
                  {item.dateDisplay}
                </span>

                <span
                  className={`${pillBase} bg-[#1e1235] border border-violet-500/40 text-slate-100`}
                >
                  {item.timeDisplay}
                </span>

                {item.type === 'system' ? (
                  <div className="flex flex-wrap gap-1">
                    {renderTags(item.tags, item.type)}
                  </div>
                ) : (
                  <span className={`${pillBase} bg-pink-900/40 border border-pink-500/70 text-pink-50 max-w-full truncate`}>
                    {item.description || 'Rankinis įrašas'}
                  </span>
                )}
              </div>

              {/* правая часть: сумма, номер, кнопки */}
              <div className="flex items-center gap-2">
                {item.type === 'system' && item.receiptNumber && (
                  <span
                    className={`${pillBase} bg-[#1e1235] border border-slate-600 text-[10px] md:text-[11px] px-3`}
                  >
                    #{item.receiptNumber}
                  </span>
                )}

                <span
                  className={`${pillBase} bg-emerald-900/40 border border-emerald-500/70 font-semibold text-emerald-100 px-3`}
                >
                  €{item.amount.toFixed(2)}
                </span>

                {/* кнопки действий */}
                <div className="flex items-center gap-1">
                  {item.type === 'system' && (
                    <button
                      className="flex h-7 w-7 items-center justify-center rounded-xl border border-slate-600 bg-[#2a1746] text-xs hover:bg-[#3a2360]"
                      title="Kvitas"
                      onClick={() => downloadReceipt(item)}
                    >
                      🧾
                    </button>
                  )}

                  {item.type === 'manual' && (
                    <button
                      className="flex h-7 w-7 items-center justify-center rounded-xl border border-sky-500/70 bg-sky-900/40 text-xs hover:bg-sky-900/70"
                      title="Redaguoti"
                      onClick={() => editFromRow(item)}
                    >
                      ✎
                    </button>
                  )}

                  <button
                    className="flex h-7 w-7 items-center justify-center rounded-xl border border-rose-500/70 bg-rose-900/40 text-xs hover:bg-rose-900/70"
                    title="Ištrinti"
                    onClick={() => deleteItem(item)}
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
