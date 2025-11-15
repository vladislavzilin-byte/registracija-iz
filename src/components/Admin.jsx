const ADMINS = ['irina.abramova7@gmail.com', 'vladislavzilin@gmail.com']

import { useState, useMemo, useEffect } from 'react'
import {
  getSettings, saveSettings,
  getBookings, saveBookings,
  fmtDate, fmtTime, getCurrentUser
} from '../lib/storage'
import { exportBookingsToCSV } from '../lib/export'
import { useI18n } from '../lib/i18n'

/* === СТИЛИ ДЛЯ УСЛУГ === */
const serviceStyles = {
  'Šukuosena': {
    bg: 'rgba(120,80,255,0.22)',
    border: '1px solid rgba(168,85,247,0.55)'
  },
  'Tresų nuoma': {
    bg: 'rgba(0,150,255,0.22)',
    border: '1px solid rgba(0,170,255,0.55)'
  },
  'Papuošalų nuoma': {
    bg: 'rgba(200,150,0,0.22)',
    border: '1px solid rgba(210,160,0,0.55)'
  },
  'Atvykimas': {
    bg: 'rgba(255,80,80,0.22)',
    border: '1px solid rgba(255,100,100,0.55)'
  },
  'Konsultacija': {
    bg: 'rgba(80,200,150,0.22)',
    border: '1px solid rgba(80,220,170,0.55)'
  }
}

/* === АНИМАЦИИ === */
const tagAnimation = `
@keyframes tagFadeIn {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes pulsePaid {
  0%   { box-shadow: 0 0 0px 0 rgba(61,255,122,0.6); }
  70%  { box-shadow: 0 0 8px 4px rgba(61,255,122,0.0); }
  100% { box-shadow: 0 0 0px 0 rgba(61,255,122,0.0); }
}
`
const style = document.createElement('style')
style.innerHTML = tagAnimation
document.head.appendChild(style)


