// =========================================
// ==========  MY BOOKINGS PAGE  ===========
// =========================================

import { useEffect, useState } from "react"
import { getBookings, saveBookings, getCurrentUser } from "../lib/storage"
import { useI18n } from "../lib/i18n"

// ----------------------------
// Цвета + теги услуг
// ----------------------------
const serviceStyles = {
  "Šukuosena": {
    bg: "rgba(150,80,255,0.20)",
    border: "1px solid rgba(168,85,247,0.60)",
    color: "#d9c6ff",
  },
  "Tresų nuoma": {
    bg: "rgba(80,200,255,0.20)",
    border: "1px solid rgba(80,200,255,0.60)",
    color: "#bdf2ff",
  },
  "Papuošalų nuoma": {
    bg: "rgba(200,160,60,0.20)",
    border: "1px solid rgba(200,160,60,0.60)",
    color: "#ffe8b5",
  },
  "Atvykimas": {
    bg: "rgba(200,60,60,0.20)",
    border: "1px solid rgba(200,60,60,0.60)",
    color: "#ffc6c6",
  },
  "Konsultacija": {
    bg: "rgba(60,200,140,0.20)",
    border: "1px solid rgba(60,200,140,0.60)",
    color: "#b2ffe6",
  }
}

// --------------------------------
// Анимация появления тегов
// --------------------------------
const tagAnim = {
  animation: "fadeTag .35s ease",
}

// ================================================
// =============== COMPONENT =======================
// ================================================

