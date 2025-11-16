import React, { useMemo, useState } from "react"
import {
  getBookings,
  saveBookings,
  fmtDate,
  fmtTime
} from "../lib/storage"

// === Проверка оплаты ===
const isPaid = (b) => !!(b?.paid || b?.status === "approved_paid")

// === Лампочки ===
const lamp = (color) => ({
  width: 12,
  height: 12,
  borderRadius: "50%",
  background: color,
  boxShadow: `0 0 8px ${color}`,
  display: "inline-block"
})

const statusDot = (b) => {
  const paid = isPaid(b)

  if (b.status === "approved" || b.status === "approved_paid")
    return <span style={lamp(paid ? "#22c55e" : "#f97316")} />

  if (b.status === "pending")
    return <span style={lamp("#facc15")} />

  return <span style={lamp("#ef4444")} /> // отменено
}

const statusText = (b) => {
  const paid = isPaid(b)

  if (b.status === "approved" || b.status === "approved_paid") {
    return paid
      ? "Бронирование подтверждено • Оплачено"
      : "Бронирование подтверждено • Ожидает оплаты"
  }

  if (b.status === "pending") {
    return paid
      ? "Ожидает подтверждения • Оплачено"
      : "Ожидает подтверждения • Не оплачено"
  }

  if (b.status === "canceled_client" || b.status === "canceled_admin")
    return "Отменено"

  return b.status
}

// === Скачать квитанцию (копия из MyBookings.jsx) ===
const downloadReceipt = (b) => {
  try {
    const win = window.open("", "_blank", "width=700,height=900")
    if (!win) return

    const dateStr = fmtDate(b.start)
    const timeStr = `${fmtTime(b.start)} – ${fmtTime(b.end)}`
    const createdStr = b.createdAt
      ? new Date(b.createdAt).toLocaleString("lt-LT")
      : new Date().toLocaleString("lt-LT")
    const servicesStr = (b.services || []).join(", ")
    const paidLabel = isPaid(b) ? "Оплачено" : "Не оплачено"

    const vcard = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      "N:Žilina;Irina;;;",
      "FN:Irina Žilina",
      "ORG:IZ HAIR TREND",
      "TEL;TYPE=CELL,VOICE:+37060128458",
      "EMAIL;TYPE=WORK:info@izhairtrend.lt",
      "URL:https://izhairtrend.lt",
      "ADR;TYPE=WORK:;;Sodo g. 2a;Klaipeda;;;LT",
      "NOTE:Šukuosenų meistrė",
      "END:VCARD",
    ].join("\n")

    const qrUrl =
      "https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=" +
      encodeURIComponent(vcard)

    const html = `
      <html><body style="background:#0b0217;color:white;padding:20px">
        <h2>Квитанция #${b.id.slice(0, 6)}</h2>
        <img src="/logo2.svg" style="height:90px" /><br>
        <div>Дата: <b>${dateStr}</b></div>
        <div>Время: <b>${timeStr}</b></div>
        <div>Услуги: <b>${servicesStr}</b></div>
        <div>Оплата: <b>${paidLabel}</b></div>
        <br>
        <img src="${qrUrl}" width="120" height="120" />
        <script>window.print()</script>
      </body></html>
    `

    win.document.write(html)
    win.document.close()
  } catch (e) {
    console.error("Receipt error:", e)
  }
}

