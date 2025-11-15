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
          <tr>
            <th style={th}>Дата</th>
            <th style={th}>Время</th>
            <th style={th}>Услуги</th>
            <th style={th}>Статус</th>
            <th style={th}></th>
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
              <tr key={b.id}>
                <td style={td}>{fmtDate(b.start)}</td>
                <td style={td}>{fmtTime(b.start)}–{fmtTime(b.end)}</td>

                {/* === УСЛУГИ — цветные теги === */}
                <td style={{ ...td, maxWidth: 260 }}>
                  <div style={{
                    display: "flex",
                    gap: "6px",
                    flexWrap: "wrap"
                  }}>
                    {Array.isArray(b.services) && b.services.length > 0 ? (
                      b.services.map((s, i) => {
                        const st = serviceStyles[s] || {
                          icon: "✨",
                          bg: "rgba(255,255,255,0.1)",
                          border: "1px solid rgba(255,255,255,0.15)"
                        }

                        return (
                          <div key={i} style={{
                            padding: "6px 10px",
                            borderRadius: 12,
                            background: st.bg,
                            border: st.border,
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            whiteSpace: "nowrap",
                            fontSize: 13,
                            backdropFilter: "blur(6px)",
                            animation: "fadeTag .35s ease"
                          }}>
                            <span>{s}</span>
                          </div>
                        )
                      })
                    ) : "—"}
                  </div>
                </td>

                <td style={td}>{statusLabel(b)}</td>

                <td style={td}>
                  {canCancel && (
                    <button style={cancelBtn} onClick={() => cancel(b.id)}>
                      Отменить
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