export default function MyBookings() {
  const { t } = useI18n()
  const user = getCurrentUser()

  const [filter, setFilter] = useState("all")
  const [list, setList] = useState([])
  const [editing, setEditing] = useState(false)

  const [editName, setEditName] = useState(user?.name || "")
  const [editPhone, setEditPhone] = useState(user?.phone || "")
  const [editEmail, setEditEmail] = useState(user?.email || "")
  const [editInstagram, setEditInstagram] = useState(user?.instagram || "")
  const [editPassword, setEditPassword] = useState("")

  // -----------------------------
  // FORMAT FUNCTIONS
  // -----------------------------
  const fmtDate = d =>
    new Date(d).toLocaleDateString("lt-LT", { day: "2-digit", month: "2-digit", year: "numeric" })

  const fmtTime = d =>
    new Date(d).toLocaleTimeString("lt-LT", { hour: "2-digit", minute: "2-digit" })

  const statusLabel = b => {
    switch (b.status) {
      case "pending": return "🟡 Ожидает"
      case "approved": return "🟢 Подтверждена"
      case "canceled": return "🔴 Отменена"
    }
    return b.status
  }

  const formatDuration = minutes => {
    if (!minutes) return "—"
    if (minutes < 60) return `${minutes} min`
    return `${(minutes / 60).toFixed(1)} val.`
  }

  // ---------------------------------
  // LOAD BOOKINGS
  // ---------------------------------
  useEffect(() => {
    const all = getBookings()
    let mine = all.filter(b => b.userPhone === user?.phone)

    if (filter === "active") mine = mine.filter(b => b.status !== "canceled")
    if (filter === "canceled") mine = mine.filter(b => b.status === "canceled")

    setList(mine)
  }, [filter])

  // ---------------------------------
  // CANCEL
  // ---------------------------------
  const cancel = id => {
    const all = getBookings()
    const updated = all.map(b => b.id === id ? { ...b, status: "canceled" } : b)
    saveBookings(updated)
    setList(updated.filter(b => b.userPhone === user?.phone))
  }

  // ---------------------------------
  // TOGGLE PAYMENT
  // ---------------------------------
  const togglePaid = id => {
    const all = getBookings()
    const updated = all.map(b =>
      b.id === id ? { ...b, paid: !b.paid } : b
    )
    saveBookings(updated)
    setList(updated.filter(b => b.userPhone === user?.phone))
  }

  // ---------------------------------
  // SAVE PROFILE
  // ---------------------------------
  const saveProfile = () => {
    const updated = {
      ...user,
      name: editName,
      phone: editPhone,
      email: editEmail,
      instagram: editInstagram,
      password: editPassword.length > 0 ? editPassword : user.password,
    }
    localStorage.setItem("currentUser", JSON.stringify(updated))
    setEditing(false)
  }

  // ================================================
  // =================== RENDER =====================
  // ================================================
  return (
    <div style={{ width: "100%", margin: "0 auto" }}>

      {/* ===================================== */}
      {/* ========= PROFILE BLOCK ============== */}
      {/* ===================================== */}

      <div
        style={{
          border: "1px solid rgba(170,80,255,0.28)",
          background: "rgba(15,10,30,0.85)",
          borderRadius: 20,
          padding: 22,
          marginBottom: 32,
        }}
      >
        {/* Заголовок */}
        <div
          onClick={() => setEditing(!editing)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            cursor: "pointer",
            marginBottom: 15,
          }}
        >
          <svg width="10" height="10" viewBox="0 0 24 24"
            style={{
              transform: editing ? "rotate(90deg)" : "rotate(0deg)",
              transition: ".25s"
            }}>
            <path fill="#cfa7ff" d="M8 5v14l11-7z" />
          </svg>
          <span style={{ fontSize: 18, color: "#fff" }}>Редактировать профиль</span>
        </div>

        {/* Контент */}
        {editing && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

            <input value={editName} onChange={e => setEditName(e.target.value)}
              placeholder="Имя"
              style={inputStyle} />

            <input value={editInstagram} onChange={e => setEditInstagram(e.target.value)}
              placeholder="Instagram"
              style={inputStyle} />

            <input value={editPhone} onChange={e => setEditPhone(e.target.value)}
              placeholder="Телефон"
              style={inputStyle} />

            <input value={editEmail} onChange={e => setEditEmail(e.target.value)}
              placeholder="Email"
              style={inputStyle} />

            <input value={editPassword} onChange={e => setEditPassword(e.target.value)}
              placeholder="Новый пароль"
              type="password"
              style={inputStyle} />

            <button
              onClick={saveProfile}
              style={{
                width: "100%",
                borderRadius: 12,
                padding: "12px 0",
                marginTop: 12,
                background: "linear-gradient(90deg, #9340ff, #6b15d8)",
                border: "none",
                color: "#fff",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              💾 save
            </button>
          </div>
        )}
      </div>

      {/* ===================================== */}
      {/* ========== МОИ ЗАПИСИ =============== */}
      {/* ===================================== */}

      <div
        style={{
          border: "1px solid rgba(170,80,255,0.28)",
          background: "rgba(15,10,30,0.85)",
          borderRadius: 20,
          padding: 22,
        }}
      >
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}>
          <h3 style={{ margin: 0, color: "#fff" }}>Мои записи</h3>

          <div style={{ display: "flex", gap: 8 }}>
            <button style={filterBtn(filter === "all")} onClick={() => setFilter("all")}>Все</button>
            <button style={filterBtn(filter === "active")} onClick={() => setFilter("active")}>Активные</button>
            <button style={filterBtn(filter === "canceled")} onClick={() => setFilter("canceled")}>Отменённые</button>
          </div>
        </div>

        <table style={table}>
          <thead>
            <tr>
              <th style={th}>Дата</th>
              <th style={th}>Время</th>
              <th style={th}>Услуги</th>
              <th style={th}>Kaina</th>
              <th style={th}>Trukmė</th>
              <th style={th}>Статус</th>
              <th style={th}>Оплата</th>
            </tr>
          </thead>

          <tbody>

            {list.length === 0 && (
              <tr>
                <td colSpan="7" style={{ ...td, opacity: 0.6 }}>Нет записей</td>
              </tr>
            )}

            {list.map(b => {
              const canCancel =
                (b.status === "pending" || b.status === "approved") &&
                new Date(b.end) > new Date()

              return (
                <tr key={b.id} style={row}>
                  <td style={td}>{fmtDate(b.start)}</td>
                  <td style={td}>{fmtTime(b.start)} — {fmtTime(b.end)}</td>

                  {/* TAGS */}
                  <td style={{ ...td, maxWidth: 260 }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {b.services?.map(s => (
                        <div
                          key={s}
                          style={{
                            padding: "4px 10px",
                            borderRadius: 12,
                            fontSize: 13,
                            ...serviceStyles[s],
                            ...tagAnim
                          }}
                        >
                          {s}
                        </div>
                      ))}
                    </div>
                  </td>

                  <td style={td}>{b.price ? b.price + " €" : "—"}</td>

                  <td style={td}>{formatDuration(b.durationMinutes)}</td>

                  <td style={td}>{statusLabel(b)}</td>

                  {/* PAYMENT */}
                  <td style={td}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      {/* ИНДИКАТОР */}
                      <span
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: "50%",
                          background: b.paid ? "#10ff85" : "#ff4050",
                          boxShadow: b.paid
                            ? "0 0 6px #10ff85"
                            : "0 0 6px #ff4050",
                          animation: b.paid ? "pulseGreen 1.5s infinite" : "pulseRed 1.5s infinite"
                        }}
                      />

                      {/* КНОПКА */}
                      <button
                        onClick={() => togglePaid(b.id)}
                        style={{
                          padding: "6px 12px",
                          borderRadius: 10,
                          background: b.paid
                            ? "rgba(20,200,120,0.2)"
                            : "rgba(255,60,60,0.2)",
                          border: b.paid
                            ? "1px solid rgba(20,200,120,0.6)"
                            : "1px solid rgba(255,60,60,0.6)",
                          color: "#fff",
                          cursor: "pointer",
                        }}
                      >
                        {b.paid ? "Apmokėta" : "Neapmokėta"}
                      </button>
                    </div>
                  </td>

                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Анимации */}
      <style>
        {`
          @keyframes fadeTag {
            from { opacity:0; transform: translateY(6px); }
            to { opacity:1; transform: translateY(0); }
          }

          @keyframes pulseRed {
            0% { box-shadow:0 0 4px #ff4050; }
            50% { box-shadow:0 0 11px #ff4050; }
            100% { box-shadow:0 0 4px #ff4050; }
          }
          @keyframes pulseGreen {
            0% { box-shadow:0 0 4px #10ff85; }
            50% { box-shadow:0 0 11px #10ff85; }
            100% { box-shadow:0 0 4px #10ff85; }
          }
        `}
      </style>

    </div>
  )
}

// ======================================
// STYLES
// ======================================

const table = {
  width: "100%",
  borderCollapse: "collapse",
  color: "#fff"
}

const th = {
  textAlign: "left",
  padding: "10px 0",
  borderBottom: "1px solid rgba(168,85,247,0.25)",
  fontWeight: 600,
  fontSize: 15,
}

const td = {
  padding: "14px 0",
  verticalAlign: "top",
  fontSize: 15,
}

const row = {
  borderBottom: "1px solid rgba(168,85,247,0.12)",
}

const filterBtn = active => ({
  padding: "6px 12px",
  borderRadius: 10,
  color: active ? "#fff" : "#aaa",
  border: active
    ? "1px solid rgba(168,85,247,0.6)"
    : "1px solid rgba(168,85,247,0.25)",
  background: active
    ? "rgba(168,85,247,0.35)"
    : "rgba(255,255,255,0.04)",
  cursor: "pointer",
})

const inputStyle = {
  width: "100%",
  padding: "12px 16px",
  borderRadius: 12,
  border: "1px solid rgba(160,80,255,0.35)",
  background: "rgba(20,10,40,0.85)",
  color: "#fff",
  fontSize: 15,
}

