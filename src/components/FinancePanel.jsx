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

        // ВАЖНО: учитываем и будущие оплаченные (avansai)
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

  // редактирование ручного из списка (через prompt)
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

  // ===== красивые теги (как в Admin, под «пилюли» из скрина) =====
  const renderTags = (tags, type) => {
    if (!tags || !tags.length) {
      if (type === 'manual') {
        return (
          <span className="inline-flex items-center rounded-full border border-pink-400/70 bg-pink-500/15 px-3 py-0.5 text-[11px] text-pink-100 whitespace-nowrap">
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
