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

        // ВАЖНО: теперь учитываем и будущие оплаченные даты (avansai),
        // поэтому не отсекаем по "end > now"
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
        'Ištrinti šį įrašą iš finansų суvestinės? (rezervacija neliečiama)'
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

  // редактирование ручной записи из таблицы (через prompt — простой вариант)
  const editFromTable = (item) => {
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

  // ===== красивые теги (как в Admin) =====
  const renderTags = (tags, type) => {
    if (!tags || !tags.length) {
      if (type === 'manual') {
        return (
          <span className="inline-flex items-center rounded-full border border-pink-400/70 bg-pink-500/15 px-3 py-0.5 text-xs text-pink-100">
            ranka
          </span>
        )
      }
      return null
    }

    const colorMap = {
      Atvykimas: 'border-rose-400/80 text-rose-100 bg-rose-500/15',
      'Papuošalų nuoma': 'border-amber-400/80 text-amber-100 bg-amber-500/15',
      'Tresų nuoma': 'border-sky-400/80 text-sky-100 bg-sky-500/15',
      Šukuosena: 'border-indigo-400/80 text-indigo-100 bg-indigo-500/15',
      Konsultacija: 'border-emerald-400/80 text-emerald-100 bg-emerald-500/15'
    }

    return tags.map((t) => {
      const base =
        colorMap[t] ||
        'border-fuchsia-400/80 text-fuchsia-100 bg-fuchsia-500/15'
      return (
        <span
          key={t}
          className={`inline-flex items-center rounded-full px-3 py-0.5 text-xs ${base}`}
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

  // стили кнопок
  const primaryBtn =
    'bg-gradient-to-r from-[#ec4899] to-[#8b5cf6] text-white rounded-xl px-4 py-2 text-xs md:text-sm font-semibold hover:brightness-110'

  const smallPdfBtn =
    'inline-flex items-center gap-1 rounded-lg border border-pink-500/60 bg-zinc-900 px-3 py-1 text-[10px] md:text-xs text-pink-100 hover:bg-zinc-800'

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6 text-white">
      {/* Шапка + фильтры */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold">Finansų panelė</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Pajamos iš sistemos ir rankinių įrašų, automatinės išlaidos (30%) ir
            profesionali PDF ataskaita.
          </p>
          <p className="text-xs text-zinc-500 mt-1">
            Laikotarpis:{' '}
            <span className="text-zinc-200 font-medium">{rangeLabel}</span>
          </p>
        </div>

        <div className="flex flex-col gap-3 md:items-end w-full md:w-auto">
          {/* iOS-стиль переключателя периода */}
          <div className="w-full md:w-[360px]">
            <div className="relative bg-zinc-900/80 border border-pink-500/60 rounded-2xl p-1 shadow-[0_0_25px_rgba(236,72,153,0.35)] overflow-hidden">
              {/* бегунок */}
              <div
                className="absolute top-1 bottom-1 w-1/3 rounded-xl bg-gradient-to-r from-pink-500 via-fuchsia-500 to-violet-500 shadow-[0_0_18px_rgba(236,72,153,0.8)] transition-transform duration-300 ease-out"
                style={{
                  transform:
                    mode === 'month'
                      ? 'translateX(0%)'
                      : mode === 'year'
                      ? 'translateX(100%)'
                      : 'translateX(200%)'
                }}
              />
              {/* кнопки */}
              <div className="relative z-10 grid grid-cols-3 text-[11px] md:text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setMode('month')}
                  className={`flex flex-col items-center justify-center gap-0.5 px-2 py-2 md:py-2.5 transition-colors ${
                    mode === 'month'
                      ? 'text-white'
                      : 'text-zinc-400 hover:text-zinc-100'
                  }`}
                >
                  <span className="text-base md:text-lg">📅</span>
                  <span>Mėnuo</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMode('year')}
                  className={`flex flex-col items-center justify-center gap-0.5 px-2 py-2 md:py-2.5 transition-colors ${
                    mode === 'year'
                      ? 'text-white'
                      : 'text-zinc-400 hover:text-zinc-100'
                  }`}
                >
                  <span className="text-base md:text-lg">🕓</span>
                  <span>Metai</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMode('range')}
                  className={`flex flex-col items-center justify-center gap-0.5 px-2 py-2 md:py-2.5 transition-colors ${
                    mode === 'range'
                      ? 'text-white'
                      : 'text-zinc-400 hover:text-zinc-100'
                  }`}
                >
                  <span className="text-base md:text-lg">📆↔️</span>
                  <span>Laikotarpis</span>
                </button>
              </div>

              {/* лёгкий "shine" по бордеру */}
              <div className="pointer-events-none absolute inset-0 rounded-2xl border border-white/5 opacity-70" />
            </div>
          </div>

          {/* контролы диапазона */}
          {mode === 'month' && (
            <div className="flex gap-2 self-end">
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
            <div className="flex gap-2 self-end">
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
            <div className="flex gap-2 self-end">
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

      {/* Блок ручных записей */}
      <div className="rounded-2xl bg-gradient-to-br from-fuchsia-950/70 to-slate-950/70 border border-pink-500/40 p-4 md:p-5 space-y-4 shadow-[0_18px_50px_rgba(15,23,42,0.85)]">
        <h2 className="text-xl font-semibold">Pridėti rankinį įrašą</h2>

        <div className="grid md:grid-cols-5 gap-3">
          <input
            type="date"
            className="bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-sm"
            value={formDate}
            onChange={(e) => setFormDate(e.target.value)}
          />

          <div className="flex items-center gap-1 bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-sm">
            <input
              type="time"
              className="bg-transparent outline-none text-sm flex-1"
              value={formTimeFrom}
              onChange={(e) => setFormTimeFrom(e.target.value)}
            />
            <span className="text-zinc-500 text-xs">–</span>
            <input
              type="time"
              className="bg-transparent outline-none text-sm flex-1"
              value={formTimeTo}
              onChange={(e) => setFormTimeTo(e.target.value)}
            />
          </div>

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

      {/* История + экспорт + главная таблица */}
      <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800 p-4 md:p-5 space-y-4 shadow-[0_22px_60px_rgba(15,23,42,0.9)]">
        {/* заголовок + маленькая PDF-кнопка */}
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-semibold">Istorija</h2>
            <p className="text-xs text-zinc-400">
              VISI įrašai pagal pasirinktą laikotarpį: sistemos + rankiniai.
            </p>
          </div>
          <button onClick={exportPDF} className={smallPdfBtn}>
            <span>📄</span>
            <span>PDF</span>
          </button>
        </div>

        {/* блок, который уходит в PDF — тут только верхняя сводка */}
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

          {/* мини-карточки: Sistema / Rankiniai / Išlaidos / Balansas */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm mt-2 mb-1">
            <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-400/50 rounded-xl p-3 shadow-inner shadow-emerald-900/40">
              <div className="text-[10px] uppercase text-emerald-300 tracking-wide">
                Sistema
              </div>
              <div className="text-lg font-semibold mt-0.5">
                €{systemIncomeTotal.toFixed(2)}
              </div>
              <div className="text-[11px] text-emerald-100/80 mt-1">
                Užbaigtos ir apmokėtos rezervacijos
              </div>
            </div>
            <div className="bg-gradient-to-br from-sky-500/10 to-sky-500/5 border border-sky-400/50 rounded-xl p-3 shadow-inner shadow-sky-900/40">
              <div className="text-[10px] uppercase text-sky-300 tracking-wide">
                Rankiniai
              </div>
              <div className="text-lg font-semibold mt-0.5">
                €{manualIncomeTotal.toFixed(2)}
              </div>
              <div className="text-[11px] text-sky-100/80 mt-1">
                Papildomi rankiniai įrašai
              </div>
            </div>
            <div className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-amber-400/50 rounded-xl p-3 shadow-inner shadow-amber-900/40">
              <div className="text-[10px] uppercase text-amber-300 tracking-wide">
                Išlaidos (30%)
              </div>
              <div className="text-lg font-semibold mt-0.5">
                €{totalExpense.toFixed(2)}
              </div>
              <div className="text-[11px] text-amber-100/80 mt-1">
                Automatinės išlaidos nuo pajamų
              </div>
            </div>
            <div className="bg-gradient-to-br from-violet-500/10 to-violet-500/5 border border-violet-400/50 rounded-xl p-3 shadow-inner shadow-violet-900/40">
              <div className="text-[10px] uppercase text-violet-300 tracking-wide">
                Balansas
              </div>
              <div className="text-lg font-semibold mt-0.5">
                €{balance.toFixed(2)}
              </div>
              <div className="text-[11px] text-violet-100/80 mt-1">
                Pajamos minus 30% išlaidų
              </div>
            </div>
          </div>
        </div>

        {/* ГЛАВНАЯ ЖИВАЯ ТАБЛИЦА — каждая запись в одной строке */}
        <div className="mt-4">
          <h3 className="text-sm font-semibold mb-2">Visi įrašai (lentelė)</h3>
          {groupedByDate.length ? (
            <div className="overflow-x-auto rounded-2xl border border-pink-500/40 bg-zinc-950/80 shadow-[0_18px_55px_rgba(15,23,42,0.9)]">
              <table className="w-full text-xs md:text-sm border-separate border-spacing-y-2 border-spacing-x-0">
                <thead>
                  <tr className="text-zinc-300">
                    <th className="px-3 py-2 text-left text-[11px] md:text-xs font-semibold bg-zinc-900/90 border border-zinc-700/80 first:rounded-l-xl last:rounded-r-xl">
                      Data
                    </th>
                    <th className="px-3 py-2 text-left text-[11px] md:text-xs font-semibold bg-zinc-900/90 border border-zinc-700/80">
                      Laikas
                    </th>
                    <th className="px-3 py-2 text-left text-[11px] md:text-xs font-semibold bg-zinc-900/90 border border-zinc-700/80">
                      Paslauga
                    </th>
                    <th className="px-3 py-2 text-left text-[11px] md:text-xs font-semibold bg-zinc-900/90 border border-zinc-700/80">
                      Suma (€)
                    </th>
                    <th className="px-3 py-2 text-left text-[11px] md:text-xs font-semibold bg-zinc-900/90 border border-zinc-700/80">
                      Kvito Nr.
                    </th>
                    <th className="px-3 py-2 text-center text-[11px] md:text-xs font-semibold bg-zinc-900/90 border border-zinc-700/80 first:rounded-l-xl last:rounded-r-xl">
                      Veiksmai
                    </th>
                  </tr>
                </thead>
               <tbody className="space-y-3">

  {groupedByDate.map(group =>
    group.items.map(item => (
      <tr key={item.id} className="!block">

        {/* ОДНА СТРОКА = ОДНА СТЕКЛЯННАЯ КАРТА */}
        <div className="
          w-full flex items-center gap-3 px-3 py-3
          rounded-xl bg-[#0f0d16]/90 border border-violet-500/30
          shadow-[0_0_15px_rgba(130,80,255,0.25)]
        ">

          {/* DATE */}
          <div className="
            min-w-[130px] px-4 py-2 rounded-lg
            border border-violet-400/40 bg-[#1a1525]/70
            text-[13px] font-semibold text-zinc-100 text-center
          ">
            {group.dateDisplay}
          </div>

          {/* TIME */}
          <div className="
            min-w-[130px] px-4 py-2 rounded-lg
            border border-violet-400/40 bg-[#1a1525]/70
            text-[13px] font-semibold text-zinc-100 text-center
          ">
            {item.timeDisplay}
          </div>

          {/* TAGS / PASLAUGA */}
          <div className="flex-1 flex flex-wrap gap-2">
            {item.type === "system"
              ? renderTags(item.tags, item.type)
              : (
                <span className="text-sm text-zinc-200">
                  {item.description || "—"}
                </span>
              )
            }
          </div>

          {/* SUMA */}
          <div className="
            min-w-[110px] px-4 py-2 rounded-lg
            border border-emerald-400/40 bg-[#102015]/70
            text-[14px] font-bold text-emerald-300 text-center
          ">
            €{item.amount.toFixed(2)}
          </div>

          {/* KVITAS */}
          <div className="
            min-w-[95px] px-4 py-2 rounded-lg
            border border-blue-400/40 bg-[#111a25]/70
            text-[12px] text-blue-300 text-center
          ">
            {item.type === 'system' && item.receiptNumber
              ? `#${item.receiptNumber}`
              : "—"
            }
          </div>

          {/* АКЦИИ (Вертикальный стек) */}
          <div className="flex flex-col gap-2">

            {item.type === "system" && (
              <button
                onClick={() => downloadReceipt(item)}
                className="
                  w-10 h-10 flex items-center justify-center
                  rounded-lg bg-gradient-to-b from-violet-400/40 to-indigo-500/40
                  border border-violet-300/40 text-white
                  hover:scale-105 transition
                ">
                🧾
              </button>
            )}

            {item.type === "manual" && (
              <button
                onClick={() => editFromTable(item)}
                className="
                  w-10 h-10 flex items-center justify-center
                  rounded-lg bg-gradient-to-b from-sky-400/40 to-blue-500/40
                  border border-sky-300/40 text-white
                  hover:scale-105 transition
                ">
                ✏️
              </button>
            )}

            <button
              onClick={() => deleteItem(item)}
              className="
                w-10 h-10 flex items-center justify-center
                rounded-lg bg-gradient-to-b from-rose-400/40 to-red-500/40
                border border-rose-300/40 text-white
                hover:scale-105 transition
              ">
              ✕
            </button>
          </div>

        </div>

      </tr>
    ))
  )}

  {!combinedItems.length && (
    <tr>
      <td
        colSpan={6}
        className="px-3 py-3 text-center text-zinc-400 bg-zinc-900/90 border border-zinc-700/80 rounded-xl"
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
