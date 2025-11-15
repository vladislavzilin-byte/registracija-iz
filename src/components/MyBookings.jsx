import { useEffect, useState } from "react"
import { getBookings, saveBookings, getCurrentUser } from "../lib/storage"
import { useI18n } from "../lib/i18n"

export default function MyBookings() {
  const { t } = useI18n()
  const user = getCurrentUser()

  const [all, setAll] = useState([])
  const [filter, setFilter] = useState("all")

  useEffect(() => {
    const list = getBookings().filter(b => b.user?.email === user?.email)
    setAll(list)
  }, [])

  const cancel = (id) => {
    const updated = all.map(b => b.id === id ? { ...b, status: "canceled" } : b)
    saveBookings(updated)
    setAll(updated)
  }

  const fmtDate = (d) => {
    const date = new Date(d)
    return date.toLocaleDateString("lt-LT")
  }

  const fmtTime = (d) => {
    const date = new Date(d)
    return date.toLocaleTimeString("lt-LT", { hour: "2-digit", minute: "2-digit" })
  }

  const statusLabel = (b) => {
    switch (b.status) {
      case "pending":
        return (
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: "gold"
            }}></div>
            Ожидает подтверждения
          </span>
        )
      case "approved":
        return (
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: "#4ade80"
            }}></div>
            Подтверждена
          </span>
        )
      case "canceled":
        return (
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: "#f87171"
            }}></div>
            Отменена
          </span>
        )
    }
  }

  const list = all.filter(b => {
    if (filter === "all") return true
    if (filter === "active") return b.status !== "canceled"
    if (filter === "canceled") return b.status === "canceled"
  })

  /* === СТИЛИ === */
  const bookingsCard = {
    marginTop: 40,
    padding: "28px",
    borderRadius: 16,
    background: "rgba(10,10,20,0.55)",
    border: "1px solid rgba(168,85,247,0.25)",
    backdropFilter: "blur(18px)",
  }

  const bookingsHeader = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  }

  const filterButtons = {
    display: "flex",
    gap: "8px",
  }

  const filterBtn = (active) => ({
    padding: "8px 16px",
    borderRadius: 10,
    cursor: "pointer",
    border: active
      ? "1.5px solid rgba(168,85,247,0.8)"
      : "1px solid rgba(168,85,247,0.25)",
    background: active
      ? "rgba(150,80,255,0.35)"
      : "rgba(255,255,255,0.05)",
    color: "#fff",
    transition: ".2s",
  })

  const table = {
    width: "100%",
    borderCollapse: "collapse",
    marginTop: 10,
  }

  const tableRow = {
    borderBottom: "1px solid rgba(255,255,255,0.08)",
  }

  const tableCell = {
    padding: "14px 12px",
    textAlign: "left",
    fontSize: 15,
  }

  const cancelBtn = {
    padding: "6px 14px",
    background: "rgba(255,0,80,0.25)",
    border: "1px solid rgba(255,0,80,0.45)",
    borderRadius: 10,
    cursor: "pointer",
    color: "#fff",
    transition: ".25s",
  }

  return (
    <div style={bookingsCard}>

      {/* === Заголовок и фильтры === */}
      <div style={bookingsHeader}>
        <h3 style={{ margin: 0 }}>{t("my_bookings")}</h3>

        <div style={filterButtons}>
          <button style={filterBtn(filter === "all")} onClick={() => setFilter("all")}>Все</button>
          <button style={filterBtn(filter === "active")} onClick={() => setFilter("active")}>Активные</button>
          <button style={filterBtn(filter === "canceled")} onClick={() => setFilter("canceled")}>Отменённые</button>
        </div>
      </div>

      {/* === Таблица === */}
      <table style={table}>
        <thead>
          <tr style={{ borderBottom: "1px solid rgba(168,85,247,0.25)" }}>
            <th style={tableCell}>Дата</th>
            <th style={tableCell}>Время</th>
            <th style={tableCell}>Услуги</th>
            <th style={tableCell}>Статус</th>
            <th style={tableCell}></th>
          </tr>
        </thead>

        <tbody>
          {list.map(b => {
            const canCancel =
              (b.status === "pending" || b.status === "approved") &&
              new Date(b.end) > new Date()

            return (
              <tr key={b.id} style={tableRow}>
                
                {/* ДАТА */}
                <td style={tableCell}>{fmtDate(b.start)}</td>

                {/* ВРЕМЯ */}
                <td style={tableCell}>
                  {fmtTime(b.start)}–{fmtTime(b.end)}
                </td>

                {/* УСЛУГИ – ТЕГИ */}
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
                            fontSize: "13px",
                            whiteSpace: "nowrap",
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

                {/* СТАТУС */}
                <td style={tableCell}>{statusLabel(b)}</td>

                {/* ОТМЕНА */}
                <td style={tableCell}>
                  {canCancel && (
                    <button style={cancelBtn} onClick={() => cancel(b.id)}>
                      {t("cancel")}
                    </button>
                  )}
                </td>

              </tr>
            )
          })}

          {!list.length && (
            <tr>
              <td colSpan="5" style={{ ...tableCell, opacity: 0.6 }}>
                {t("no_records")}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