export default function Admin() {
  const [filter, setFilter] = useState("all") // all | history
  const [version, setVersion] = useState(0)

  const bookings = getBookings()

  // === ФИЛЬТР: Все / История ===
  const list = useMemo(() => {
    const now = new Date()

    if (filter === "history") {
      return bookings.filter((b) => {
        const end = new Date(b.end)
        const canceled =
          b.status === "canceled_client" || b.status === "canceled_admin"

        return end < now || canceled
      })
    }

    return bookings
  }, [bookings.length, filter, version])

  // === Подтвердить ===
  const approve = (id) => {
    const arr = bookings.map((b) =>
      b.id === id
        ? {
            ...b,
            status: isPaid(b) ? "approved_paid" : "approved",
          }
        : b
    )

    saveBookings(arr)
    setVersion((v) => v + 1)
  }

  // === Оплата ===
  const togglePaid = (id) => {
    const arr = bookings.map((b) =>
      b.id === id
        ? {
            ...b,
            paid: !isPaid(b),
            status: !isPaid(b)
              ? "approved_paid"
              : b.status === "approved_paid"
              ? "approved"
              : b.status,
          }
        : b
    )

    saveBookings(arr)
    setVersion((v) => v + 1)
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>Админ-панель</h2>

      {/* === ФИЛЬТРЫ === */}
      <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
        <button
          onClick={() => setFilter("all")}
          style={{
            padding: "8px 16px",
            borderRadius: 10,
            background:
              filter === "all"
                ? "rgba(168,85,247,0.25)"
                : "rgba(255,255,255,0.06)",
            border:
              filter === "all"
                ? "1px solid #a855f7"
                : "1px solid rgba(180,150,255,0.4)",
            color: "white"
          }}
        >
          Все
        </button>

        <button
          onClick={() => setFilter("history")}
          style={{
            padding: "8px 16px",
            borderRadius: 10,
            background:
              filter === "history"
                ? "rgba(168,85,247,0.25)"
                : "rgba(255,255,255,0.06)",
            border:
              filter === "history"
                ? "1px solid #a855f7"
                : "1px solid rgba(180,150,255,0.4)",
            color: "white"
          }}
        >
          История
        </button>
      </div>

      {/* === СПИСОК ЗАПИСЕЙ === */}
      {list.map((b) => {
        const paid = isPaid(b)

        return (
          <div
            key={b.id}
            style={{
              border: "1px solid rgba(168,85,247,0.25)",
              padding: 16,
              background: "rgba(20,10,30,0.55)",
              borderRadius: 12,
              marginBottom: 12,
            }}
          >
            {/* HEADER */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}
            >
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                {statusDot(b)}
                <b>{fmtDate(b.start)}</b>
              </div>

              {paid && (
                <button
                  onClick={() => downloadReceipt(b)}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 8,
                    background: "rgba(15,23,42,0.9)",
                    border: "1px solid rgba(148,163,184,0.7)",
                    color: "#e5e7eb",
                    cursor: "pointer"
                  }}
                >
                  🧾 Квитанция
                </button>
              )}
            </div>

            <div style={{ opacity: 0.8, marginTop: 4 }}>
              {fmtTime(b.start)} – {fmtTime(b.end)}
            </div>

            <div style={{ marginTop: 8 }}>
              <b>{b.userName}</b> <br />
              {b.userPhone}
            </div>

            <div style={{ marginTop: 10 }}>
              <span style={{ opacity: 0.8 }}>Статус: </span>
              <span
                style={{
                  padding: "4px 10px",
                  borderRadius: 8,
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(168,85,247,0.5)"
                }}
              >
                {statusText(b)}
              </span>
            </div>

            {b.price && (
              <div style={{ marginTop: 8 }}>
                <span style={{ opacity: 0.8 }}>Avansas:</span>{" "}
                <b>{b.price} €</b>
              </div>
            )}

            {/* === КНОПКИ УПРАВЛЕНИЯ === */}
            <div
              style={{
                display: "flex",
                gap: 10,
                marginTop: 12,
                flexWrap: "wrap"
              }}
            >
              {b.status === "pending" && (
                <button
                  onClick={() => approve(b.id)}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 10,
                    background: "rgba(60,180,60,0.25)",
                    border: "1px solid #4ade80",
                    color: "#4ade80",
                    cursor: "pointer"
                  }}
                >
                  ✔ Подтвердить
                </button>
              )}

              <button
                onClick={() => togglePaid(b.id)}
                style={{
                  padding: "8px 14px",
                  borderRadius: 10,
                  background: paid
                    ? "rgba(180,40,60,0.25)"
                    : "rgba(60,180,80,0.25)",
                  border: paid
                    ? "1px solid #f87171"
                    : "1px solid #4ade80",
                  color: paid ? "#f87171" : "#4ade80",
                  cursor: "pointer"
                }}
              >
                {paid ? "Отметить как не оплаченo" : "Пометить как оплачено"}
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
