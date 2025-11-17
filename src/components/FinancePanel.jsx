import React, { useEffect, useMemo, useState } from 'react'
import { getBookings, fmtDate, fmtTime } from '../lib/storage'

const MANUAL_KEY = 'iz.finance.manual.v1'

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

// та же логика, что и в MyBookings
const isPaid = (b) => !!(b?.paid || b?.status === 'approved_paid')
const isCanceled = (b) =>
  b.status === 'canceled_client' || b.status === 'canceled_admin'

export default function FinancePanel() {
  const now = new Date()

  // режим фильтра: mėnuo / metai / laikotarpis
  const [mode, setMode] = useState('month') // 'month' | 'year' | 'range'
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [rangeFrom, setRangeFrom] = useState(
    new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  )
  const [rangeTo, setRangeTo] = useState(now.toISOString().slice(0, 10))

  const [manualEntries, setManualEntries] = useState([])

  const [formDate, setFormDate] = useState(now.toISOString().slice(0, 10))
  const [formAmount, setFormAmount] = useState('')
  const [formDesc, setFormDesc] = useState('')

  const [editingId, setEditingId] = useState(null)
  const [editAmount, setEditAmount] = useState('')
  const [editDesc, setEditDesc] = useState('')

  const [bookingsVersion, setBookingsVersion] = useState(0)

  // ===== загрузка / сохранение ручных записей =====
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

  // слушаем изменения в localStorage (синхрон с админкой / другими вкладками)
  useEffect(() => {
    const onStorage = (e) => {
      if (!e.key || e.key === 'iz.bookings.v7') {
        setBookingsVersion((v) => v + 1)
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  // автorefresh каждые 2 сек (если изменения в этой же вкладке)
  useEffect(() => {
    const id = setInterval(() => {
      setBookingsVersion((v) => v + 1)
    }, 2000)
    return () => clearInterval(id)
  }, [])

  // ===== вспомогательный диапазон дат по выбранному режиму =====
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
      // конец периода включительно: +1 день
      start = from
      end = new Date(to.getFullYear(), to.getMonth(), to.getDate() + 1)
      label = `Laikotarpis: ${rangeFrom || '…'} – ${rangeTo || '…'}`
    }

    return [start, end, label]
  }, [mode, year, month, rangeFrom, rangeTo])

  const isInRange = (d) => d >= rangeStart && d < rangeEnd

  // ===== доходы из бронирований =====
  const systemIncomeItems = useMemo(() => {
    const allBookings = getBookings()

    return allBookings
      .filter((b) => {
        const end = new Date(b.end)
        if (end > new Date()) return false
        if (isCanceled(b)) return false
        if (!isPaid(b)) return false
        if (!isInRange(end)) return false
        return true
      })
      .map((b) => {
        const end = new Date(b.end)
        const amount = Number(b.price) || 0
        const hasAtvykimas =
          Array.isArray(b.services) && b.services.includes('Atvykimas')

        return {
          id: `sys-${b.id}`,
          type: 'system',
          tagType: hasAtvykimas ? 'atvykimas' : 'system',
          bookingId: b.id,
          booking: b,
          receiptNumber: String(b.id).slice(0, 6),
          date: end.toISOString().slice(0, 10),
          amount,
          description:
            (b.services && b.services.join(', ')) || 'Sisteminė pajamų įmoka'
        }
      })
  }, [bookingsVersion, rangeStart, rangeEnd])

  const systemIncomeTotal = systemIncomeItems.reduce(
    (sum, item) => sum + item.amount,
    0
  )

  // ===== ручные доходы =====
  const manualItemsForPeriod = useMemo(
    () =>
      manualEntries.filter((e) => {
        const d = new Date(e.date)
        return isInRange(d)
      }),
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
    if (!window.confirm('Удалить этот ручной доход?')) return
    setManualEntries((prev) => prev.filter((e) => e.id !== id))
  }

  // ===== объединённый список для UI / PDF / Excel =====
  const combinedItems = useMemo(() => {
    const manualMapped = manualItemsForPeriod.map((e) => ({
      ...e,
      type: 'manual',
      tagType: 'manual',
      receiptNumber: null
    }))

    const all = [...systemIncomeItems, ...manualMapped]
    return all.sort((a, b) => (a.date > b.date ? 1 : a.date < b.date ? -1 : 0))
  }, [systemIncomeItems, manualItemsForPeriod])

  // ===== рендер тегов =====
  const renderTag = (item) => {
    if (item.tagType === 'atvykimas') {
      return (
        <span className="inline-flex items-center rounded-full border border-violet-400/70 bg-violet-500/15 px-2 py-0.5 text-xs text-violet-100">
          [ Atvykimas ]
        </span>
      )
    }
    if (item.type === 'system') {
      return (
        <span className="inline-flex items-center rounded-full border border-sky-400/70 bg-sky-500/15 px-2 py-0.5 text-xs text-sky-100">
          [ sistema ]
        </span>
      )
    }
    return (
      <span className="inline-flex items-center rounded-full border border-pink-400/70 bg-pink-500/15 px-2 py-0.5 text-xs text-pink-100">
        [ ranka ]
      </span>
    )
  }

  // ===== простая квитанция по брони =====
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

  // ===== экспорт в PDF (Aurora Business) =====
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
            background: linear-gradient(135deg,#4c1d95,#7c3aed,#6366f1);
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
          .tag {
            display:inline-block;
            padding:2px 6px;
            border-radius:999px;
            border:1px solid #a855f7;
            font-size:10px;
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
              Laikotarpio suvestinė pagal pajamas iš sistemos ir rankinius įrašus.
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
                  <th>Suma (€)</th>
                  <th>Aprašymas</th>
                  <th>Šaltinis</th>
                  <th>Kvito Nr.</th>
                </tr>
              </thead>
              <tbody>
                ${combinedItems
                  .map((item) => {
                    const tag =
                      item.tagType === 'atvykimas'
                        ? '[ Atvykimas ]'
                        : item.type === 'system'
                        ? '[ sistema ]'
                        : '[ ranka ]'
                    const kv = item.type === 'system' ? (item.receiptNumber || '') : ''
                    return `<tr>
                      <td>${item.date}</td>
                      <td>€${item.amount.toFixed(2)}</td>
                      <td>${item.description}</td>
                      <td>${tag}</td>
                      <td>${kv ? '#' + kv : ''}</td>
                    </tr>`
                  })
                  .join('')}
                ${
                  !combinedItems.length
                    ? `<tr><td colspan="5" style="text-align:center;color:#9ca3af;padding:8px;">Nėra įrašų šiam laikotarpiui</td></tr>`
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

  // ===== экспорт в Excel (CSV) =====
  const exportExcel = () => {
    if (!combinedItems.length) return

    const header = [
      'Data',
      'Suma (€)',
      'Aprašymas',
      'Šaltinis',
      'Kvito nr.',
      'Tipas'
    ]

    const rows = combinedItems.map((item) => {
      const source =
        item.tagType === 'atvykimas'
          ? '[ Atvykimas ]'
          : item.type === 'system'
          ? '[ sistema ]'
          : '[ ranka ]'
      const kv = item.type === 'system' ? item.receiptNumber || '' : ''
      const typeLabel = item.type === 'system' ? 'Sistema' : 'Rankinis'
      return [
        item.date,
        item.amount.toFixed(2),
        item.description,
        source,
        kv ? `#${kv}` : '',
        typeLabel
      ]
    })

    const all = [header, ...rows]
    const csv = all
      .map((row) =>
        row
          .map((cell) => {
            const s = String(cell ?? '')
            if (s.includes(';') || s.includes('"')) {
              return `"${s.replace(/"/g, '""')}"`
            }
            return s
          })
          .join(';')
      )
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'finansu-ataskaita.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1]

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6 text-white">
      {/* Шапка + фильтры */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold">Finansų panelė</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Pajamos iš sistemos ir rankinių įrašų, automatinės išlaidos (30%) ir profesionali PDF / Excel ataskaita.
          </p>
        </div>

        <div className="flex flex-col items-stretch gap-2 md:items-end">
          <div className="flex rounded-xl bg-zinc-900 border border-zinc-700 p-1 text-xs">
            <button
              className={
                'px-3 py-1 rounded-lg ' +
                (mode === 'month'
                  ? 'bg-gradient-to-r from-purple-500 to-indigo-500'
                  : 'bg-transparent text-zinc-400')
              }
              onClick={() => setMode('month')}
            >
              Mėnuo
            </button>
            <button
              className={
                'px-3 py-1 rounded-lg ' +
                (mode === 'year'
                  ? 'bg-gradient-to-r from-purple-500 to-indigo-500'
                  : 'bg-transparent text-zinc-400')
              }
              onClick={() => setMode('year')}
            >
              Metai
            </button>
            <button
              className={
                'px-3 py-1 rounded-lg ' +
                (mode === 'range'
                  ? 'bg-gradient-to-r from-purple-500 to-indigo-500'
                  : 'bg-transparent text-zinc-400')
              }
              onClick={() => setMode('range')}
            >
              Laikotarpis
            </button>
          </div>

          {/* элементы управления диапазоном */}
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
            Pajamos iš užbaigtų ir apmokėtų įrašų
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

      {/* Блок добавления ручных записей */}
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
          <button
            onClick={addManual}
            className="bg-gradient-to-r from-purple-500 to-indigo-500 rounded-xl px-4 py-2 text-sm font-semibold hover:brightness-110"
          >
            Pridėti
          </button>
        </div>

        <p className="text-xs text-zinc-400">
          Sistemos pajamos skaičiuojamos automatiškai iš užbaigtų ir apmokėtų
          rezervacijų. Čia galite pridėti papildomų pajamų rankiniu būdu
          (pvz. grynieji, papildomos paslaugos ir pan.).
        </p>
      </div>

      {/* История + PDF / Excel отчёт */}
      <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800 p-4 md:p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <h2 className="text-xl font-semibold">Istorija</h2>
          <div className="flex gap-2">
            <button
              onClick={exportExcel}
              className="bg-zinc-800 border border-zinc-600 rounded-xl px-4 py-2 text-xs md:text-sm font-semibold hover:bg-zinc-700"
            >
              📊 Eksportuoti Excel (CSV)
            </button>
            <button
              onClick={exportPDF}
              className="bg-gradient-to-r from-fuchsia-500 to-indigo-500 rounded-xl px-4 py-2 text-xs md:text-sm font-semibold hover:brightness-110"
            >
              📄 Eksportuoti PDF
            </button>
          </div>
        </div>

        {/* Блок, который уходит в PDF */}
        <div
          id="finance-report"
          className="bg-zinc-900/90 text-white p-4 rounded-xl border border-zinc-700"
        >
          <h1 className="text-lg md:text-xl font-semibold">
            Finansų ataskaita — {rangeLabel}
          </h1>
          <p className="text-xs md:text-sm text-zinc-300 mt-1 mb-2">
            Suvestinė pagal pasirinktą laikotarpį: sistemos pajamos + rankiniai
            įrašai, automatizuotos išlaidos (30%) ir bendras balansas.
          </p>

          <div className="summary mt-2 mb-3 grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
            <div className="card bg-zinc-900 border border-emerald-400/40 rounded-xl p-3">
              <div className="card-title text-xs uppercase text-emerald-300">
                Sistema
              </div>
              <div className="card-value text-lg font-semibold">
                €{systemIncomeTotal.toFixed(2)}
              </div>
            </div>
            <div className="card bg-zinc-900 border border-sky-400/40 rounded-xl p-3">
              <div className="card-title text-xs uppercase text-sky-300">
                Rankiniai
              </div>
              <div className="card-value text-lg font-semibold">
                €{manualIncomeTotal.toFixed(2)}
              </div>
            </div>
            <div className="card bg-zinc-900 border border-amber-400/40 rounded-xl p-3">
              <div className="card-title text-xs uppercase text-amber-300">
                Išlaidos (30%)
              </div>
              <div className="card-value text-lg font-semibold">
                €{totalExpense.toFixed(2)}
              </div>
            </div>
            <div className="card bg-zinc-900 border border-indigo-400/40 rounded-xl p-3">
              <div className="card-title text-xs uppercase text-indigo-300">
                Balansas
              </div>
              <div className="card-value text-lg font-semibold">
                €{balance.toFixed(2)}
              </div>
            </div>
          </div>

          <h2 className="mt-4 mb-2 text-base font-semibold">Įrašų sąrašas</h2>

          {/* Таблица для десктопа */}
          <div className="hidden md:block">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr>
                  <th className="border border-zinc-700 px-2 py-1 text-left">
                    Data
                  </th>
                  <th className="border border-zinc-700 px-2 py-1 text-left">
                    Suma (€)
                  </th>
                  <th className="border border-zinc-700 px-2 py-1 text-left">
                    Aprašymas
                  </th>
                  <th className="border border-zinc-700 px-2 py-1 text-left">
                    Šaltinis
                  </th>
                  <th className="border border-zinc-700 px-2 py-1 text-left">
                    Kvito Nr.
                  </th>
                </tr>
              </thead>
              <tbody>
                {combinedItems.map((item) => (
                  <tr key={item.id}>
                    <td className="border border-zinc-800 px-2 py-1">
                      {item.date}
                    </td>
                    <td className="border border-zinc-800 px-2 py-1">
                      €{item.amount.toFixed(2)}
                    </td>
                    <td className="border border-zinc-800 px-2 py-1">
                      {item.description}
                    </td>
                    <td className="border border-zinc-800 px-2 py-1">
                      {renderTag(item)}
                    </td>
                    <td className="border border-zinc-800 px-2 py-1 text-xs">
                      {item.type === 'system'
                        ? item.receiptNumber
                          ? `#${item.receiptNumber}`
                          : ''
                        : ''}
                    </td>
                  </tr>
                ))}
                {!combinedItems.length && (
                  <tr>
                    <td
                      colSpan={5}
                      className="border border-zinc-800 px-2 py-3 text-center text-zinc-400"
                    >
                      Nėra įrašų šiam laikotarpiui
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Карточки для мобильных */}
          <div className="md:hidden flex flex-col gap-2 mt-2">
            {combinedItems.map((item) => (
              <div
                key={item.id}
                className="border border-zinc-800 rounded-xl px-3 py-2 text-sm space-y-1 bg-zinc-950/60"
              >
                <div className="flex justify-between">
                  <span className="text-xs text-zinc-400">{item.date}</span>
                  {renderTag(item)}
                </div>
                <div className="font-semibold">
                  €{item.amount.toFixed(2)}
                </div>
                <div className="text-xs text-zinc-300">
                  {item.description}
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-zinc-400">
                    {item.type === 'system' && item.receiptNumber
                      ? `Kvitas #${item.receiptNumber}`
                      : 'Kvito nėra'}
                  </span>
                  {item.type === 'system' && (
                    <button
                      className="text-xs px-2 py-1 rounded-lg bg-zinc-800 border border-zinc-600"
                      onClick={() => downloadReceipt(item)}
                    >
                      🧾 Kvitas
                    </button>
                  )}
                </div>
              </div>
            ))}
            {!combinedItems.length && (
              <div className="text-xs text-center text-zinc-400 py-2">
                Nėra įrašų šiam laikotarpiui
              </div>
            )}
          </div>
        </div>

        {/* Редактируемые ручные записи под отчётом */}
        {manualItemsForPeriod.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-semibold mb-2">
              Rankiniai įrašai (redaguojami)
            </h3>
            <div className="space-y-2">
              {manualItemsForPeriod.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col md:flex-row md:items-center justify-between gap-2 border border-zinc-800 rounded-xl px-3 py-2 bg-zinc-950/60"
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
