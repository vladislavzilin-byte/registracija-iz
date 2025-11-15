const ADMINS = ['irina.abramova7@gmail.com', 'vladislavzilin@gmail.com']

import { useState, useMemo, useEffect } from 'react'
import {
  getSettings,
  saveSettings,
  getBookings,
  saveBookings,
  fmtDate,
  fmtTime,
  getCurrentUser,
} from '../lib/storage'
import { exportBookingsToCSV } from '../lib/export'
import { useI18n } from '../lib/i18n'

// === дефолтные услуги, если в настройках ещё нет serviceList ===
const DEFAULT_SERVICES = [
  { name: 'Šukuosena', duration: 60, deposit: 50 },
  { name: 'Tresų nuoma', duration: 15, deposit: 25 },
  { name: 'Papuošalų nuoma', duration: 15, deposit: 10 },
  { name: 'Atvykimas', duration: 180, deposit: 50 },
  { name: 'Konsultacija', duration: 30, deposit: 10 },
]

// цвета для тегов услуг
const serviceStyles = {
  'Šukuosena': {
    bg: 'rgba(99,102,241,0.16)',
    border: '1px solid rgba(129,140,248,0.8)',
  },
  'Tresų nuoma': {
    bg: 'rgba(56,189,248,0.16)',
    border: '1px solid rgba(56,189,248,0.8)',
  },
  'Papuošalų nuoma': {
    bg: 'rgba(245,158,11,0.14)',
    border: '1px solid rgba(245,158,11,0.9)',
  },
  Atvykimas: {
    bg: 'rgba(248,113,113,0.14)',
    border: '1px solid rgba(248,113,113,0.9)',
  },
  Konsultacija: {
    bg: 'rgba(34,197,94,0.14)',
    border: '1px solid rgba(34,197,94,0.9)',
  },
}

/* ===== helpers для дат/времени ===== */
const pad2 = (n) => String(n).padStart(2, '0')

const toInputDate = (dateLike) => {
  const d = new Date(dateLike)
  if (isNaN(d)) return ''
  const y = d.getFullYear()
  const m = pad2(d.getMonth() + 1)
  const day = pad2(d.getDate())
  return `${y}-${m}-${day}`
}

