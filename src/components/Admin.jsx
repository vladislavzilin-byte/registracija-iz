const ADMINS = ['irina.abramova7@gmail.com', 'vladislavzilin@gmail.com']

import { useState, useMemo, useEffect } from 'react'
import {
  getSettings, saveSettings,
  getBookings, saveBookings,
  fmtDate, fmtTime, getCurrentUser
} from '../lib/storage'
import { exportBookingsToCSV } from '../lib/export'
import { useI18n } from '../lib/i18n'

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

  const update = (patch) => {
    const next = { ...settings, ...patch }
    setSettings(next)
    saveSettings(next)
  }

  // обновление при изменении профиля
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
    const paid = bookings.filter(b => b.paid).length
    return { total, active, canceled, paid }
  }, [bookings])

  // === фильтрация ===
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    const arr = bookings.filter(b => {
      const matchesQ =
        !q ||
        (b.userName?.toLowerCase().includes(q) ||
         b.userPhone?.includes(q) ||
         b.userInstagram?.toLowerCase().includes(q))

      const matchesStatus = statusFilter === 'all'
        ? true
        : b.status === statusFilter

      return matchesQ && matchesStatus
    })

    arr.sort((a, b) => new Date(a.start) - new Date(b.start))
    return arr
  }, [bookings, search, statusFilter])

  // === отменить запись ===
  const cancelByAdmin = (id) => {
    if (!confirm('Отменить запись?')) return
    const updated = getBookings().map(b =>
      b.id === id ? { ...b, status: 'canceled_admin' } : b
    )
    saveBookings(updated)
    setBookings(updated)
  }

  // === подтвердить запись ===
  const approveByAdmin = (id) => {
    const updated = getBookings().map(b =>
      b.id === id ? { ...b, status: 'approved' } : b
    )
    saveBookings(updated)
    setBookings(updated)
  }

  // === пометить оплату ===
  const markPaid = (id, paid) => {
    const updated = getBookings().map(b =>
      b.id === id ? { ...b, paid, paidAt: paid ? new Date().toISOString() : null } : b
    )
    saveBookings(updated)
    setBookings(updated)
  }

  // === экспорт CSV ===
  const handleExport = () => {
    const { name, count } = exportBookingsToCSV(filtered)
    setToast(`✅ Экспортировано ${count} → ${name}`)
    setTimeout(() => setToast(null), 3500)
  }

  // === отображение статуса ===
  const statusLabel = (b) =>
    b.status === 'approved'
      ? '🟢 Подтверждена'
      : b.status === 'pending'
      ? '🟡 Ожидает'
      : b.status === 'canceled_client'
      ? '❌ Отменена клиентом'
      : '🔴 Отменена администратором'

  // === статус оплаты ===
  const paidLabel = (b) =>
    b.paid ? "💚 Apmokėta" : "🔴 Neapmokėta"

  return (
    <div className="col" style={{ gap: 16 }}>

      {/* === НАСТРОЙКИ === */}
      <div style={{ width: '100%' }}>
        <div style={cardAurora}>
          <button onClick={() => setShowSettings(s => !s)} style={headerToggle}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Chevron open={showSettings} />
              <span style={{ fontWeight: 700 }}>Редактировать настройки</span>
            </span>
          </button>

          <div style={{
            maxHeight: showSettings ? 1000 : 0,
            overflow: 'hidden',
            transition: 'max-height .35s ease'
          }}>
            <div style={{ paddingTop: 10 }}>
              <div className="row" style={{ gap: 12 }}>
                <div className="col">
                  <label style={labelStyle}>Имя мастера</label>
                  <input style={inputGlass}
                    value={settings.masterName}
                    onChange={e => update({ masterName: e.target.value })} />
                </div>

                <div className="col">
                  <label style={labelStyle}>Телефон</label>
                  <input style={inputGlass}
                    value={settings.adminPhone}
                    onChange={e => update({ adminPhone: e.target.value })} />
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* === ВСЕ ЗАПИСИ === */}
      <div style={{ width: '100%' }}>
        <div style={cardAurora}>
          <div style={topBar}>
            <div style={{ fontWeight: 700, fontSize: "1.05rem" }}>Все записи</div>
          </div>

          {/* Поиск + фильтры */}
          <div style={{ display: "flex", gap: 10, margin: "8px 0 12px", flexWrap: "wrap" }}>
            <input
              style={{ ...inputGlass, flex: "1" }}
              placeholder="Поиск…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <div style={segmented}>
              {[
                { v: "all", label: "Все" },
                { v: "pending", label: "Ожидает" },
                { v: "approved", label: "Подтверждена" },
                { v: "canceled_client", label: "Отмена клиентом" },
                { v: "canceled_admin", label: "Отмена админом" },
              ].map((it) => (
                <button
                  key={it.v}
                  onClick={() => setStatusFilter(it.v)}
                  style={{ ...segBtn, ...(statusFilter === it.v ? segActive : {}) }}
                >
                  {it.label}
                </button>
              ))}
            </div>

            <button style={{ ...btnPrimary }} onClick={handleExport}>
              Экспорт
            </button>
          </div>

          {/* таблица */}
          <table className="table" style={{ marginTop: 6 }}>
            <thead>
              <tr>
                <th>Клиент</th>
                <th>Instagram</th>
                <th>Дата</th>
                <th>Время</th>
                <th>Услуги</th>
                <th>Цена</th>
                <th>Оплата</th>
                <th>Статус</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {!filtered.length && (
                <tr><td colSpan="9"><small className="muted">Нет записей</small></td></tr>
              )}

              {filtered.map((b) => {
                const future = new Date(b.start) > new Date()

                return (
                  <tr key={b.id}>
                    <td><b>{b.userName}</b><div className="muted">{b.userPhone}</div></td>
                    <td>{b.userInstagram || '-'}</td>
                    <td>{fmtDate(b.start)}</td>
                    <td>{fmtTime(b.start)}–{fmtTime(b.end)}</td>
                    <td>{Array.isArray(b.services) ? b.services.join(", ") : "—"}</td>
                    <td>{b.price ? `${b.price} €` : "—"}</td>

                    {/* === ОПЛАТА === */}
                    <td>
                      <div>{paidLabel(b)}</div>

                      {b.price && (
                        <button
                          style={{
                            marginTop: 4,
                            padding: "4px 8px",
                            borderRadius: 8,
                            border: "1px solid rgba(255,255,255,0.25)",
                            cursor: "pointer",
                            background: "rgba(255,255,255,0.05)",
                            color: "#fff",
                            fontSize: 12
                          }}
                          onClick={() => markPaid(b.id, !b.paid)}
                        >
                          {b.paid ? "Снять оплату" : "Пометить оплаченной"}
                        </button>
                      )}
                    </td>

                    <td>{statusLabel(b)}</td>

                    <td style={{ textAlign: "right" }}>
                      {b.status === "pending" && (
                        <button style={btnOk} onClick={() => approveByAdmin(b.id)}>
                          Подтвердить
                        </button>
                      )}

                      {future &&
                        !b.status.includes("canceled") && (
                          <button style={btnDanger} onClick={() => cancelByAdmin(b.id)}>
                            Отменить
                          </button>
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
    </div>
  )
}

/* === ИКОНКА-СТРЕЛКА === */
function Chevron({ open }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#cbb6ff" strokeWidth="2">
      {open ? <path d="M6 15l6-6 6 6" /> : <path d="M6 9l6 6 6-6" />}
    </svg>
  )
}

/* === СТИЛИ (оставлены прежние) === */

const cardAurora = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(168,85,247,0.25)',
  borderRadius: 16,
  padding: 14
}

const headerToggle = {
  width: '100%',
  borderRadius: 12,
  padding: '14px 18px',
  background: 'rgba(25,10,65,0.45)',
  border: '1px solid rgba(168,85,247,0.35)',
  color: '#fff',
  cursor: 'pointer'
}

const labelStyle = { fontSize: 12, opacity: 0.8, marginBottom: 6 }

const inputGlass = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 10,
  background: 'rgba(17,0,40,0.45)',
  border: '1px solid rgba(168,85,247,0.35)',
  color: '#fff'
}

const topBar = { display: 'flex', justifyContent: 'space-between' }

const btnBase = {
  borderRadius: 10,
  padding: "8px 14px",
  cursor: "pointer",
  border: "1px solid rgba(168,85,247,0.45)"
}

const btnPrimary = {
  ...btnBase,
  background: "rgba(110,60,190,0.9)",
  color: "#fff"
}

const btnOk = {
  ...btnPrimary,
  marginRight: 6
}

const btnDanger = {
  ...btnBase,
  border: "1px solid rgba(239,68,68,.6)",
  background: "rgba(110,20,30,.35)",
  color: "#fff"
}

const segmented = {
  display: "flex",
  gap: 8,
  padding: 6,
  borderRadius: 12,
  background: "rgba(17,0,40,0.45)",
  border: "1px solid rgba(168,85,247,0.25)"
}

const segBtn = {
  ...btnBase,
  padding: "8px 12px",
  background: "rgba(25,10,45,0.35)"
}

const segActive = {
  background: "rgba(110,60,190,0.9)",
  border: "1px solid rgba(190,120,255,0.7)",
  boxShadow: "0 0 10px rgba(160,85,255,0.4)"
}
