const ADMINS = ['irina.abramova7@gmail.com','vladislavzilin@gmail.com']

import { useState, useMemo, useEffect } from 'react'
import {
  getSettings, saveSettings,
  getBookings, saveBookings,
  fmtDate, fmtTime, getCurrentUser
} from '../lib/storage'
import { exportBookingsToCSV } from '../lib/export'
import { useI18n } from '../lib/i18n'

export default function Admin() {
  const me = (typeof getCurrentUser==='function')
    ? getCurrentUser()
    : JSON.parse(localStorage.getItem('currentUser')||'{}')

  const isAdmin = me && (me.role === 'admin' || (me.email && ADMINS.includes(me.email)))
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

  // Автообновление при изменении настроек
  useEffect(() => {
    const sync = () => setBookings(getBookings())
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [])

  const update = (patch) => {
    const next = { ...settings, ...patch }
    setSettings(next)
    saveSettings(next)
    // автообновление списка при изменении настроек
    setBookings(getBookings())
  }

  const stats = useMemo(() => {
    const total = bookings.length
    const active = bookings.filter(b => b.status === 'approved' || b.status === 'pending').length
    const canceled = bookings.filter(b => b.status === 'canceled_client' || b.status === 'canceled_admin').length
    return { total, active, canceled }
  }, [bookings])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    const arr = bookings.filter(b => {
      const matchQ =
        !q ||
        (b.userName?.toLowerCase().includes(q) ||
         b.userPhone?.toLowerCase().includes(q) ||
         b.userInstagram?.toLowerCase().includes(q))
      const matchStatus = statusFilter === 'all' ? true : b.status === statusFilter
      return matchQ && matchStatus
    })
    arr.sort((a,b) => new Date(a.start) - new Date(b.start))
    return arr
  }, [bookings, search, statusFilter])

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

  const handleExport = () => {
    const { name, count } = exportBookingsToCSV(filtered)
    setToast(`✅ ${t('export')} ${count} → ${name}`)
    setTimeout(() => setToast(null), 3500)
  }

  const statusLabel = (b) =>
    b.status === 'approved' ? '🟢 ' + t('approved')
      : b.status === 'pending' ? '🟡 ' + t('pending')
      : (b.status === 'canceled_client' ? '❌ ' + t('canceled_by_client') : '🔴 ' + t('canceled_by_admin'))

  return (
    <div className="col" style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* ======= НАСТРОЙКИ ======= */}
      <div style={cardAurora}>
        <button
          onClick={() => setShowSettings(s => !s)}
          style={headerToggle}
        >
          <span style={{display:'inline-flex',alignItems:'center',gap:10}}>
            <Chevron open={showSettings}/>
            <span style={{fontWeight:700}}>Редактировать настройки</span>
          </span>
        </button>

        <div style={{
          maxHeight: showSettings ? 1000 : 0,
          overflow: 'hidden',
          transition: 'max-height .35s ease'
        }}>
          <div style={{paddingTop: 10}}>
            <div className="row" style={{gap:12}}>
              <div className="col">
                <label style={labelStyle}>{t('master_name')}</label>
                <input style={inputGlass}
                       value={settings.masterName}
                       onChange={e=>update({masterName:e.target.value})}/>
              </div>
              <div className="col">
                <label style={labelStyle}>{t('admin_phone')}</label>
                <input style={inputGlass}
                       value={settings.adminPhone}
                       onChange={e=>update({adminPhone:e.target.value})}/>
              </div>
            </div>

            <div className="row" style={{gap:12, marginTop:12}}>
              <div className="col">
                <label style={labelStyle}>{t('day_start')}</label>
                <input type="time" style={inputGlass}
                       value={settings.workStart}
                       onChange={e=>update({workStart:e.target.value})}/>
              </div>
              <div className="col">
                <label style={labelStyle}>{t('day_end')}</label>
                <input type="time" style={inputGlass}
                       value={settings.workEnd}
                       onChange={e=>update({workEnd:e.target.value})}/>
              </div>
              <div className="col">
                <label style={labelStyle}>{t('slot_minutes')}</label>
                <input type="number" min="15" step="15" style={inputGlass}
                       value={settings.slotMinutes}
                       onChange={e=>update({slotMinutes:parseInt(e.target.value||'60',10)})}/>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ======= ВСЕ ЗАПИСИ ======= */}
      <div style={cardAurora}>
        <div style={topBar}>
          <div style={{fontWeight:700, fontSize:'1.05rem'}}>Все записи</div>
        </div>

        {/* Поиск + фильтры */}
        <div style={{display:'flex', gap:10, margin:'8px 0 12px 0', flexWrap:'wrap', alignItems:'center'}}>
          <input
            style={{...inputGlass, flex:'1 1 260px'}}
            placeholder={t('search_placeholder')}
            value={search}
            onChange={e=>setSearch(e.target.value)}
          />
          <div style={segmented}>
            {[
              {v:'all', label:t('all')},
              {v:'pending', label:t('pending')},
              {v:'approved', label:t('approved')},
              {v:'canceled_client', label:t('canceled_by_client')},
              {v:'canceled_admin', label:t('canceled_by_admin')}
            ].map(it=>(
              <button
                key={it.v}
                onClick={()=>setStatusFilter(it.v)}
                style={{...segBtn, ...(statusFilter===it.v?segActive:{})}}
              >
                {it.label}
              </button>
            ))}
          </div>
          <button style={btnPrimary} onClick={handleExport}>{t('export')}</button>
        </div>

        <div className="badge" style={{marginBottom:10}}>
          {t('total')}: {stats.total} • {t('total_active')}: {stats.active} • {t('total_canceled')}: {stats.canceled}
        </div>

        <table className="table" style={{ marginTop: 6 }}>
          <thead>
            <tr>
              <th>Клиент</th>
              <th>Instagram</th>
              <th>Дата</th>
              <th>Время</th>
              <th>{t('status')}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(b => {
              const inFuture = new Date(b.start) > new Date()
              return (
                <tr key={b.id} style={{opacity: b.status==='approved' ? 1 : .97}}>
                  <td style={{whiteSpace:'nowrap'}}>
                    <b>{b.userName}</b>
                    <div className="muted" style={{fontSize:12}}>{b.userPhone}</div>
                  </td>
                  <td style={{whiteSpace:'nowrap'}}>{b.userInstagram || '-'}</td>
                  <td style={{whiteSpace:'nowrap'}}>{fmtDate(b.start)}</td>
                  <td style={{whiteSpace:'nowrap'}}>{fmtTime(b.start)}–{fmtTime(b.end)}</td>
                  <td>{statusLabel(b)}</td>
                  <td style={{display:'flex', gap:8, justifyContent:'flex-end'}}>
                    {b.status==='pending' &&
                      <button style={btnOk} onClick={()=>approveByAdmin(b.id)}>{t('approve')}</button>}
                    {b.status!=='canceled_admin' && b.status!=='canceled_client' && inFuture &&
                      <button style={btnDanger} onClick={()=>cancelByAdmin(b.id)}>{t('rejected')}</button>}
                  </td>
                </tr>
              )
            })}
            {!filtered.length && (
              <tr><td colSpan="6"><small className="muted">{t('no_records')}</small></td></tr>
            )}
          </tbody>
        </table>

        {toast && <div className="toast" style={{marginTop:10}}>{toast}</div>}
      </div>
    </div>
  )
}

