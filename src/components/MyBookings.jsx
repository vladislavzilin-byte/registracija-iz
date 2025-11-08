import React from 'react'

import { useMemo, useState } from 'react'
import { getCurrentUser, getBookings, saveBookings, fmtDate, fmtTime, getUsers, saveUsers, setCurrentUser } from '../lib/storage'
import { useI18n } from '../lib/i18n'

export default function MyBookings(){
  const { t } = useI18n()
  const user = getCurrentUser()
  const [form, setForm] = useState({
    name: user?.name || '',
    instagram: user?.instagram || '',
    phone: user?.phone || '',
    email: user?.email || '',
    password: user?.password || ''
  })
  const [errors, setErrors] = useState({})
  const [saved, setSaved] = useState(false)
  const [toast, setToast] = useState(null)

  const validate = () => {
    const e = {}
    if(!form.phone && !form.email) e.contact = 'Нужен телефон или email'
    if(form.email && !/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'Некорректный email'
    if(form.phone && !/^[+\d][\d\s\-()]{5,}$/.test(form.phone)) e.phone = 'Некорректный телефон'
    setErrors(e)
    return Object.keys(e).length===0
  }

  const saveProfile = (ev) => {
    ev.preventDefault()
    if(!validate()) return
    const users = getUsers()
    const idx = users.findIndex(u => (u.phone && u.phone===user.phone) || (u.email && u.email===user.email))
    const updated = { ...user, ...form }
    if(idx>=0) users[idx] = updated; else users.push(updated)
    saveUsers(users)
    setCurrentUser(updated)
    setSaved(true); setToast('Данные сохранены')
    setTimeout(()=>{ setSaved(false); setToast(null) }, 1500)
  }
  const [filter,setFilter] = useState('all')
  const [confirmId, setConfirmId] = useState(null)
  const [version, setVersion] = useState(0) // trigger re-read
  const bookingsAll = getBookings()

  const all = bookingsAll
    .filter(b=> user && b.userPhone===user.phone)
    .sort((a,b)=> new Date(a.start) - new Date(b.start))

  const list = useMemo(()=>{
    if(filter==='active') return all.filter(b=> b.status==='approved')
    if(filter==='canceled') return all.filter(b=> b.status==='canceled_client' || b.status==='canceled_admin')
    return all
  }, [filter, version, bookingsAll.length])

  const activeCount = all.filter(b=> b.status==='approved' && new Date(b.end)>=new Date()).length

const [notif, setNotif] = useState(null)

// Check for new approvals/cancellations on mount or refresh
React.useEffect(()=>{
  if(!user) return
  const list = getBookings()
  const mine = list.filter(b=> b.userPhone===user.phone && (b.status==='approved' || b.status==='canceled_admin') && !b.notified)
  if(mine.length){
    const b = mine[0]
    const msg = b.status==='approved' ? t('notif_approved') : t('notif_canceled')
    setNotif({ msg })
    // mark as notified
    const next = list.map(x=> x.id===b.id ? { ...x, notified:true } : x)
    saveBookings(next)
  }
}, [version])


  const cancel = (id) => setConfirmId(id)
  const doCancel = () => {
    const id = confirmId
    const arr = getBookings().map(b=> b.id===id ? { ...b, status:'canceled_client', canceledAt:new Date().toISOString() } : b)
    saveBookings(arr)
    setConfirmId(null)
    setVersion(v=>v+1)
  }

  const refresh = () => setVersion(v=>v+1)

  if(!user){
    return <div className="card"><b>{t('login_or_register')}</b></div>
  }

  const statusLabel = (b) => {
    if(b.status==='pending') return '🟡 ' + t('pending')
    if(b.status==='approved') return '🟢 ' + t('approved')
    if(b.status==='canceled_client') return '❌ ' + t('canceled_by_client')
    if(b.status==='canceled_admin') return '🔴 ' + t('canceled_by_admin')
    return b.status
  }

  return (
    <div className="row">
      <div className="col">
        <div className="card">
          
        <div className="card" style={{marginBottom:16}}>
          <h3 style={{marginTop:0}}>Мой профиль</h3>
          <form className="col" style={{gap:12}} onSubmit={saveProfile}>
            <div><label>Имя</label><input value={form.name} onChange={e=>{ setForm({...form, name:e.target.value}); setSaved(false) }} /></div>
            <div><label>Instagram</label><input value={form.instagram} onChange={e=>{ setForm({...form, instagram:e.target.value}); setSaved(false) }} /></div>
            <div><label>Телефон</label><input value={form.phone} onChange={e=>{ setForm({...form, phone:e.target.value}); setSaved(false) }} />{errors.phone && <small className="muted">{errors.phone}</small>}</div>
            <div><label>Email</label><input value={form.email} onChange={e=>{ setForm({...form, email:e.target.value}); setSaved(false) }} />{errors.email && <small className="muted">{errors.email}</small>}</div>
            <div><label>Пароль</label><input type="password" value={form.password} onChange={e=>{ setForm({...form, password:e.target.value}); setSaved(false) }} /></div>
            {errors.contact && <div className="badge" style={{background:'rgba(255,0,0,0.1)'}}>{errors.contact}</div>}
            <div style={{display:'flex',gap:8,alignItems:'center'}}>
              <button type="submit">{saved ? 'Сохранено ✔' : 'Сохранить'}</button>
              {saved && <small className="muted">Обновлено</small>}
            </div>
          </form>
        </div>
        
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <h3 style={{marginTop:0}}>{t('my_bookings')}</h3>
            <div style={{display:'flex',gap:8}}>
              <button className={filter==='all'?'':'ghost'} onClick={()=>setFilter('all')}>{t('all')}</button>
              <button className={filter==='active'?'':'ghost'} onClick={()=>setFilter('active')}>{t('active')}</button>
              <button className={filter==='canceled'?'':'ghost'} onClick={()=>setFilter('canceled')}>{t('canceled')}</button>
              <button className="ghost" onClick={refresh}>🔁 {t('refresh')}</button>
            </div>
          </div>
          <table className="table">
            <thead><tr><th>Дата</th><th>Время</th><th>{t('status')}</th><th></th></tr></thead>
            <tbody>
              {list.map(b=>{
                const canCancel = (b.status==='pending' || b.status==='approved') && new Date(b.start)>new Date()
                return (
                  <tr key={b.id} style={{opacity: b.status==='approved' ? 1 : .9}}>
                    <td>{fmtDate(b.start)}</td>
                    <td>{fmtTime(b.start)}–{fmtTime(b.end)}</td>
                    <td>{statusLabel(b)}</td>
                    <td style={{width:160}}>{canCancel ? <button className="danger" onClick={()=>cancel(b.id)}>{t('cancel')}</button> : null}</td>
                  </tr>
                )
              })}
              {!list.length && <tr><td colSpan="4"><small className="muted">{t('no_records')}</small></td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {confirmId && (
        <div className="modal-backdrop" onClick={()=>setConfirmId(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <h3>{t('confirm_cancel')}</h3>
            <p><small className="muted">{t('irreversible')}</small></p>
            <div style={{display:'flex',gap:8,marginTop:10}}>
              <button className="danger" onClick={doCancel}>{t('yes_cancel')}</button>
              <button className="ghost" onClick={()=>setConfirmId(null)}>{t('back')}</button>
            </div>
          </div>
        </div>
      )}
    

{toast && (<div className='toast'>{toast}</div>)}

{notif && (
  <div className="modal-backdrop" onClick={()=>setNotif(null)}>
    <div className="modal" onClick={e=>e.stopPropagation()}>
      <h3>{notif.msg}</h3>
      <div style={{marginTop:12}}><button onClick={()=>setNotif(null)}>{t('notif_ok')}</button></div>
    </div>
  </div>
)}

    </div>
  )
}
