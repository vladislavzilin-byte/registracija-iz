const ADMINS=['irina.abramova7@gmail.com','vladislavzilin@gmail.com']

import { useState, useMemo } from 'react'
import { getSettings, saveSettings, getBookings, saveBookings, fmtDate, fmtTime, getCurrentUser } from '../lib/storage'
import { exportBookingsToCSV } from '../lib/export'
import { useI18n } from '../lib/i18n'

export default function Admin(){
  const me = (typeof getCurrentUser==='function') ? getCurrentUser() : JSON.parse(localStorage.getItem('currentUser')||'{}');
  const isAdmin = me && (me.role==='admin' || (me.email && ADMINS.includes(me.email)));
  if(!isAdmin){
    return (<div className="card"><h3>Доступ запрещён</h3><p className="muted">Эта страница доступна только администраторам.</p></div>);
  }

  const { t } = useI18n()
  const [settings,setSettings] = useState(getSettings())
  const current = getCurrentUser()

  const [search,setSearch] = useState('')
  const [statusFilter,setStatusFilter] = useState('all')
  const [loading,setLoading] = useState(false)
  const [toast,setToast] = useState(null)
  const [bookings,setBookings] = useState(getBookings())

  const update = (patch) => { const next={...settings,...patch}; setSettings(next); saveSettings(next) }

  const stats = useMemo(()=>{
    const total = bookings.length
    const active = bookings.filter(b=>b.status==='approved' || b.status==='pending').length
    const canceled = bookings.filter(b=>b.status==='canceled_client' || b.status==='canceled_admin').length
    return { total, active, canceled }
  }, [bookings])

  const filtered = useMemo(()=>{
    const q = search.toLowerCase().trim()
    const arr = bookings.filter(b=>{
      const matchQ = !q || (b.userName?.toLowerCase().includes(q) || b.userPhone?.toLowerCase().includes(q) || b.userInstagram?.toLowerCase().includes(q))
      const matchStatus = statusFilter==='all' ? true : b.status===statusFilter
      return matchQ && matchStatus
    })
    arr.sort((a,b)=> new Date(a.start) - new Date(b.start))
    return arr
  }, [bookings, search, statusFilter])

  const refresh = () => {
    setLoading(True)
    setTimeout(()=>{
      setBookings(getBookings())
      setLoading(False)
    }, 400)
  }

  const cancelByAdmin = (id) => {
    if(!confirm('Отменить эту запись?')) return
    const next = getBookings().map(b=> b.id===id ? { ...b, status:'canceled_admin', canceledAt:new Date().toISOString() } : b)
    saveBookings(next)
    setBookings(next)
  }

  const approveByAdmin = (id) => {
    const next = getBookings().map(b=> b.id===id ? { ...b, status:'approved', approvedAt:new Date().toISOString() } : b)
    saveBookings(next)
    setBookings(next)
  }

  const handleExport = () => {
    const { name, count } = exportBookingsToCSV(filtered)
    setToast(`✅ ${t('export')} ${count} → ${name}`)
    setTimeout(()=> setToast(null), 3500)
  }

  if(!isAdmin) return <div className="card"><b>{t('admin_only')}</b></div>

  const statusLabel = (b) => b.status==='approved' ? '🟢 '+t('approved')
    : (b.status==='pending' ? '🟡 '+t('pending') : (b.status==='canceled_client' ? '❌ '+t('canceled_by_client') : '🔴 '+t('canceled_by_admin')))

  return (
    <div className="row">
      <div className="col">
        <div className="card">
          <h3 style={{marginTop:0}}>{t('master_settings')}</h3>
          <div className="row">
            <div className="col"><label>{t('master_name')}</label><input value={settings.masterName} onChange={e=>update({masterName:e.target.value})}/></div>
            <div className="col"><label>{t('admin_phone')}</label><input value={settings.adminPhone} onChange={e=>update({adminPhone:e.target.value})}/></div>
          </div>
          <div className="row">
            <div className="col"><label>{t('day_start')}</label><input type="time" value={settings.workStart} onChange={e=>update({workStart:e.target.value})}/></div>
            <div className="col"><label>{t('day_end')}</label><input type="time" value={settings.workEnd} onChange={e=>update({workEnd:e.target.value})}/></div>
            <div className="col"><label>{t('slot_minutes')}</label><input type="number" min="15" step="15" value={settings.slotMinutes} onChange={e=>update({slotMinutes:parseInt(e.target.value||'60',10)})}/></div>
          </div>
        </div>
      </div>
      <div className="col">
        <div className="card">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <h3 style={{marginTop:0}}>{t('all_bookings')}</h3>
            <div style={{display:'flex',gap:8,alignItems:'center'}}>
              {loading ? <div className="spinner" title="..."></div> : <button onClick={refresh}>{t('refresh')}</button>}
              <button onClick={handleExport}>{t('export')}</button>
            </div>
          </div>

          <div style={{display:'flex',gap:8,margin:'8px 0 12px 0'}}>
            <input placeholder={t('search_placeholder')} value={search} onChange={e=>setSearch(e.target.value)} />
            <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>
              <option value="all">{t('all')}</option>
              <option value="pending">{t('pending')}</option>
              <option value="approved">{t('approved')}</option>
              <option value="canceled_client">{t('canceled_by_client')}</option>
              <option value="canceled_admin">{t('canceled_by_admin')}</option>
            </select>
          </div>

          <div className="badge">{t('total')}: {stats.total} • {t('total_active')}: {stats.active} • {t('total_canceled')}: {stats.canceled}</div>

          <table className="table" style={{ marginTop: 10 }}>
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
              {filtered.map(b => (
                <tr key={b.id} style={{ opacity: b.status==='approved' ? 1 : .95 }}>
                  <td>{b.userName} <small className="muted">({b.userPhone})</small></td>
                  <td>{b.userInstagram || '-'}</td>
                  <td>{fmtDate(b.start)}</td>
                  <td>{fmtTime(b.start)}–{fmtTime(b.end)}</td>
                  <td>{statusLabel(b)}</td>
                  <td style={{display:'flex',gap:6}}>
                    {b.status==='pending' && <button className="ok" onClick={()=>approveByAdmin(b.id)}>{t('approve')}</button>}
                    {b.status!=='canceled_admin' && b.status!=='canceled_client' && new Date(b.start)>new Date() && <button className="danger" onClick={()=>cancelByAdmin(b.id)}>{t('rejected')}</button>}
                  </td>
                </tr>
              ))}
              {!filtered.length && <tr><td colSpan="6"><small className="muted">{t('no_records')}</small></td></tr>}
            </tbody>
          </table>

          {toast && <div className="toast">{toast}</div>}
        </div>
      </div>
    </div>
  )
}