export default function Admin() {
  const me = getCurrentUser()
  const isAdmin = me && (me.role === 'admin' || ADMINS.includes(me.email))
  const { t } = useI18n()

  if (!isAdmin) {
    return (
      <div className="card">
        <h3>Доступ запрещён</h3>
        <p className="muted">Эта страница доступна только администраторам.</p>
      </div>
    )
  }

  const [bookings, setBookings] = useState(getBookings())
  const [settings, setSettings] = useState(getSettings())
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showSettings, setShowSettings] = useState(false)
  const [toast, setToast] = useState(null)

  /* === ОБНОВЛЕНИЕ ПРИ ИЗМЕНЕНИИ ДАННЫХ === */
  useEffect(() => {
    const handler = () => setBookings(getBookings())
    window.addEventListener('profileUpdated', handler)
    return () => window.removeEventListener('profileUpdated', handler)
  }, [])


  /* === ФИЛЬТРАЦИЯ === */
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return bookings
      .filter(b => {
        const matchQ =
          !q ||
          b.userName?.toLowerCase().includes(q) ||
          b.userPhone?.toLowerCase().includes(q) ||
          b.userInstagram?.toLowerCase().includes(q)

        const matchStatus =
          statusFilter === 'all' ? true : b.status === statusFilter

        return matchQ && matchStatus
      })
      .sort((a, b) => new Date(a.start) - new Date(b.start))
  }, [bookings, search, statusFilter])


  /* === ОПЛАТА === */
  const togglePaid = (id) => {
    const updated = getBookings().map(b =>
      b.id === id
        ? { ...b, paid: !b.paid }
        : b
    )
    saveBookings(updated)
    setBookings(updated)
  }


  /* === ОТМЕНА === */
  const cancelByAdmin = (id) => {
    if (!confirm('Точно отменить запись?')) return
    const updated = getBookings().map(b =>
      b.id === id ? { ...b, status: 'canceled_admin' } : b
    )
    saveBookings(updated)
    setBookings(updated)
  }

  /* === ЭКСПОРТ === */
  const handleExport = () => {
    const { name, count } = exportBookingsToCSV(filtered)
    setToast(`✔ Экспортировано ${count} → ${name}`)
    setTimeout(() => setToast(null), 3000)
  }


  /* === КАРТОЧКИ УСЛУГ === */
  const Tags = ({ services }) => (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {services.map((s, i) => {
        const style = serviceStyles[s] || {}
        return (
          <div
            key={i}
            style={{
              padding: '4px 10px',
              borderRadius: 12,
              fontSize: 13,
              animation: 'tagFadeIn .4s ease',
              background: style.bg,
              border: style.border,
              whiteSpace: 'nowrap'
            }}
          >
            {s}
          </div>
        )
      })}
    </div>
  )


  return (
    <div style={{ width: '100%', paddingBottom: 50 }}>

      {/* === ФИЛЬТРЫ === */}
      <div style={{ marginBottom: 14, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <input
          style={inputGlass}
          placeholder="Поиск по имени, телефону, Instagram"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        <div style={segmented}>
          {[
            { v: 'all', label: 'Все' },
            { v: 'pending', label: 'Ожидает' },
            { v: 'approved', label: 'Подтверждена' },
            { v: 'canceled_admin', label: 'Отменена адм.' },
            { v: 'canceled_client', label: 'Отменена кл.' },
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

        <button style={btnPrimary} onClick={handleExport}>
          Экспорт
        </button>
      </div>


      {/* === ТАБЛИЦА (DESKTOP) === */}
      <div className="admin-desktop">
        <table className="table">
          <thead>
            <tr>
              <th>Клиент</th>
              <th>Услуги</th>
              <th>Цена</th>
              <th>Дата</th>
              <th>Время</th>
              <th>Оплата</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(b => {
              const services = b.services || []
              return (
                <tr key={b.id}>
                  <td>
                    <b>{b.userName}</b>
                    <div className="muted" style={{ fontSize: 12 }}>{b.userPhone}</div>
                    <div className="muted" style={{ fontSize: 11 }}>{b.userInstagram}</div>
                  </td>

                  <td><Tags services={services} /></td>

                  <td>{b.price || '—'} €</td>
                  <td>{fmtDate(b.start)}</td>
                  <td>{fmtTime(b.start)}–{fmtTime(b.end)}</td>

                  {/* === ОПЛАТА === */}
                  <td>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8
                    }}>
                      <div style={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        background: b.paid ? '#45ff89' : '#ff4d6b',
                        animation: b.paid ? 'pulsePaid 1.5s infinite' : 'none'
                      }}></div>
                      {b.paid ? 'Оплачено' : 'Не оплачено'}
                    </div>
                    {!b.paid && (
                      <button
                        style={btnMini}
                        onClick={() => togglePaid(b.id)}
                      >
                        Пометить оплаченной
                      </button>
                    )}
                  </td>

                  {/* === ОТМЕНА === */}
                  <td>
                    {(b.status !== 'canceled_admin' && b.status !== 'canceled_client') && (
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
      </div>


      {/* === МОБИЛЬНЫЕ КАРТОЧКИ (MOBILE) === */}
      <div className="admin-mobile">
        {filtered.map(b => (
          <div key={b.id} style={mobileCard}>
            <div style={{ fontWeight: 700 }}>{b.userName}</div>
            <div className="muted" style={{ fontSize: 12 }}>{b.userPhone}</div>

            <div style={{ marginTop: 8 }}>
              <Tags services={b.services || []} />
            </div>

            <div style={{ marginTop: 6 }}>
              <b>{b.price} €</b>
              <div>{fmtDate(b.start)}</div>
              <div>{fmtTime(b.start)}–{fmtTime(b.end)}</div>
            </div>

            <div style={{
              marginTop: 6,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <div style={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                background: b.paid ? '#45ff89' : '#ff4d6b',
                animation: b.paid ? 'pulsePaid 1.5s infinite' : 'none'
              }} />
              {b.paid ? 'Оплачено' : 'Не оплачено'}
            </div>

            {!b.paid && (
              <button style={btnMini} onClick={() => togglePaid(b.id)}>
                Пометить оплаченной
              </button>
            )}

            {(b.status !== 'canceled_admin' && b.status !== 'canceled_client') && (
              <button style={btnDanger} onClick={() => cancelByAdmin(b.id)}>
                Отменить
              </button>
            )}
          </div>
        ))}
      </div>


      {toast && (
        <div className="toast" style={{ marginTop: 14 }}>{toast}</div>
      )}

    </div>
  )
}


/* === СТИЛИ === */
const inputGlass = {
  flex: 1,
  minWidth: 250,
  padding: '10px 12px',
  borderRadius: 10,
  color: '#fff',
  border: '1px solid rgba(168,85,247,0.35)',
  background: 'rgba(17,0,40,0.45)'
}

const btnPrimary = {
  padding: '10px 18px',
  borderRadius: 12,
  background: 'linear-gradient(180deg, rgba(120,60,255,0.9), rgba(70,20,170,0.9))',
  border: '1px solid rgba(168,85,247,0.6)',
  color: '#fff',
  cursor: 'pointer'
}

const btnDanger = {
  padding: '8px 14px',
  borderRadius: 10,
  background: 'rgba(255,40,60,0.3)',
  border: '1px solid rgba(255,60,80,0.7)',
  cursor: 'pointer',
  color: '#fff',
  marginTop: 6
}

const btnMini = {
  padding: '6px 12px',
  borderRadius: 10,
  fontSize: 13,
  background: 'rgba(40,200,80,0.25)',
  border: '1px solid rgba(60,255,120,0.6)',
  cursor: 'pointer',
  color: '#fff',
  marginTop: 6
}

const segmented = {
  display: 'flex',
  gap: 6,
  background: 'rgba(25,10,45,0.45)',
  border: '1px solid rgba(168,85,247,0.35)',
  borderRadius: 12,
  padding: 4
}

const segBtn = {
  padding: '8px 12px',
  borderRadius: 10,
  border: '1px solid rgba(150,90,255,0.2)',
  background: 'rgba(40,20,80,0.35)',
  color: '#fff',
  cursor: 'pointer',
  fontSize: 14
}

const segActive = {
  background: 'rgba(120,60,255,0.55)',
  border: '1px solid rgba(168,85,247,0.8)',
  boxShadow: '0 0 12px rgba(160,70,255,0.4)'
}

const mobileCard = {
  padding: 14,
  borderRadius: 14,
  border: '1px solid rgba(168,85,247,0.2)',
  background: 'rgba(30,15,60,0.5)',
  marginBottom: 12
}
