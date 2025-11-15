import { useEffect, useState } from "react"
import {
  getBookings,
  saveBookings,
  getCurrentUser
} from "../lib/storage"
import { format } from "date-fns"
import { lt } from "date-fns/locale"

const TAG_COLORS = {
  "Konsultacija": "#2A8C55",
  "Atvykimas": "#8C2A2A",
  "Papuošalų nuoma": "#8C6A2A",
  "Tresų nuoma": "#2A6C8C",
  "Šukuosena": "#552A8C"
}

export default function MyBookings() {
  const user = getCurrentUser()
  const [data, setData] = useState([])
  const [filter, setFilter] = useState("all")

  useEffect(() => {
    const all = getBookings()
    const mine = all.filter(b => b.userPhone === user.phone)
    setData(mine)
  }, [user])

  const markPaid = (id) => {
    const all = getBookings()
    const updated = all.map(b =>
      b.id === id ? { ...b, paid: true } : b
    )
    saveBookings(updated)

    const mine = updated.filter(b => b.userPhone === user.phone)
    setData(mine)
  }

  const filtered = data.filter(b => {
    if (filter === "active") return b.status !== "canceled"
    if (filter === "canceled") return b.status === "canceled"
    return true
  })

  return (
    <div className="card" style={{ marginTop: 20 }}>
      <h2 style={{ marginBottom: 18 }}>Мои записи</h2>

      {/* FILTERS */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        {["all", "active", "canceled"].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: "8px 14px",
              borderRadius: 10,
              border: "1px solid rgba(168,85,247,0.35)",
              background:
                filter === f
                  ? "rgba(98,0,180,0.45)"
                  : "rgba(98,0,180,0.18)",
              color: "#fff",
              cursor: "pointer"
            }}
          >
            {f === "all" && "Все"}
            {f === "active" && "Активные"}
            {f === "canceled" && "Отменённые"}
          </button>
        ))}
      </div>

      {/* TABLE */}
      <div style={{ width: "100%", overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", opacity: 0.8 }}>
              <th>Дата</th>
              <th>Время</th>
              <th>Paslaugos</th>
              <th>Kaina</th>
              <th>Trukmė</th>
              <th>Statusas</th>
              <th>Оплата</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(b => (
              <tr key={b.id} style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                <td style={{ padding: "12px 0" }}>
                  {format(new Date(b.start), "yyyy-MM-dd")}
                </td>

                <td>
                  {format(new Date(b.start), "HH:mm")}–
                  {format(new Date(b.end), "HH:mm")}
                </td>

                <td>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {b.services?.map((s, i) => (
                      <span
                        key={i}
                        style={{
                          padding: "4px 10px",
                          borderRadius: 12,
                          background: TAG_COLORS[s] + "33",
                          border: `1px solid ${TAG_COLORS[s]}`,
                          color: "#fff",
                          fontSize: 14
                        }}
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </td>

                <td>{b.price} €</td>

                <td>{(b.durationMinutes / 60).toFixed(1)} val.</td>

                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        background: b.status === "approved" ? "#4ade80" : "#f87171",
                        animation: b.status === "approved"
                          ? "pulse 1.4s infinite"
                          : "none"
                      }}
                    />
                    {b.status === "approved" ? "Patvirtinta" : "Laukiama"}
                  </div>
                </td>

                <td>
                  {b.paid ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          background: "#22c55e",
                          boxShadow: "0 0 8px #22c55e"
                        }}
                      />
                      Apmokėta
                    </div>
                  ) : (
                    <button
                      onClick={() => markPaid(b.id)}
                      style={{
                        padding: "6px 14px",
                        borderRadius: 10,
                        background: "rgba(255,0,0,0.22)",
                        border: "1px solid rgba(255,0,0,0.45)",
                        color: "#fff",
                        cursor: "pointer",
                        transition: ".25s"
                      }}
                    >
                      <div style={{
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        background: "#ff4444",
                        display: "inline-block",
                        marginRight: 6,
                        boxShadow: "0 0 8px #ff4444"
                      }} />
                      Neapmokėta
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div style={{ textAlign: "center", marginTop: 20, opacity: 0.75 }}>
            Нет записей
          </div>
        )}
      </div>

      {/* Payment dot animation */}
      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); opacity: .8; }
          50% { transform: scale(1.45); opacity: 1; }
          100% { transform: scale(1); opacity: .8; }
        }
      `}</style>
    </div>
  )
}
