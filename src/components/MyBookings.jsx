import { useEffect, useState } from "react"
import { getBookings, saveBookings, getCurrentUser } from "../lib/storage"
import { useI18n } from "../lib/i18n"

export default function MyBookings() {
  const { t } = useI18n()
  const user = getCurrentUser()
  const [filter, setFilter] = useState("all")
  const [list, setList] = useState([])

  // === Цвета + иконки для услуг ===
  const serviceStyles = {
    "Šukuosena": {
      icon: "💇‍♀️",
      bg: "rgba(150,80,255,0.25)",
      border: "1px solid rgba(168,85,247,0.6)"
    },
    "Tresų nuoma": {
      icon: "🟪",
      bg: "rgba(120,70,255,0.25)",
      border: "1px solid rgba(132,70,255,0.6)"
    },
    "Papuošalų nuoma": {
      icon: "💍",
      bg: "rgba(80,200,255,0.25)",
      border: "1px solid rgba(80,200,255,0.5)"
    },
    "Atvykimas": {
      icon: "🚗",
      bg: "rgba(255,80,150,0.25)",
      border: "1px solid rgba(255,80,150,0.5)"
    },
    "Konsultacija": {
      icon: "💬",
      bg: "rgba(80,255,150,0.25)",
      border: "1px solid rgba(80,255,150,0.5)"
    }
  }
const formatDuration = (minutes) => {
  if (!minutes) return '—'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h && m) return `${h} val. ${m} min.`
  if (h) return `${h} val.`
  return `${m} min.`
}
  // === Форматирование ===
  const fmtDate = d => new Date(d).toLocaleDateString()
  const fmtTime = d => new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })

  const statusLabel = b => {
    if (b.status === "pending") return "🟡 Ожидает подтверждения"
    if (b.status === "approved") return "🟢 Подтверждена"
    if (b.status === "canceled") return "🔴 Отменена"
    return b.status
  }

  // === Загрузка списка ===
  useEffect(() => {
    const all = getBookings()
    const mine = all.filter(b => b.user?.id === user?.id)

    let filtered = mine
    if (filter === "active") {
      filtered = mine.filter(b => b.status !== "canceled")
    }
    if (filter === "canceled") {
      filtered = mine.filter(b => b.status === "canceled")
    }

    setList(filtered)
  }, [filter])

  // === Отмена ===
  const cancel = id => {
    const all = getBookings()
    const updated = all.map(b =>
      b.id === id ? { ...b, status: "canceled" } : b
    )
    saveBookings(updated)
    setList(updated.filter(b => b.user?.id === user?.id))
  }
const PAYPAL_BUSINESS = 'YOUR_PAYPAL_EMAIL@EXAMPLE.COM' // TODO: замени на свой

const handlePay = (b) => {
  if (!b.price) return
  const amount = b.price.toFixed(2)
  const url = `https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&business=${encodeURIComponent(
    PAYPAL_BUSINESS
  )}&currency_code=EUR&amount=${amount}`
  window.open(url, '_blank')
}
  // === Стили ===
  const card = {
    background: "rgba(12, 10, 20, 0.7)",
    border: "1px solid rgba(168,85,247,0.25)",
    borderRadius: 14,
    padding: 20,
    margin: "20px auto",
  }

  const table = {
    width: "100%",
    borderCollapse: "collapse",
    marginTop: 12
  }

  const th = {
    textAlign: "left",
    padding: "10px 6px",
    opacity: 0.8
  }

  const td = {
    padding: "12px 6px",
    borderBottom: "1px solid rgba(168,85,247,0.15)"
  }

  const filterBtn = active => ({
    padding: "8px 18px",
    borderRadius: 10,
    cursor: "pointer",
    border: active
      ? "2px solid rgba(168,85,247,0.9)"
      : "1px solid rgba(168,85,247,0.25)",
    background: active
      ? "rgba(130,60,255,0.35)"
      : "rgba(20,20,35,0.45)",
    color: "#fff",
    marginLeft: 6
  })

  const cancelBtn = {
    padding: "6px 14px",
    borderRadius: 10,
    border: "1px solid rgba(255,120,120,0.6)",
    background: "rgba(80,0,0,0.4)",
    color: "#ffbaba",
    cursor: "pointer"
  }

  return (
    <div style={card}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <h3 style={{ margin: 0 }}>{t("my_bookings")}</h3>

        <div>
          <button style={filterBtn(filter === "all")} onClick={() => setFilter("all")}>
            Все
          </button>
          <button style={filterBtn(filter === "active")} onClick={() => setFilter("active")}>
            Активные
          </button>
          <button style={filterBtn(filter === "canceled")} onClick={() => setFilter("canceled")}>
            Отменённые
          </button>
        </div>
      </div>

      <table style={table}>
        <thead>
  <tr style={{ borderBottom: '1px solid rgba(168,85,247,0.25)' }}>
    <th style={tableCell}>Дата</th>
    <th style={tableCell}>Время</th>
    <th style={tableCell}>Услуги</th>
    <th style={tableCell}>Kaina</th>
    <th style={tableCell}>Trukmė</th>
    <th style={tableCell}>Статус</th>
    <th style={tableCell}></th>
  </tr>
</thead>

        <tbody>
          {list.length === 0 && (
            <tr>
              <td colSpan="5" style={{ ...td, opacity: 0.6 }}>Нет записей</td>
            </tr>
          )}

          {list.map(b => {
            const canCancel =
              (b.status === "pending" || b.status === "approved") &&
              new Date(b.end) > new Date()

            return (
<tr key={b.id} style={tableRow}>
  {/* Дата */}
  <td style={tableCell}>{fmtDate(b.start)}</td>

  {/* Время */}
  <td style={tableCell}>
    {fmtTime(b.start)}–{fmtTime(b.end)}
  </td>

  {/* Услуги — теги */}
  <td style={{ ...tableCell, maxWidth: 220 }}>
    {Array.isArray(b.services) && b.services.length > 0 ? (
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "6px",
        }}
      >
        {b.services.map((s, i) => (
          <div
            key={i}
            style={{
              padding: "4px 10px",
              borderRadius: 10,
              background: "rgba(150,80,255,0.25)",
              border: "1px solid rgba(168,85,247,0.4)",
              fontSize: 13,
              whiteSpace: "nowrap",
              backdropFilter: "blur(6px)",
            }}
          >
            {s}
          </div>
        ))}
      </div>
    ) : (
      "—"
    )}
  </td>

  {/* Цена */}
  <td style={tableCell}>
    {b.price ? `${b.price} €` : '—'}
  </td>

  {/* Длительность */}
  <td style={tableCell}>
    {b.durationMinutes ? formatDuration(b.durationMinutes) : '—'}
  </td>

  {/* Статус */}
  <td style={tableCell}>{statusLabel(b)}</td>

  {/* Оплата + отмена */}
  <td style={tableCell}>
    {b.price && (
      <button
        style={{
          padding: "6px 12px",
          borderRadius: 10,
          border: "1px solid rgba(34,197,94,0.7)",
          background: "rgba(22,101,52,0.4)",
          color: "#bbf7d0",
          cursor: "pointer",
          marginRight: canCancel ? 8 : 0,
        }}
        onClick={() => handlePay(b)}
      >
        Apmokėti
      </button>
    )}
    {canCancel && (
      <button style={cancelBtn} onClick={() => cancel(b.id)}>
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
  )
}

// === АНИМАЦИЯ ТЕГОВ ===
const style = document.createElement("style")
style.innerHTML = `
@keyframes fadeTag {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
`
document.head.appendChild(style)
