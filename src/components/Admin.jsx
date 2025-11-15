// === Admin.jsx ===
const ADMINS = ['irina.abramova7@gmail.com', 'vladislavzilin@gmail.com']

import { useState, useMemo, useEffect } from 'react'
import {
  getSettings, saveSettings,
  getBookings, saveBookings,
  fmtDate, fmtTime, getCurrentUser
} from '../lib/storage'
import { exportBookingsToCSV } from '../lib/export'
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

// === Форматирование длительности ===
const formatDuration = (minutes) => {
  if (!minutes) return '—'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h && m) return `${h}h ${m}min`
  if (h) return `${h}h`
  return `${m}min`
}

export default function Admin() {
  const me = getCurrentUser()
  const isAdmin = me && (me.role === 'admin' || ADMINS.includes(me.email))

  if (!isAdmin) {
    return (
      <div className="card">
        <h3>Доступ запрещён</h3>
        <p className="muted">Эта страница доступна только администраторам.</p>
      </div>
    )
  }

  const { t } = useI18n()
  const [settings, setSettings] = useState(getSettings())
  const [bookings, setBookings] = useState(getBookings())
  const [showSettings, setShowSettings] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [toast, setToast] = useState(null)

  // === Обновление настроек ===
  const update = (patch) => {
    const next = { ...settings, ...patch }
    setSettings(next)
    saveSettings(next)
  }

  // === Следим за обновлением профиля ===
  useEffect(() => {
    const handler = () => setBookings(getBookings())
    window.addEventListener('profileUpdated', handler)
    return () => window.removeEventListener('profileUpdated', handler)
  }, [])

  // === Статистика ===
  const stats = useMemo(() => {
    const total = bookings.length
    const active = bookings.filter(b => b.status === 'approved' || b.status === 'pending').length
    const canceled = bookings.filter(b => b.status.includes('canceled')).length
    return { total, active, canceled }
  }, [bookings])

  // === Поиск и фильтр ===
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    const arr = bookings.filter(b => {
      const matchQ =
        !q ||
        (b.userName?.toLowerCase().includes(q) ||
        b.userPhone?.includes(q) ||
        b.userInstagram?.toLowerCase().includes(q))

      const matchStatus = statusFilter === 'all' ? true : b.status === statusFilter
      return matchQ && matchStatus
    })

    arr.sort((a, b) => new Date(a.start) - new Date(b.start))
    return arr
  }, [bookings, search, statusFilter])

  // === Отмена администратором ===
  const cancelByAdmin = (id) => {
    if (!confirm("Отменить запись?")) return
    const next = getBookings().map(b =>
      b.id === id ? { ...b, status: 'canceled_admin' } : b
    )
    saveBookings(next)
    setBookings(next)
  }

  // === Подтверждение ===
  const approveByAdmin = (id) => {
    const next = getBookings().map(b =>
      b.id === id ? { ...b, status: 'approved' } : b
    )
    saveBookings(next)
    setBookings(next)
  }

  // === Экспорт ===
  const handleExport = () => {
    const { name, count } = exportBookingsToCSV(filtered)
    setToast(`✔ Экспортировано ${count} → ${name}`)
    setTimeout(() => setToast(null), 3000)
  }

  // === PayPal ===
  const PAYPAL_EMAIL = "YOUR_PAYPAL_EMAIL@example.com"

  const handlePay = (b) => {
    if (!b.price) return

    const url =
      `https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&business=${encodeURIComponent(PAYPAL_EMAIL)}&currency_code=EUR&amount=${b.price.toFixed(2)}`
    
    return window.open(url, "_blank")
  }

  const statusLabel = (b) =>
    b.status === "approved" ? "🟢 " + t('approved')
      : b.status === "pending" ? "🟡 " + t('pending')
      : b.status === "canceled_client" ? "❌ " + t('canceled_by_client')
      : "🔴 " + t('canceled_by_admin')

  // ================================
  //          РЕНДЕР
  // ================================
  return (
    <div className="col" style={{ gap: 16 }}>

      {/* === Настройки === */}
      <div style={cardAurora}>
        <button onClick={() => setShowSettings(s => !s)} style={headerToggle}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Chevron open={showSettings} />  
            Редактировать настройки
          </span>
        </button>

        <div style={{
          maxHeight: showSettings ? 900 : 0,
          overflow: "hidden",
          transition: "max-height .35s ease"
        }}>
          <div style={{ paddingTop: 12 }}>
            <div className="row" style={{ gap: 12 }}>

              <div className="col">
                <label style={labelStyle}>{t('master_name')}</label>
                <input style={inputGlass}
                  value={settings.masterName}
                  onChange={e => update({ masterName: e.target.value })} />
              </div>

              <div className="col">
                <label style={labelStyle}>{t('admin_phone')}</label>
                <input style={inputGlass}
                  value={settings.adminPhone}
                  onChange={e => update({ adminPhone: e.target.value })} />
              </div>

            </div>

            <div className="row" style={{ gap: 12, marginTop: 12 }}>

              <div className="col">
                <label style={labelStyle}>{t('day_start')}</label>
                <select style={inputGlass}
                  value={settings.workStart}
                  onChange={e => update({ workStart: e.target.value })}>
                  {generateTimes(0, 12).map(t => <option key={t}>{t}</option>)}
                </select>
              </div>

              <div className="col">
                <label style={labelStyle}>{t('day_end')}</label>
                <select style={inputGlass}
                  value={settings.workEnd}
                  onChange={e => update({ workEnd: e.target.value })}>
                  {generateTimes(12, 24).map(t => <option key={t}>{t}</option>)}
                </select>
              </div>

              <div className="col">
                <label style={labelStyle}>{t('slot_minutes')}</label>
                <select style={inputGlass}
                  value={settings.slotMinutes}
                  onChange={e => update({ slotMinutes: parseInt(e.target.value, 10) })}>
                  {[15, 30, 45, 60].map(m => <option key={m}>{m}</option>)}
                </select>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* === ВСЕ ЗАПИСИ === */}
      <div style={cardAurora}>
        <div style={topBar}>
          <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>Все записи</div>
        </div>

        {/* Поиск, фильтры */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
          <input
            style={{ ...inputGlass, flex: "1 1 260px" }}
            placeholder="Поиск по имени / телефону / Instagram"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />

          <div style={segmented}>
            {[
              { v: 'all', label: t('all') },
              { v: 'pending', label: t('pending')},
              { v: 'approved', label: t('approved')},
              { v: 'canceled_client', label: t('canceled_by_client')},
              { v: 'canceled_admin', label: t('canceled_by_admin')}
            ].map(it => (
              <button
                key={it.v}
                onClick={() => setStatusFilter(it.v)}
                style={{ ...segBtn, ...(statusFilter === it.v ? segActive : {}) }}
              >
                {it.label}
              </button>
            ))}
          </div>

          <button style={{ ...btnPrimary, flex: "1" }} onClick={handleExport}>
            Экспорт
          </button>
        </div>

        {/* Статистика */}
        <div className="badge" style={{ marginBottom: 10 }}>
          Всего: {stats.total} • Активных: {stats.active} • Отменённых: {stats.canceled}
        </div>

        {/* Таблица */}
        <table className="table">
          <thead>
            <tr>
              <th>Клиент</th>
              <th>Instagram</th>
              <th>Дата</th>
              <th>Время</th>
              <th>Услуги</th>
              <th>Цена</th>
              <th>Длит.</th>
              <th>Статус</th>
              <th></th>
            </tr>
          </thead>

          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan="9" style={{ opacity: 0.6 }}>Нет записей</td>
              </tr>
            )}

            {filtered.map(b => {
              const inFuture = new Date(b.start) > new Date()

              return (
                <tr key={b.id}>
                  <td>
                    <b>{b.userName}</b>
                    <div style={{ fontSize: 12, opacity: 0.7 }}>{b.userPhone}</div>
                  </td>
                  <td>{b.userInstagram || '—'}</td>
                  <td>{fmtDate(b.start)}</td>
                  <td>{fmtTime(b.start)}–{fmtTime(b.end)}</td>

                  {/* Услуги */}
                  <td>
                    <div style={{ display: 'flex', gap: 6, flexWrap: "wrap" }}>
                      {b.services?.map(s => (
                        <div key={s} style={{
                          padding: "3px 8px",
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

                  {/* Цена */}
                  <td>{b.price ? `${b.price} €` : '—'}</td>

                  {/* Длительность */}
                  <td>{formatDuration(b.durationMinutes)}</td>

                  {/* Статус */}
                  <td>{statusLabel(b)}</td>

                  {/* Действия */}
                  <td style={{ textAlign: "right" }}>
                    {b.status === "pending" && (
                      <button style={btnOk} onClick={() => approveByAdmin(b.id)}>✔ Подтв.</button>
                    )}

                    {b.price && (
                      <button
                        onClick={() => handlePay(b)}
                        style={{
                          padding: "6px 12px",
                          marginLeft: 6,
                          borderRadius: 10,
                          border: "1px solid rgba(34,197,94,0.7)",
                          background: "rgba(22,100,40,0.45)",
                          color: "#bbf7d0",
                          cursor: "pointer"
                        }}
                      >
                        💳 Оплатить
                      </button>
                    )}

                    {inFuture && b.status !== "canceled_admin" && b.status !== "canceled_client" && (
                      <button style={btnDanger} onClick={() => cancelByAdmin(b.id)}>Отменить</button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {toast && <div className="toast">{toast}</div>}
      </div>
    </div>
  )
}

/* === UI компоненты === */
function Chevron({ open }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#cbb6ff" strokeWidth="2">
      {open ? <path d="M6 15l6-6 6 6" /> : <path d="M6 9l6 6 6-6" />}
    </svg>
  )
}

function generateTimes(start, end) {
  const arr = []
  for (let h = start; h < end; h++) {
    for (let m = 0; m < 60; m += 30) {
      arr.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    }
  }
  return arr
}

/* === Стили === */
const cardAurora = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(168,85,247,0.2)",
  borderRadius: 16,
  padding: 16
}

const headerToggle = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  padding: "12px 16px",
  borderRadius: 14,
  background: "rgba(25,10,45,0.55)",
  border: "1px solid rgba(168,85,247,0.25)",
  cursor: "pointer",
  color: "#fff"
}

const labelStyle = { fontSize: 12, opacity: 0.7, marginBottom: 4 }

const inputGlass = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid rgba(168,85,247,0.25)",
  background: "rgba(20,0,40,0.45)",
  color: "#fff"
}

const topBar = {
  display: "flex",
  justifyContent: "space-between",
  paddingBottom: 10
}

const btnBase = {
  padding: "6px 12px",
  borderRadius: 10,
  cursor: "pointer",
  color: "#fff",
  border: "1px solid rgba(168,85,247,0.45)"
}

const btnPrimary = {
  ...btnBase,
  background: "rgba(110,60,190,0.8)",
  border: "1px solid rgba(168,85,247,0.6)"
}

const btnOk = {
  ...btnPrimary,
  background: "rgba(34,197,94,0.45)",
  border: "1px solid rgba(34,197,94,0.7)"
}

const btnDanger = {
  ...btnBase,
  background: "rgba(255,50,50,0.35)",
  border: "1px solid rgba(255,70,70,0.7)",
  marginLeft: 6
}

const segmented = {
  display: "flex",
  gap: 6,
  padding: 4,
  background: "rgba(20,0,40,0.4)",
  border: "1px solid rgba(168,85,247,0.2)",
  borderRadius: 12
}

const segBtn = {
  ...btnBase,
  padding: "6px 12px",
  background: "transparent"
}

const segActive = {
  background: "rgba(110,60,190,0.8)",
  border: "1px solid rgba(168,85,247,0.6)"
}
