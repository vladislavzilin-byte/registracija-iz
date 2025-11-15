const ADMINS = ['irina.abramova7@gmail.com', 'vladislavzilin@gmail.com']

// дефолтные значения для услуг
const SERVICE_LIST = [
  { key: 'Šukuosena', label: 'Šukuosena' },
  { key: 'Tresų nuoma', label: 'Tresų nuoma' },
  { key: 'Papuošalų nuoma', label: 'Papuošalų nuoma' },
  { key: 'Atvykimas', label: 'Atvykimas' },
  { key: 'Konsultacija', label: 'Konsultacija' },
]

const DEFAULT_SERVICE_DURATIONS = {
  'Šukuosena': 60,
  'Tresų nuoma': 15,
  'Papuošalų nuoma': 15,
  'Atvykimas': 120,
  'Konsultacija': 30,
}

const DEFAULT_SERVICE_PRICES = {
  'Šukuosena': 50,
  'Tresų nuoma': 25,
  'Papuošalų nuoma': 10,
  'Atvykimas': 50,
  'Konsultacija': 10,
}

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

  // === НАСТРОЙКИ ===
  const [settings, setSettings] = useState(() => {
    const s = getSettings()
    return {
      ...s,
      serviceDurations: {
        ...DEFAULT_SERVICE_DURATIONS,
        ...(s.serviceDurations || {})
      },
      servicePrices: {
        ...DEFAULT_SERVICE_PRICES,
        ...(s.servicePrices || {})
      }
    }
  })

  const [bookings, setBookings] = useState(getBookings())
  const [showSettings, setShowSettings] = useState(false)
  const [showServiceSettings, setShowServiceSettings] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [toast, setToast] = useState<string | null>(null)

  const update = (patch) => {
    const next = { ...settings, ...patch }
    setSettings(next)
    saveSettings(next)
  }

  // Автообновление записей, если в профиле что-то меняют
  useEffect(() => {
    const handler = () => setBookings(getBookings())
    window.addEventListener('profileUpdated', handler)
    return () => window.removeEventListener('profileUpdated', handler)
  }, [])

  // === СТАТИСТИКА ===
  const stats = useMemo(() => {
    const total = bookings.length
    const active = bookings.filter(
      b => b.status === 'approved' || b.status === 'pending'
    ).length
    const canceled = bookings.filter(
      b => b.status === 'canceled_client' || b.status === 'canceled_admin'
    ).length
    return { total, active, canceled }
  }, [bookings])

  // === ФИЛЬТРАЦИЯ ===
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    const arr = bookings.filter(b => {
      const matchQ =
        !q ||
        (b.userName?.toLowerCase().includes(q) ||
          b.userPhone?.toLowerCase().includes(q) ||
          b.userInstagram?.toLowerCase().includes(q))

      const matchStatus =
        statusFilter === 'all' ? true : b.status === statusFilter

      return matchQ && matchStatus
    })
    arr.sort((a, b) => new Date(a.start) - new Date(b.start))
    return arr
  }, [bookings, search, statusFilter])

  // === ДЕЙСТВИЯ С ЗАПИСЯМИ ===
  const cancelByAdmin = (id) => {
    if (!confirm('Отменить эту запись?')) return
    const next = getBookings().map(b =>
      b.id === id
        ? { ...b, status: 'canceled_admin', canceledAt: new Date().toISOString() }
        : b
    )
    saveBookings(next)
    setBookings(next)
  }

  const approveByAdmin = (id) => {
    const next = getBookings().map(b =>
      b.id === id
        ? { ...b, status: 'approved', approvedAt: new Date().toISOString() }
        : b
    )
    saveBookings(next)
    setBookings(next)
  }

  // пометить оплаченной / снять оплату
  const togglePaid = (id) => {
    const next = getBookings().map(b =>
      b.id === id ? { ...b, paid: !b.paid } : b
    )
    saveBookings(next)
    setBookings(next)
  }

  const handleExport = () => {
    const { name, count } = exportBookingsToCSV(filtered)
    setToast(`✅ ${t('export')} ${count} → ${name}`)
    setTimeout(() => setToast(null), 3500)
  }

  const statusLabel = (b) =>
    b.status === 'approved' ? '🟢 ' + t('approved')
      : b.status === 'pending' ? '🟡 ' + t('pending')
      : (b.status === 'canceled_client'
        ? '❌ ' + t('canceled_by_client')
        : '🔴 ' + t('canceled_by_admin'))

  const paymentLabel = (b) => {
    const baseDot = {
      display: 'inline-block',
      width: 10,
      height: 10,
      borderRadius: '999px',
      marginRight: 6,
    } as const

    if (b.paid) {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <span
            style={{
              ...baseDot,
              background: '#22c55e',
              boxShadow: '0 0 8px rgba(34,197,94,0.8)',
              animation: 'pulsePay 1.4s infinite',
            }}
          />
          <span>Apmokėta</span>
        </span>
      )
    }
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        <span
          style={{
            ...baseDot,
            background: '#f97373',
            boxShadow: '0 0 8px rgba(248,113,113,0.7)',
          }}
        />
        <span>Neapmokėta</span>
      </span>
    )
  }

  // === РЕНДЕР ===
  return (
    <div className="col" style={{ gap: 16 }}>
      <style>{`
        @keyframes pulsePay {
          0% { transform: scale(1); opacity: 0.7; }
          50% { transform: scale(1.25); opacity: 1; }
          100% { transform: scale(1); opacity: 0.7; }
        }
      `}</style>

      {/* === РЕДАКТИРОВАТЬ НАСТРОЙКИ (как было) === */}
      <div style={{ width: '100%' }}>
        <div style={cardAurora}>
          <button onClick={() => setShowSettings(s => !s)} style={headerToggle}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
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
                  <label style={labelStyle}>{t('master_name')}</label>
                  <input
                    style={inputGlass}
                    value={settings.masterName || ''}
                    onChange={e => update({ masterName: e.target.value })}
                  />
                </div>
                <div className="col">
                  <label style={labelStyle}>{t('admin_phone')}</label>
                  <input
                    style={inputGlass}
                    value={settings.adminPhone || ''}
                    onChange={e => update({ adminPhone: e.target.value })}
                  />
                </div>
              </div>

              <div className="row" style={{ gap: 12, marginTop: 12 }}>
                <div className="col">
                  <label style={labelStyle}>{t('day_start')}</label>
                  <select
                    style={inputGlass}
                    value={settings.workStart}
                    onChange={e => update({ workStart: e.target.value })}
                  >
                    {generateTimes(0, 12).map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div className="col">
                  <label style={labelStyle}>{t('day_end')}</label>
                  <select
                    style={inputGlass}
                    value={settings.workEnd}
                    onChange={e => update({ workEnd: e.target.value })}
                  >
                    {generateTimes(12, 24).map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div className="col">
                  <label style={labelStyle}>{t('slot_minutes')}</label>
                  <select
                    style={inputGlass}
                    value={settings.slotMinutes}
                    onChange={e => update({ slotMinutes: parseInt(e.target.value, 10) })}
                  >
                    {[15, 30, 45, 60].map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* === НОВЫЙ БЛОК: НАСТРОЙКИ УСЛУГ === */}
      <div style={{ width: '100%' }}>
        <div style={cardAurora}>
          <button
            onClick={() => setShowServiceSettings(s => !s)}
            style={headerToggle}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
              <Chevron open={showServiceSettings} />
              <span style={{ fontWeight: 700 }}>
                Настройки услуг (длительность и цена)
              </span>
            </span>
          </button>

          <div style={{
            maxHeight: showServiceSettings ? 1000 : 0,
            overflow: 'hidden',
            transition: 'max-height .35s ease'
          }}>
            <div style={{ paddingTop: 10 }}>
              {SERVICE_LIST.map(svc => {
                const duration =
                  settings.serviceDurations?.[svc.key] ??
                  DEFAULT_SERVICE_DURATIONS[svc.key]
                const price =
                  settings.servicePrices?.[svc.key] ??
                  DEFAULT_SERVICE_PRICES[svc.key]

                return (
                  <div
                    key={svc.key}
                    className="row"
                    style={{
                      gap: 10,
                      marginBottom: 10,
                      alignItems: 'flex-end',
                    }}
                  >
                    <div className="col" style={{ flex: 1.3 }}>
                      <label style={{ ...labelStyle, fontWeight: 600 }}>
                        {svc.label}
                      </label>
                    </div>

                    <div className="col" style={{ flex: 1 }}>
                      <label style={labelStyle}>Минут</label>
                      <input
                        type="number"
                        min="0"
                        style={inputGlass}
                        value={duration}
                        onChange={e => {
                          const v = parseInt(e.target.value || '0', 10)
                          update({
                            serviceDurations: {
                              ...(settings.serviceDurations || {}),
                              [svc.key]: isNaN(v) ? 0 : v
                            }
                          })
                        }}
                      />
                    </div>

                    <div className="col" style={{ flex: 1 }}>
                      <label style={labelStyle}>Kaina, €</label>
                      <input
                        type="number"
                        min="0"
                        style={inputGlass}
                        value={price}
                        onChange={e => {
                          const v = parseFloat(e.target.value || '0')
                          update({
                            servicePrices: {
                              ...(settings.servicePrices || {}),
                              [svc.key]: isNaN(v) ? 0 : v
                            }
                          })
                        }}
                      />
                    </div>
                  </div>
                )
              })}

              <p
                className="muted"
                style={{ fontSize: 12, marginTop: 4 }}
              >
                Эти значения используются для расчёта примерной цены и длительности
                при создании записи (логика в Calendar.jsx можно будет привязать к
                этим настройкам).
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* === ВСЕ ЗАПИСИ === */}
      <div style={{ width: '100%' }}>
        <div style={cardAurora}>
          <div style={topBar}>
            <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>Все записи</div>
          </div>

          <div
            style={{
              display: 'flex',
              gap: 10,
              margin: '8px 0 12px 0',
              flexWrap: 'wrap'
            }}
          >
            <input
              style={{ ...inputGlass, flex: '1 1 260px' }}
              placeholder={t('search_placeholder')}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <div style={segmented}>
              {[
                { v: 'all', label: t('all') },
                { v: 'pending', label: t('pending') },
                { v: 'approved', label: t('approved') },
                { v: 'canceled_client', label: t('canceled_by_client') },
                { v: 'canceled_admin', label: t('canceled_by_admin') }
              ].map(it => (
                <button
                  key={it.v}
                  onClick={() => setStatusFilter(it.v)}
                  style={{
                    ...segBtn,
                    ...(statusFilter === it.v ? segActive : {})
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
                <th>{t('status')}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(b => {
                const inFuture = new Date(b.start) > new Date()
                const price = b.price || 0
                const services =
                  Array.isArray(b.services) && b.services.length
                    ? b.services.join(', ')
                    : '—'

                return (
                  <tr
                    key={b.id}
                    style={{ opacity: b.status === 'approved' ? 1 : 0.97 }}
                  >
                    <td>
                      <b>{b.userName}</b>
                      <div
                        className="muted"
                        style={{ fontSize: 12 }}
                      >
                        {b.userPhone}
                      </div>
                    </td>
                    <td>{b.userInstagram || '-'}</td>
                    <td>{fmtDate(b.start)}</td>
                    <td>
                      {fmtTime(b.start)}–{fmtTime(b.end)}
                    </td>
                    <td>{services}</td>
                    <td>{price ? `${price} €` : '—'}</td>
                    <td>{paymentLabel(b)}</td>
                    <td>{statusLabel(b)}</td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <div
                        style={{
                          display: 'flex',
                          gap: 6,
                          justifyContent: 'flex-end',
                        }}
                      >
                        <button
                          style={btnBase}
                          onClick={() => togglePaid(b.id)}
                        >
                          {b.paid ? 'Снять оплату' : 'Пометить оплаченной'}
                        </button>

                        {b.status === 'pending' && (
                          <button
                            style={btnOk}
                            onClick={() => approveByAdmin(b.id)}
                          >
                            {t('approve')}
                          </button>
                        )}

                        {b.status !== 'canceled_admin' &&
                          b.status !== 'canceled_client' &&
                          inFuture && (
                            <button
                              style={btnDanger}
                              onClick={() => cancelByAdmin(b.id)}
                            >
                              {t('rejected')}
                            </button>
                          )}
                      </div>
                    </td>
                  </tr>
                )
              })}
              {!filtered.length && (
                <tr>
                  <td colSpan={9}>
                    <small className="muted">{t('no_records')}</small>
                  </td>
                </tr>
              )}
            </tbody>
          </table>

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

/* === Дополнительные функции === */
function Chevron({ open }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#cbb6ff"
      strokeWidth="2"
    >
      {open ? <path d="M6 15l6-6 6 6" /> : <path d="M6 9l6 6 6-6" />}
    </svg>
  )
}

function generateTimes(start, end) {
  const result = []
  for (let h = start; h < end; h++) {
    for (let m = 0; m < 60; m += 30) {
      const hh = String(h).padStart(2, '0')
      const mm = String(m).padStart(2, '0')
      result.push(`${hh}:${mm}`)
    }
  }
  return result
}

/* === Стили === */
const cardAurora = {
  background:
    'linear-gradient(180deg, rgba(255,255,255,0.035), rgba(255,255,255,0.02))',
  border: '1px solid rgba(168,85,247,0.18)',
  borderRadius: 16,
  padding: 14,
  boxShadow: '0 8px 30px rgba(0,0,0,0.35), inset 0 0 0 1px rgba(255,255,255,0.03)',
}

const headerToggle = {
  width: '100%',
  display: 'flex',
  justifyContent: 'space-between',
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
  display: 'block',
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
  transition: '0.2s',
  background: 'rgba(25,10,45,0.7)',
  color: '#fff',
}
const btnPrimary = {
  ...btnBase,
  background:
    'linear-gradient(180deg, rgba(110,60,190,0.9), rgba(60,20,110,0.9))',
  boxShadow: '0 0 14px rgba(150,85,247,0.35)',
}
const btnOk = { ...btnPrimary }
const btnDanger = {
  ...btnBase,
  border: '1px solid rgba(239,68,68,.6)',
  background: 'rgba(110,20,30,.35)',
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
  background:
    'linear-gradient(180deg, rgba(110,60,190,0.9), rgba(60,20,110,0.9))',
  border: '1px solid rgba(180,95,255,0.7)',
  boxShadow: '0 0 12px rgba(150,90,255,0.30)',
}
