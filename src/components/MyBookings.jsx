import { useState, useEffect, useMemo } from 'react'
import { getBookings, saveBookings, getCurrentUser } from '../lib/storage'
import { fmtDate, fmtTime } from '../lib/storage'
import { useI18n } from '../lib/i18n'

// === Цветовые теги услуг ===
const serviceStyles = {
  "Šukuosena": {
    icon: "🟣",
    bg: "rgba(150,80,255,0.25)",
    border: "1px solid rgba(168,85,247,0.6)"
  },
  "Tresų nuoma": {
    icon: "🟪",
    bg: "rgba(120,70,255,0.25)",
    border: "1px solid rgba(132,70,255,0.6)"
  },
  "Papuošalų nuoma": {
    icon: "🟡",
    bg: "rgba(80,200,255,0.25)",
    border: "1px solid rgba(80,200,255,0.5)"
  },
  "Atvykimas": {
    icon: "🔴",
    bg: "rgba(255,80,150,0.25)",
    border: "1px solid rgba(255,80,150,0.5)"
  },
  "Konsultacija": {
    icon: "🟢",
    bg: "rgba(80,255,150,0.25)",
    border: "1px solid rgba(80,255,150,0.5)"
  }
}

// === Формат длительности ===
const formatDuration = (minutes) => {
  if (!minutes) return '—'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h && m) return `${h}h ${m}min`
  if (h) return `${h}h`
  return `${m}min`
}

// === PayPal настройки ===
const PAYPAL_EMAIL = "YOUR_PAYPAL_EMAIL@example.com"

export default function MyBookings() {
  const { t } = useI18n()
  const user = getCurrentUser()
  const [list, setList] = useState([])
  const [filter, setFilter] = useState('all')

  // === загрузка списка ===
  useEffect(() => {
    const all = getBookings()
    const mine = all.filter(b => b.user?.id === user?.id)
    setList(mine)
  }, [user])

  // === отмена записи ===
  const cancel = (id) => {
    if (!confirm("Отменить запись?")) return
    const all = getBookings()
    const updated = all.map(b =>
      b.id === id ? { ...b, status: "canceled_client" } : b
    )
    saveBookings(updated)
    setList(updated.filter(b => b.user?.id === user?.id))
  }

  // === оплата ===
  const handlePay = (b) => {
    if (!b.price) return
    const url =
      `https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&business=${encodeURIComponent(PAYPAL_EMAIL)}&currency_code=EUR&amount=${b.price.toFixed(2)}`
    window.open(url, "_blank")
  }

  // === фильтрация ===
  const filtered = useMemo(() => {
    let arr = [...list]

    if (filter === "active") {
      arr = arr.filter(b => b.status === "pending" || b.status === "approved")
    }
    if (filter === "canceled") {
      arr = arr.filter(b => b.status.includes("canceled"))
    }

    arr.sort((a, b) => new Date(b.start) - new Date(a.start))
    return arr
  }, [filter, list])

  const statusLabel = (b) =>
    b.status === "approved" ? "🟢 " + t('approved')
      : b.status === "pending" ? "🟡 " + t('pending')
      : b.status === "canceled_client" ? "❌ " + t('canceled_by_client')
      : "🔴 " + t('canceled_by_admin')

  // ==========================
  //         UI
  // ==========================

  return (
    <div style={wrapper}>
      <div style={bookingsCard}>
        <div style={bookingsHeader}>
          <h3 style={{ margin: 0 }}>{t('my_bookings')}</h3>

          <div style={filterButtons}>
            <button style={filterBtn(filter === 'all')} onClick={() => setFilter('all')}>
              {t('all')}
            </button>
            <button style={filterBtn(filter === 'active')} onClick={() => setFilter('active')}>
              {t('active')}
            </button>
            <button style={filterBtn(filter === 'canceled')} onClick={() => setFilter('canceled')}>
              {t('canceled')}
            </button>
          </div>
        </div>

        <table style={table}>
          <thead>
            <tr>
              <th style={tableCell}>Дата</th>
              <th style={tableCell}>Время</th>
              <th style={tableCell}>Услуги</th>
              <th style={tableCell}>Цена</th>
              <th style={tableCell}>Длит.</th>
              <th style={tableCell}>Статус</th>
              <th style={tableCell}></th>
            </tr>
          </thead>

          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan="7" style={{ ...tableCell, opacity: 0.6 }}>
                  {t('no_records')}
                </td>
              </tr>
            )}

            {filtered.map(b => {
              const canCancel =
                (b.status === 'pending' || b.status === 'approved') &&
                new Date(b.end) > new Date()

              return (
                <tr key={b.id} style={tableRow}>

                  <td style={tableCell}>{fmtDate(b.start)}</td>

                  <td style={tableCell}>
                    {fmtTime(b.start)}–{fmtTime(b.end)}
                  </td>

                  {/* === услуги === */}
                  <td style={{ ...tableCell, maxWidth: 260 }}>
                    <div style={{ display: 'flex', gap: 6, flexWrap: "wrap" }}>
                      {b.services?.map(s => (
                        <div key={s} style={{
                          padding: "4px 9px",
                          borderRadius: 8,
                          fontSize: 12,
                          background: SERVICE_STYLES[s]?.bg,
                          border: SERVICE_STYLES[s]?.border
                        }}>
                          {s}
                        </div>
                      ))}
                    </div>
                  </td>

                  {/* === цена === */}
                  <td style={tableCell}>{b.price ? `${b.price} €` : '—'}</td>

                  {/* === длительность === */}
                  <td style={tableCell}>{formatDuration(b.durationMinutes)}</td>

                  {/* === статус === */}
                  <td style={tableCell}>{statusLabel(b)}</td>

                  {/* === кнопки === */}
                  <td style={tableCell}>
                    {b.price && (
                      <button
                        onClick={() => handlePay(b)}
                        style={payBtn}
                      >
                        💳 Оплатить
                      </button>
                    )}

                    {canCancel && (
                      <button
                        style={cancelBtn}
                        onClick={() => cancel(b.id)}
                      >
                        {t('cancel')}
                      </button>
                    )}
                  </td>

                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* === Стили === */
const wrapper = { width: "100%" }

const bookingsCard = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(168,85,247,0.25)",
  borderRadius: 16,
  padding: 16,
  width: "100%"
}

const bookingsHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 12
}

const filterButtons = {
  display: "flex",
  gap: 8
}

const filterBtn = (active) => ({
  padding: "8px 14px",
  borderRadius: 10,
  color: "#fff",
  cursor: "pointer",
  background: active ? "rgba(150,80,255,0.45)" : "rgba(25,10,45,0.4)",
  border: active
    ? "1px solid rgba(168,85,247,0.7)"
    : "1px solid rgba(168,85,247,0.25)"
})

const table = {
  width: "100%",
  borderCollapse: "collapse",
  marginTop: 10
}

const tableCell = {
  padding: "10px 8px",
  fontSize: 14,
  textAlign: "left",
  color: "#fff",
  verticalAlign: "top"
}

const tableRow = {
  borderBottom: "1px solid rgba(168,85,247,0.2)"
}

const cancelBtn = {
  padding: "6px 12px",
  marginTop: 4,
  borderRadius: 10,
  border: "1px solid rgba(239,68,68,.7)",
  background: "rgba(110,20,30,.4)",
  color: "#fff",
  cursor: "pointer"
}

const payBtn = {
  padding: "6px 12px",
  marginBottom: 4,
  borderRadius: 10,
  border: "1px solid rgba(34,197,94,.7)",
  background: "rgba(22,100,40,.45)",
  color: "#bbf7d0",
  cursor: "pointer"
}
