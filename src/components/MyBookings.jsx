import { useEffect, useMemo, useState } from "react"
import { getBookings, saveBookings, getCurrentUser } from "../lib/storage"
import { useI18n } from "../lib/i18n"

// === Цвета для услуг ===
const SERVICE_STYLES = {
  "Šukuosena": {
    bg: "rgba(150,80,255,0.25)",
    border: "1px solid rgba(168,85,247,0.6)",
  },
  "Tresų nuoma": {
    bg: "rgba(80,200,255,0.25)",
    border: "1px solid rgba(80,200,255,0.6)",
  },
  "Papuošalų nuoma": {
    bg: "rgba(255,185,80,0.25)",
    border: "1px solid rgba(255,185,80,0.6)",
  },
  "Atvykimas": {
    bg: "rgba(255,80,80,0.25)",
    border: "1px solid rgba(255,80,80,0.6)",
  },
  "Konsultacija": {
    bg: "rgba(80,255,150,0.25)",
    border: "1px solid rgba(80,255,150,0.6)",
  },
}

// === PayPal (поменяй на свой email позже) ===
const PAYPAL_BUSINESS = "YOUR_PAYPAL_EMAIL@EXAMPLE.COM"

// === формат длительности ===
const formatDuration = (minutes) => {
  if (!minutes) return "—"
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h && m) return `${h} val. ${m} min.`
  if (h) return `${h} val.`
  return `${m} min.`
}