const toInputTime = (dateLike) => {
  const d = new Date(dateLike)
  if (isNaN(d)) return ''
  const hh = pad2(d.getHours())
  const mm = pad2(d.getMinutes())
  return `${hh}:${mm}`
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

  // === НАСТРОЙКИ ===
  const [settings, setSettings] = useState(() => {
    const s = getSettings()
    if (!Array.isArray(s.serviceList) || !s.serviceList.length) {
      s.serviceList = [...DEFAULT_SERVICES]
      saveSettings(s)
    }
    return s
  })

  const [bookings, setBookings] = useState(getBookings())
  const [showSettings, setShowSettings] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [toast, setToast] = useState(null)

  const updateSettings = (patch) => {
    const next = { ...settings, ...patch }
    setSettings(next)
    saveSettings(next)
  }

  // синк записей при обновлении профиля
  useEffect(() => {
    const handler = () => setBookings(getBookings())
    window.addEventListener('profileUpdated', handler)
    return () => window.removeEventListener('profileUpdated', handler)
  }, [])

  // === СТАТИСТИКА ===
  const stats = useMemo(() => {
    const total = bookings.length
    const active = bookings.filter(
      (b) => b.status === 'approved' || b.status === 'pending'
    ).length
    const canceled = bookings.filter(
      (b) => b.status === 'canceled_client' || b.status === 'canceled_admin'
    ).length
    return { total, active, canceled }
  }, [bookings])

  // === ФИЛЬТР СПИСКА ===
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()

    const arr = bookings.filter((b) => {
      const matchQ =
        !q ||
        (b.userName?.toLowerCase().includes(q) ||
          b.userPhone?.toLowerCase().includes(q) ||
          b.userInstagram?.toLowerCase().includes(q))

      const matchStatus =
        statusFilter === 'all'
          ? true
          : b.status === statusFilter

      return matchQ && matchStatus
    })

    arr.sort((a, b) => new Date(a.start) - new Date(b.start))
    return arr
  }, [bookings, search, statusFilter])

    // === helper для обновления одной записи ===
  const updateBooking = (id, updater) => {
    const all = getBookings()
    const next = all.map((b) => (b.id === id ? updater(b) : b))
    saveBookings(next)
    setBookings(next)
  }

  // === ДЕЙСТВИЯ С ЗАПИСЯМИ ===
  const cancelByAdmin = (id) => {
    if (!confirm('Отменить эту запись?')) return
    updateBooking(id, (b) => ({
      ...b,
      status: 'canceled_admin',
      canceledAt: new Date().toISOString(),
    }))
  }

  const approveByAdmin = (id) => {
    updateBooking(id, (b) => ({
      ...b,
      status: 'approved',
      approvedAt: new Date().toISOString(),
    }))
  }

  const togglePaid = (id) => {
    updateBooking(id, (b) => ({
      ...b,
      paid: !b.paid,
    }))
  }

  const handleExport = () => {
    const { name, count } = exportBookingsToCSV(filtered)
    setToast(`✅ ${t('export')} ${count} → ${name}`)
    setTimeout(() => setToast(null), 3500)
  }

  const statusLabel = (b) =>
    b.status === 'approved'
      ? '🟢 ' + t('approved')
      : b.status === 'pending'
      ? '🟡 ' + t('pending')
      : b.status === 'canceled_client'
      ? '❌ ' + t('canceled_by_client')
      : '🔴 ' + t('canceled_by_admin')

  // === РАБОТА С УСЛУГАМИ В НАСТРОЙКАХ ===
  const services = settings.serviceList || []

  const updateServiceField = (index, field, value) => {
    const next = [...services]
    next[index] = {
      ...next[index],
      [field]:
        field === 'duration' || field === 'deposit'
          ? Number(value) || 0
          : value,
    }
    updateSettings({ serviceList: next })
  }

  const addService = () => {
    const next = [
      ...services,
      { name: 'Новая услуга', duration: 60, deposit: 0 },
    ]
    updateSettings({ serviceList: next })
  }

  const removeService = (index) => {
    if (services.length <= 1) return
    const next = services.filter((_, i) => i !== index)
    updateSettings({ serviceList: next })
  }

  return (
    <div className="col" style={{ gap: 16 }}>
      {/* === РЕДАКТИРОВАТЬ НАСТРОЙКИ + УСЛУГИ === */}
      <div style={{ width: '100%' }}>
        <div style={cardAurora}>
          <button
            onClick={() => setShowSettings((s) => !s)}
            style={headerToggle}
          >
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <Chevron open={showSettings} />
              <span style={{ fontWeight: 700 }}>Редактировать настройки</span>
            </span>
          </button>

          <div
            style={{
              maxHeight: showSettings ? 1200 : 0,
              overflow: 'hidden',
              transition: 'max-height .35s ease',
            }}
          >
            <div style={{ paddingTop: 10 }}>
              {/* БАЗОВЫЕ НАСТРОЙКИ */}
              <div className="row" style={{ gap: 12 }}>
                <div className="col">
                  <label style={labelStyle}>{t('master_name')}</label>
                  <input
                    style={inputGlass}
                    value={settings.masterName}
                    onChange={(e) =>
                      updateSettings({ masterName: e.target.value })
                    }
                  />
                </div>
                <div className="col">
                  <label style={labelStyle}>{t('admin_phone')}</label>
                  <input
                    style={inputGlass}
                    value={settings.adminPhone}
                    onChange={(e) =>
                      updateSettings({ adminPhone: e.target.value })
                    }
                  />
                </div>
              </div>

              <div
                className="row"
                style={{ gap: 12, marginTop: 12, marginBottom: 8 }}
              >
                <div className="col">
                  <label style={labelStyle}>{t('day_start')}</label>
                  <select
                    style={inputGlass}
                    value={settings.workStart}
                    onChange={(e) =>
                      updateSettings({ workStart: e.target.value })
                    }
                  >
                    {generateTimes(0, 12).map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col">
                  <label style={labelStyle}>{t('day_end')}</label>
                  <select
                    style={inputGlass}
                    value={settings.workEnd}
                    onChange={(e) =>
                      updateSettings({ workEnd: e.target.value })
                    }
                  >
                    {generateTimes(12, 24).map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col">
                  <label style={labelStyle}>{t('slot_minutes')}</label>
                  <select
                    style={inputGlass}
                    value={settings.slotMinutes}
                    onChange={(e) =>
                      updateSettings({
                        slotMinutes: parseInt(e.target.value, 10),
                      })
                    }
                  >
                    {[15, 30, 45, 60].map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* === УСЛУГИ === */}
              <div
                style={{
                  marginTop: 18,
                  paddingTop: 14,
                  borderTop: '1px solid rgba(148,85,247,0.35)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 8,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>
                      Услуги
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        opacity: 0.75,
                        maxWidth: 480,
                      }}
                    >
                      Изменяйте название, длительность и залог каждой услуги.
                    </div>
                  </div>

                  <button
                    type="button"
                    style={btnPrimary}
                    onClick={addService}
                  >
                    + Добавить услугу
                  </button>
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    marginTop: 6,
                  }}
                >
                  {services.map((s, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'grid',
                        gridTemplateColumns:
                          'minmax(140px, 1.4fr) minmax(80px, .7fr) minmax(80px, .7fr) auto',
                        gap: 8,
                        alignItems: 'center',
                      }}
                    >
                      <input
                        style={inputGlass}
                        value={s.name}
                        onChange={(e) =>
                          updateServiceField(idx, 'name', e.target.value)
                        }
                      />

                      <input
                        style={inputGlass}
                        type="number"
                        min="0"
                        value={s.duration}
                        onChange={(e) =>
                          updateServiceField(idx, 'duration', e.target.value)
                        }
                      />

                      <input
                        style={inputGlass}
                        type="number"
                        min="0"
                        value={s.deposit}
                        onChange={(e) =>
                          updateServiceField(idx, 'deposit', e.target.value)
                        }
                      />

                      <button
                        onClick={() => removeService(idx)}
                        style={{
                          borderRadius: 10,
                          padding: '8px 10px',
                          border: '1px solid rgba(248,113,113,0.7)',
                          background: 'rgba(127,29,29,0.6)',
                          color: '#fff',
                          cursor: 'pointer',
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

           {/* === ВСЕ ЗАПИСИ (КАРТОЧКИ) === */}
      <div style={{ width: '100%' }}>
        <div style={cardAurora}>
          <div style={topBar}>
            <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>
              Все записи
            </div>
          </div>

          {/* ПОИСК + ФИЛЬТРЫ */}
          <div
            style={{
              display: 'flex',
              gap: 10,
              margin: '8px 0 12px 0',
              flexWrap: 'wrap',
            }}
          >
            <input
              style={{ ...inputGlass, flex: '1 1 260px' }}
              placeholder={t('search_placeholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <div style={segmented}>
              {[ 
                { v: 'all', label: t('all') },
                { v: 'pending', label: t('pending') },
                { v: 'approved', label: t('approved') },
                { v: 'canceled_client', label: t('canceled_by_client') },
                { v: 'canceled_admin', label: t('canceled_by_admin') },
              ].map((it) => (
                <button
                  key={it.v}
                  onClick={() => setStatusFilter(it.v)}
                  style={{
                    ...segBtn,
                    ...(statusFilter === it.v ? segActive : {}),
                  }}
                >
                  {it.label}
                </button>
              ))}
            </div>

            <button
              style={{ ...btnPrimary, flex: '1' }}
              onClick={handleExport}
            >
              {t('export')}
            </button>
          </div>

          <div className="badge" style={{ marginBottom: 10 }}>
            {t('total')}: {stats.total} • {t('total_active')}: {stats.active} •{' '}
            {t('total_canceled')}: {stats.canceled}
          </div>

          {/* === КАРТОЧКИ — СПИСОК === */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 18,
              marginTop: 12,
            }}
          >
            {filtered.map((b) => {
              const inFuture = new Date(b.start) > new Date()
              const servicesArr = Array.isArray(b.services) ? b.services : []

              const startDate = new Date(b.start)
              const endDate = new Date(b.end || b.start)

              const serviceTagStyle = (name) => {
                const st = serviceStyles[name] || {
                  bg: 'rgba(148,163,184,0.15)',
                  border: '1px solid rgba(148,163,184,0.7)',
                }
                return {
                  padding: '4px 12px',
                  borderRadius: 999,
                  fontSize: 13,
                  ...st,
                }
              }

              return (
                <div
                  key={b.id}
                  style={{
                    borderRadius: 16,
                    border: '1px solid rgba(168,85,247,0.25)',
                    background: 'rgba(15,10,25,0.85)',
                    padding: '16px 20px',
                    boxShadow: '0 0 18px rgba(168,85,247,0.20)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                  }}
                >
                  {/* === HEADER: ТОЧКА + ДАТА + ВРЕМЯ ОТ/ДО === */}
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 10,
                      alignItems: 'center',
                    }}
                  >
                    {/* статус-точка */}
                    <span
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        background:
                          b.status === 'approved'
                            ? '#22c55e'
                            : b.status === 'pending'
                            ? '#eab308'
                            : '#ef4444',
                        boxShadow:
                          b.status === 'approved'
                            ? '0 0 8px rgba(34,197,94,0.9)'
                            : b.status === 'pending'
                            ? '0 0 8px rgba(234,179,8,0.9)'
                            : '0 0 8px rgba(248,113,113,0.9)',
                      }}
                    />

                    {/* Дата */}
                    <div style={{ minWidth: 140 }}>
                      <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 3 }}>
                        Дата
                      </div>
                      <input
                        type="date"
                        value={toInputDate(startDate)}
                        style={{ ...inputGlass, padding: '6px 10px', height: 32 }}
                        onChange={(e) => {
                          const val = e.target.value
                          if (!val) return
                          const [y, m, d] = val.split('-').map(Number)
                          updateBooking(b.id, (orig) => {
                            const oldStart = new Date(orig.start)
                            const oldEnd = new Date(orig.end || orig.start)
                            const duration = oldEnd - oldStart

                            const newStart = new Date(orig.start)
                            newStart.setFullYear(y, m - 1, d)

                            const newEnd = new Date(newStart.getTime() + Math.max(duration, 15 * 60000))

                            return { ...orig, start: newStart, end: newEnd }
                          })
                        }}
                      />
                    </div>

                    {/* Время от */}
                    <div style={{ minWidth: 110 }}>
                      <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 3 }}>
                        Время от
                      </div>
                      <input
                        type="time"
                        value={toInputTime(startDate)}
                        style={{ ...inputGlass, padding: '6px 10px', height: 32 }}
                        onChange={(e) => {
                          const [hh, mm] = e.target.value.split(':').map(Number)
                          updateBooking(b.id, (orig) => {
                            const start = new Date(orig.start)
                            const end = new Date(orig.end)

                            const newStart = new Date(orig.start)
                            newStart.setHours(hh, mm, 0, 0)

                            let newEnd = new Date(orig.end)
                            if (newEnd <= newStart) {
                              newEnd = new Date(newStart.getTime() + 15 * 60000)
                            }

                            return { ...orig, start: newStart, end: newEnd }
                          })
                        }}
                      />
                    </div>

                    {/* Время до */}
                    <div style={{ minWidth: 110 }}>
                      <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 3 }}>
                        Время до
                      </div>
                      <input
                        type="time"
                        value={toInputTime(endDate)}
                        style={{ ...inputGlass, padding: '6px 10px', height: 32 }}
                        onChange={(e) => {
                          const [hh, mm] = e.target.value.split(':').map(Number)
                          updateBooking(b.id, (orig) => {
                            const start = new Date(orig.start)
                            let newEnd = new Date(start)
                            newEnd.setHours(hh, mm, 0, 0)

                            if (newEnd <= start) {
                              newEnd = new Date(start.getTime() + 15 * 60000)
                            }

                            return { ...orig, end: newEnd }
                          })
                        }}
                      />
                    </div>

                    <div style={{ marginLeft: 'auto', opacity: 0.8, fontSize: 13 }}>
                      {fmtTime(b.start)} – {fmtTime(b.end)}
                    </div>
                  </div>

                  {/* Услуги */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {servicesArr.map((s, i) => (
                      <span key={i} style={serviceTagStyle(s)}>{s}</span>
                    ))}
                  </div>

                  {/* Клиент */}
                  <div style={{ marginTop: 6 }}>
                    <b>{b.userName}</b>
                    <div style={{ opacity: 0.8 }}>{b.userPhone}</div>
                    {b.userInstagram && (
                      <div style={{ opacity: 0.8 }}>@{b.userInstagram}</div>
                    )}
                  </div>

                  {/* Оплата */}
                  <div
                    style={{
                      marginTop: 6,
                      padding: '10px 12px',
                      borderRadius: 10,
                      border: '1px solid rgba(148,163,184,0.25)',
                      background: 'rgba(30,20,40,0.55)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          background: b.paid ? '#22c55e' : '#ef4444',
                          boxShadow: b.paid
                            ? '0 0 8px rgba(34,197,94,0.9)'
                            : '0 0 8px rgba(248,113,113,0.9)',
                        }}
                      />

                      <span
                        style={{
                          color: b.paid ? '#bbf7d0' : '#fecaca',
                          fontWeight: 600,
                        }}
                      >
                        {b.paid ? 'Apmokėta' : 'Neapmokėta'}
                      </span>
                    </div>

                    {/* Цена / аванс */}
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ minWidth: 90 }}>Avansas (€):</span>
                      <input
                        type="number"
                        value={b.price ?? ''}
                        style={{ ...inputGlass, maxWidth: 120, height: 32 }}
                        onChange={(e) => {
                          const val = e.target.value
                          updateBooking(b.id, (orig) => ({
                            ...orig,
                            price: val === '' ? null : Number(val),
                          }))
                        }}
                      />
                    </div>

                    <button
                      onClick={() => togglePaid(b.id)}
                      style={{
                        marginTop: 6,
                        width: '100%',
                        padding: 8,
                        borderRadius: 8,
                        border: '1px solid rgba(148,163,184,0.5)',
                        background: 'rgba(0,0,0,0.25)',
                        color: '#fff',
                        cursor: 'pointer',
                      }}
                    >
                      {b.paid ? 'Снять оплату' : 'Пометить оплаченой'}
                    </button>
                  </div>

                  {/* Статус */}
                  <div style={{ marginTop: 4 }}>
                    <b>{t('status')}:</b> {statusLabel(b)}
                  </div>

                  {/* Кнопки */}
                  <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                    {b.status === 'pending' && (
                      <button
                        onClick={() => approveByAdmin(b.id)}
                        style={{
                          flex: 1,
                          borderRadius: 10,
                          padding: 10,
                          background: 'linear-gradient(180deg, rgba(110,60,190,0.9), rgba(60,20,110,0.9))',
                          color: '#fff',
                          border: '1px solid rgba(168,85,247,0.45)',
                        }}
                      >
                        {t('approve')}
                      </button>
                    )}

                    {b.status !== 'canceled_admin' &&
                      b.status !== 'canceled_client' &&
                      inFuture && (
                        <button
                          onClick={() => cancelByAdmin(b.id)}
                          style={{
                            flex: 1,
                            borderRadius: 10,
                            padding: 10,
                            background: 'rgba(110,20,30,.35)',
                            border: '1px solid rgba(239,68,68,.6)',
                            color: '#fff',
                          }}
                        >
                          {t('rejected')}
                        </button>
                      )}
                  </div>
                </div>
              )
            })}

            {!filtered.length && (
              <small className="muted" style={{ marginTop: 20 }}>
                {t('no_records')}
              </small>
            )}
          </div>

          {toast && (
            <div className="toast" style={{ marginTop: 10 }}>
              {toast}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ==== ИКОНКА CHEVRON ==== */
function Chevron({ open }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#cbb6ff" strokeWidth="2">
      {open ? <path d="M6 15l6-6 6 6" /> : <path d="M6 9l6 6 6-6" />}
    </svg>
  )
}

/* ==== ГЕНЕРАТОР ВРЕМЕНИ ==== */
function generateTimes(start, end) {
  const result = []
  for (let h = start; h < end; h++) {
    for (let m = 0; m < 60; m += 30) {
      result.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    }
  }
  return result
}

/* === СТИЛИ === */
const cardAurora = {
  background: 'linear-gradient(180deg, rgba(255,255,255,0.035), rgba(255,255,255,0.02))',
  border: '1px solid rgba(168,85,247,0.18)',
  borderRadius: 16,
  padding: 14,
  boxShadow: '0 8px 30px rgba(0,0,0,0.35), inset 0 0 0 1px rgba(255,255,255,0.03)',
}

const headerToggle = {
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  borderRadius: 12,
  padding: '14px 18px',
  border: '1px solid rgba(168,85,247,0.25)',
  background: 'rgba(25,10,45,0.55)',
  color: '#fff',
  cursor: 'pointer',
}

const labelStyle = {
  fontSize: 12,
  opacity: 0.8,
  marginBottom: 6,
}

const inputGlass = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 10,
  color: '#fff',
  border: '1px solid rgba(168,85,247,0.35)',
  background: 'rgba(17,0,40,0.45)',
  outline: 'none',
}

const topBar = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '4px 2px 10px 2px',
}

const btnBase = {
  borderRadius: 10,
  padding: '8px 14px',
  fontWeight: 600,
  cursor: 'pointer',
  border: '1px solid rgba(168,85,247,0.45)',
}

const btnPrimary = {
  ...btnBase,
  background: 'linear-gradient(180deg, rgba(110,60,190,0.9), rgba(60,20,110,0.9))',
  color: '#fff',
  boxShadow: '0 0 14px rgba(150,85,247,0.35)',
}

const segmented = {
  display: 'flex',
  gap: 8,
  background: 'rgba(17,0,40,0.45)',
  border: '1px solid rgba(168,85,247,0.25)',
  borderRadius: 12,
  padding: 6,
}

const segBtn = {
  ...btnBase,
  padding: '8px 12px',
  background: 'rgba(25,10,45,0.35)',
  border: '1px solid rgba(168,85,247,0.25)',
}

const segActive = {
  background: 'linear-gradient(180deg, rgba(110,60,190,0.9), rgba(60,20,110,0.9))',
  border: '1px solid rgba(180,95,255,0.7)',
  boxShadow: '0 0 12px rgba(150,90,255,0.30)',
}
 