/* ====== Мелкие UI-компоненты / стили ====== */

function Chevron({open}) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#cbb6ff" strokeWidth="2">
      {open
        ? <path d="M6 15l6-6 6 6" />
        : <path d="M6 9l6 6 6-6" />}
    </svg>
  )
}

/* Стиль карточек и кнопок */
const cardAurora = {
  background: 'linear-gradient(180deg, rgba(255,255,255,0.035), rgba(255,255,255,0.02))',
  border: '1px solid rgba(168,85,247,0.18)',
  borderRadius: 16,
  padding: 14,
  boxShadow: '0 8px 30px rgba(0,0,0,0.35), inset 0 0 0 1px rgba(255,255,255,0.03)'
}

const headerToggle = {
  width: '100%',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 10,
  borderRadius: 12,
  padding: '10px 12px',
  border: '1px solid rgba(168,85,247,0.25)',
  background: 'rgba(25,10,45,0.45)',
  color: '#fff',
  cursor: 'pointer'
}

const labelStyle = { fontSize: 12, opacity: .8, marginBottom: 6, display:'block' }

const inputGlass = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 10,
  color: '#fff',
  border: '1px solid rgba(168,85,247,0.35)',
  background: 'rgba(17,0,40,0.45)',
  outline: 'none'
}

const topBar = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '4px 2px 10px 2px'
}

const btnBase = {
  borderRadius: 10,
  padding: '8px 14px',
  fontWeight: 600,
  cursor: 'pointer',
  border: '1px solid rgba(168,85,247,0.45)',
  transition: '0.2s'
}

const btnPrimary = {
  ...btnBase,
  background: 'linear-gradient(180deg, rgba(110,60,190,0.9), rgba(60,20,110,0.9))',
  boxShadow: '0 0 14px rgba(150,85,247,0.35)',
  color: '#fff'
}

const btnOk = { ...btnPrimary }

const btnDanger = {
  ...btnBase,
  border: '1px solid rgba(239, 68, 68, .6)',
  background: 'rgba(110,20,30,.35)',
  color: '#fff'
}

const segmented = {
  display: 'flex',
  gap: 8,
  background: 'rgba(17,0,40,0.45)',
  border: '1px solid rgba(168,85,247,0.25)',
  borderRadius: 12,
  padding: 6
}
const segBtn = {
  ...btnBase,
  padding: '8px 12px',
  background: 'rgba(25,10,45,0.35)',
  border: '1px solid rgba(168,85,247,0.25)'
}
const segActive = {
  background: 'linear-gradient(180deg, rgba(110,60,190,0.9), rgba(60,20,110,0.9))',
  border: '1px solid rgba(180,95,255,0.7)',
  boxShadow: '0 0 12px rgba(150,90,255,0.30)'
}