export default function MyBookings() {
  const { t } = useI18n()
  const user = getCurrentUser()

  const [all, setAll] = useState([])
  const [filter, setFilter] = useState("all")
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  )

  // === слежение за шириной окна (таблица / карточки) ===
  useEffect(() => {
    const onResize = () => {
      if (typeof window === "undefined") return
      setIsMobile(window.innerWidth < 768)
    }
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [])

  // === загрузка записей ===
  useEffect(() => {
    const list = getBookings().filter((b) => b.user?.id === user?.id)
    setAll(list)
  }, [user])

  // === отмена ===
  const cancel = (id) => {
    if (!confirm("Отменить запись?")) return
    const allBookings = getBookings()
    const updated = allBookings.map((b) =>
      b.id === id ? { ...b, status: "canceled_client" } : b
    )
    saveBookings(updated)
    setAll(updated.filter((b) => b.user?.id === user?.id))
  }

  // === оплата ===
  const handlePay = (booking) => {
    if (!booking.price) return

    const amount = booking.price.toFixed(2)
    const url = `https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&business=${encodeURIComponent(
      PAYPAL_BUSINESS
    )}&currency_code=EUR&amount=${amount}`

    window.open(url, "_blank")

    // помечаем как оплачено (локально)
    if (confirm("Пометить запись как оплаченную?")) {
      const allBookings = getBookings()
      const updated = allBookings.map((b) =>
        b.id === booking.id ? { ...b, paid: true, paidAt: new Date().toISOString() } : b
      )
      saveBookings(updated)
      setAll(updated.filter((b) => b.user?.id === user?.id))
    }
  }

  // === формат статуса ===
  const statusLabel = (b) =>
    b.status === "approved"
      ? "🟢 " + t("approved")
      : b.status === "pending"
      ? "🟡 " + t("pending")
      : b.status === "canceled_client"
      ? "❌ " + t("canceled_by_client")
      : "🔴 " + t("canceled_by_admin")

  // === фильтрация ===
  const list = useMemo(() => {
    let mine = [...all]

    if (filter === "active") {
      mine = mine.filter((b) => b.status === "pending" || b.status === "approved")
    }
    if (filter === "canceled") {
      mine = mine.filter((b) => String(b.status).includes("canceled"))
    }

    mine.sort((a, b) => new Date(b.start) - new Date(a.start))
    return mine
  }, [all, filter])

  // === рендер тега услуги ===
  const renderServiceTag = (s, i) => {
    const st = SERVICE_STYLES[s] || {
      bg: "rgba(255,255,255,0.08)",
      border: "1px solid rgba(255,255,255,0.15)",
    }

    return (
      <div
        key={i}
        className="tag-anim"
        style={{
          padding: "4px 10px",
          borderRadius: 999,
          background: st.bg,
          border: st.border,
          fontSize: 13,
          whiteSpace: "nowrap",
        }}
      >
        {s}
      </div>
    )
  }

  // === UI ===
  return (
    <div style={card}>
      <div style={headerRow}>
        <h3 style={{ margin: 0 }}>{t("my_bookings")}</h3>

        <div style={filterButtons}>
          <button style={filterBtn(filter === "all")} onClick={() => setFilter("all")}>
            {t("all")}
          </button>
          <button
            style={filterBtn(filter === "active")}
            onClick={() => setFilter("active")}
          >
            {t("active")}
          </button>
          <button
            style={filterBtn(filter === "canceled")}
            onClick={() => setFilter("canceled")}
          >
            {t("canceled")}
          </button>
        </div>
      </div>

      {/* === мобильный режим: карточки === */}
      {isMobile ? (
        <div>
          {list.length === 0 && (
            <div style={{ opacity: 0.6, fontSize: 14 }}>{t("no_records")}</div>
          )}

          {list.map((b) => {
            const canCancel =
              (b.status === "pending" || b.status === "approved") &&
              new Date(b.end) > new Date()

            return (
              <div key={b.id} style={mobileCard}>
                <div style={mRow}>
                  <b>
                    {new Date(b.start).toLocaleDateString("lt-LT")} •{" "}
                    {new Date(b.start).toLocaleTimeString("lt-LT", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    –
                    {new Date(b.end).toLocaleTimeString("lt-LT", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </b>
                </div>

                <div style={mRow}>
                  <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 4 }}>
                    Paslaugos:
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {Array.isArray(b.services) && b.services.length
                      ? b.services.map(renderServiceTag)
                      : "—"}
                  </div>
                </div>

                <div style={mRow}>
                  <span style={{ opacity: 0.8, fontSize: 13 }}>Kaina: </span>
                  <b>{b.price ? `${b.price} €` : "—"}</b>
                </div>

                <div style={mRow}>
                  <span style={{ opacity: 0.8, fontSize: 13 }}>Trukmė: </span>
                  <b>{formatDuration(b.durationMinutes)}</b>
                </div>

                <div style={mRow}>
                  <span style={{ opacity: 0.8, fontSize: 13 }}>Statusas: </span>
                  {statusLabel(b)}
                </div>

                <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                  {b.price && (
                    <button style={payBtn} onClick={() => handlePay(b)}>
                      {b.paid ? "✅ Apmokėta" : "💳 Apmokėti"}
                    </button>
                  )}

                  {canCancel && (
                    <button style={cancelBtn} onClick={() => cancel(b.id)}>
                      {t("cancel")}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        // === десктоп: таблица ===
        <table style={table}>
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(168,85,247,0.25)" }}>
              <th style={th}>Data</th>
              <th style={th}>Laikas</th>
              <th style={th}>Paslaugos</th>
              <th style={th}>Kaina</th>
              <th style={th}>Trukmė</th>
              <th style={th}>Statusas</th>
              <th style={th}></th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 && (
              <tr>
                <td colSpan="7" style={{ ...td, opacity: 0.6 }}>
                  {t("no_records")}
                </td>
              </tr>
            )}

            {list.map((b) => {
              const canCancel =
                (b.status === "pending" || b.status === "approved") &&
                new Date(b.end) > new Date()

              return (
                <tr key={b.id} style={row}>
                  {/* дата */}
                  <td style={td}>
                    {new Date(b.start).toLocaleDateString("lt-LT")}
                  </td>

                  {/* время */}
                  <td style={td}>
                    {new Date(b.start).toLocaleTimeString("lt-LT", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    –
                    {new Date(b.end).toLocaleTimeString("lt-LT", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>

                  {/* услуги */}
                  <td style={{ ...td, maxWidth: 260 }}>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {Array.isArray(b.services) && b.services.length
                        ? b.services.map(renderServiceTag)
                        : "—"}
                    </div>
                  </td>

                  {/* цена */}
                  <td style={td}>{b.price ? `${b.price} €` : "—"}</td>

                  {/* длительность */}
                  <td style={td}>{formatDuration(b.durationMinutes)}</td>

                  {/* статус */}
                  <td style={td}>{statusLabel(b)}</td>

                  {/* действия */}
                  <td style={td}>
                    {b.price && (
                      <button style={payBtn} onClick={() => handlePay(b)}>
                        {b.paid ? "✅ Apmokėta" : "💳 Apmokėti"}
                      </button>
                    )}

                    {canCancel && (
                      <button style={cancelBtn} onClick={() => cancel(b.id)}>
                        {t("cancel")}
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}

/* === СТИЛИ === */

const card = {
  width: "100%",
  marginTop: 40,
  padding: 20,
  borderRadius: 16,
  background: "rgba(10,10,20,0.65)",
  border: "1px solid rgba(168,85,247,0.25)",
  backdropFilter: "blur(16px)",
}

const headerRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 14,
}

const filterButtons = {
  display: "flex",
  gap: 8,
}

const filterBtn = (active) => ({
  padding: "8px 14px",
  borderRadius: 10,
  cursor: "pointer",
  border: active
    ? "1px solid rgba(168,85,247,0.9)"
    : "1px solid rgba(168,85,247,0.3)",
  background: active
    ? "rgba(150,80,255,0.45)"
    : "rgba(20,10,40,0.5)",
  color: "#fff",
  fontSize: 14,
})

const table = {
  width: "100%",
  borderCollapse: "collapse",
}

const th = {
  padding: "10px 8px",
  textAlign: "left",
  fontSize: 13,
  opacity: 0.7,
}

const td = {
  padding: "10px 8px",
  fontSize: 14,
  verticalAlign: "top",
}

const row = {
  borderBottom: "1px solid rgba(255,255,255,0.06)",
}

const cancelBtn = {
  padding: "6px 12px",
  borderRadius: 10,
  border: "1px solid rgba(239,68,68,0.7)",
  background: "rgba(110,20,30,0.45)",
  color: "#fff",
  cursor: "pointer",
  fontSize: 13,
  marginTop: 4,
}

const payBtn = {
  padding: "6px 12px",
  borderRadius: 10,
  border: "1px solid rgba(34,197,94,0.7)",
  background: "rgba(22,101,52,0.45)",
  color: "#bbf7d0",
  cursor: "pointer",
  fontSize: 13,
  marginRight: 6,
}

/* мобильные карточки */
const mobileCard = {
  background: "rgba(12,10,20,0.75)",
  border: "1px solid rgba(168,85,247,0.35)",
  borderRadius: 14,
  padding: 12,
  marginBottom: 10,
}

const mRow = { marginBottom: 6 }

// === АНИМАЦИЯ ТЕГОВ ===
const style = document.createElement("style")
style.innerHTML = `
@keyframes tagFade {
  from { opacity: 0; transform: translateY(6px) scale(.96); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
.tag-anim {
  animation: tagFade .25s ease both;
}
`
document.head.appendChild(style)
