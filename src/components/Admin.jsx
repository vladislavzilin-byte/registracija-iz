import React, { useEffect, useMemo, useState } from 'react'
import {
  getBookings,
  saveBookings,
  getSettings,
  saveSettings,
  fmtDate,
  fmtTime
} from '../lib/storage'

export default function Admin() {
  const [settings, setSettings] = useState(getSettings())
  const [openSettings, setOpenSettings] = useState(false)
  const [openDurations, setOpenDurations] = useState(false)
  const [version, setVersion] = useState(0)

  const updateSettings = () => {
    saveSettings(settings)
    setVersion(v => v + 1)
  }

  const bookings = getBookings().sort(
    (a, b) => new Date(a.start) - new Date(b.start)
  )

  const togglePaid = (id) => {
    const updated = bookings.map(b =>
      b.id === id ? { ...b, paid: !b.paid } : b
    )
    saveBookings(updated)
    setVersion(v => v + 1)
  }

  const cancel = (id) => {
    const updated = bookings.map(b =>
      b.id === id
        ? { ...b, status: 'canceled_admin', canceledAt: new Date().toISOString() }
        : b
    )
    saveBookings(updated)
    setVersion(v => v + 1)
  }

  const approve = (id) => {
    const updated = bookings.map(b =>
      b.id === id ? { ...b, status: 'approved' } : b
    )
    saveBookings(updated)
    setVersion(v => v + 1)
  }

  // ==== СТИЛИ ДЛЯ ТОЧЕК ====

  const dotBase = {
    display: 'inline-block',
    width: 10,
    height: 10,
    borderRadius: '50%',
    marginRight: 6,
  }

  const dotGreen = { ...dotBase, background: '#4ade80', animation: 'blink 1.6s infinite' }
  const dotRed = { ...dotBase, background: '#f87171' }
  const dotGray = { ...dotBase, background: '#9ca3af' }

  // ==== АНИМАЦИЯ ТЕГОВ ====

  const tagStyle = {
    padding: '6px 12px',
    borderRadius: 10,
    fontSize: 13,
    animation: 'fadeTag .4s ease',
    whiteSpace: 'nowrap'
  }

  const tagColors = {
    'Šukuosena': { background: 'rgba(140,80,255,0.25)', border: '1px solid rgba(140,80,255,0.4)' },
    'Tresų nuoma': { background: 'rgba(80,140,255,0.25)', border: '1px solid rgba(80,140,255,0.4)' },
    'Papuošalų nuoma': { background: 'rgba(255,80,150,0.25)', border: '1px solid rgba(255,80,150,0.4)' },
    'Atyvykimas': { background: 'rgba(255,190,60,0.25)', border: '1px solid rgba(255,190,60,0.4)' },
    'Konsultacija': { background: 'rgba(90,200,160,0.25)', border: '1px solid rgba(90,200,160,0.4)' },
  }

  return (
    <div style={{ paddingBottom: 40, animation: 'fadeIn .4s ease' }}>

      {/* =========================== */}
      {/*      РЕДАКТИРОВАНИЕ        */}
      {/* =========================== */}

      <div style={outerCard}>
        <div style={accordionHeader} onClick={() => setOpenSettings(!openSettings)}>
          <span style={arrow(openSettings)}>▾</span>
          <b>Редактировать настройки</b>
        </div>

        <div style={accordionBody(openSettings)}>
          <div className="col" style={{ gap: 12 }}>
            <label>Имя мастера</label>
            <input
              value={settings.masterName}
              onChange={e => setSettings({ ...settings, masterName: e.target.value })}
            />

            <label>Телефон</label>
            <input
              value={settings.masterPhone}
              onChange={e => setSettings({ ...settings, masterPhone: e.target.value })}
            />

            <button onClick={updateSettings} style={saveBtn}>💾 Сохранить</button>
          </div>
        </div>
      </div>

      {/* =========================== */}
      {/*   ДЛИТЕЛЬНОСТЬ УСЛУГ       */}
      {/* =========================== */}

      <div style={outerCard}>
        <div style={accordionHeader} onClick={() => setOpenDurations(!openDurations)}>
          <span style={arrow(openDurations)}>▾</span>
          <b>Длительность услуг</b>
        </div>

        <div style={accordionBody(openDurations)}>
          {Object.entries(settings.serviceDurations || {}).map(([key, val]) => (
            <div key={key}>
              <label>{key}</label>
              <input
                type="number"
                value={val}
                onChange={e =>
                  setSettings({
                    ...settings,
                    serviceDurations: {
                      ...settings.serviceDurations,
                      [key]: Number(e.target.value)
                    }
                  })
                }
              />
            </div>
          ))}

          <button onClick={updateSettings} style={saveBtn}>💾 Сохранить</button>
        </div>
      </div>

      {/* =========================== */}
      {/*     СПИСОК БРОНИРОВАНИЙ    */}
      {/* =========================== */}

      <h2 style={{ color: '#fff', marginBottom: 10 }}>Бронирования</h2>

      {bookings.map(b => (
        <div key={b.id} style={bookingCard}>

          {/* ВЕРХ */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={b.status === 'approved' ? dotGreen :
              b.status.includes('canceled') ? dotRed : dotGray} />

            <b style={{ fontSize: 17 }}>{fmtDate(b.start)}</b>
          </div>

          <div style={{ opacity: 0.8, marginTop: 2 }}>
            {fmtTime(b.start)} – {fmtTime(b.end)}
          </div>

          {/* ТЕГИ УСЛУГ */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            {b.services?.map(s => (
              <div key={s} style={{ ...tagStyle, ...tagColors[s] }}>
                {s}
              </div>
            ))}
          </div>

          {/* КЛИЕНТ */}
          <div style={{ marginTop: 12 }}>
            <b>{b.userName}</b><br />
            <span style={{ opacity: 0.8 }}>{b.userPhone}</span><br />
            {b.userInstagram && <span>@{b.userInstagram}</span>}
          </div>

          {/* ОПЛАТА */}
          <div style={{ marginTop: 12 }}>
            <b>Оплата:</b>{' '}
            {b.paid ? <span style={{ color: '#4ade80' }}>● оплачено</span>
                   : <span style={{ color: '#f87171' }}>● не оплачено</span>}

            <button
              onClick={() => togglePaid(b.id)}
              style={smallBtn}
            >
              {b.paid ? 'Снять оплату' : 'Отметить оплату'}
            </button>
          </div>

          {/* СТАТУС */}
          <div style={{ marginTop: 10 }}>
            <b>Статус:</b>{' '}
            {b.status === 'pending' && <span style={{ color: '#facc15' }}>Ожидает подтверждения</span>}
            {b.status === 'approved' && <span style={{ color: '#4ade80' }}>Подтверждена</span>}
            {b.status === 'canceled_admin' && <span style={{ color: '#f87171' }}>Отменена администратором</span>}
            {b.status === 'canceled_client' && <span style={{ color: '#fb7185' }}>Отменена клиентом</span>}
          </div>

          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            {b.status === 'pending' && (
              <button onClick={() => approve(b.id)} style={greenBtn}>Подтвердить</button>
            )}

            {b.status !== 'canceled_admin' && (
              <button onClick={() => cancel(b.id)} style={redBtn}>Отменить</button>
            )}
          </div>

        </div>
      ))}

      <style>{`
        @keyframes fadeTag {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes blink {
          0% { opacity: 1; }
          50% { opacity: .4; }
          100% { opacity: 1; }
        }
      `}</style>

    </div>
  )
}

//
// С Т И Л И
//

const outerCard = {
  background: 'rgba(18,10,30,0.9)',
  border: '1px solid rgba(168,85,247,0.3)',
  borderRadius: 14,
  marginBottom: 20,
  overflow: 'hidden'
}

const accordionHeader = {
  padding: '14px 18px',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  cursor: 'pointer',
  background: 'rgba(25,12,45,0.85)',
  borderBottom: '1px solid rgba(168,85,247,0.25)',
  color: '#fff'
}

const arrow = (open) => ({
  transition: '.3s',
  transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
  color: '#c084fc'
})

const accordionBody = (open) => ({
  maxHeight: open ? 900 : 0,
  opacity: open ? 1 : 0,
  overflow: 'hidden',
  transition: 'all .40s ease',
  padding: open ? '20px' : '0 20px',
  color: '#fff'
})

const saveBtn = {
  marginTop: 12,
  width: '100%',
  padding: '12px 14px',
  borderRadius: 10,
  border: '1px solid rgba(168,85,247,0.5)',
  background: 'linear-gradient(180deg, rgba(140,60,255,0.8), rgba(60,20,120,0.8))',
  color: '#fff',
  fontWeight: 600,
  cursor: 'pointer'
}

const bookingCard = {
  background: 'rgba(18,12,30,0.8)',
  border: '1px solid rgba(168,85,247,0.25)',
  borderRadius: 16,
  padding: 18,
  marginBottom: 16,
  color: '#fff',
  boxShadow: '0 0 16px rgba(120,40,200,0.25)'
}

const smallBtn = {
  marginLeft: 8,
  padding: '4px 10px',
  borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.2)',
  cursor: 'pointer',
  background: 'rgba(255,255,255,0.05)',
  color: '#fff'
}

const greenBtn = {
  padding: '8px 14px',
  borderRadius: 10,
  background: 'rgba(74,222,128,0.25)',
  border: '1px solid rgba(74,222,128,0.5)',
  color: '#fff',
  cursor: 'pointer'
}

const redBtn = {
  padding: '8px 14px',
  borderRadius: 10,
  background: 'rgba(248,113,113,0.25)',
  border: '1px solid rgba(248,113,113,0.5)',
  color: '#fff',
  cursor: 'pointer'
}
