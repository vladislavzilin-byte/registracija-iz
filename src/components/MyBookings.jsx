import React, { useMemo, useState, useEffect } from 'react'
import {
  getCurrentUser,
  getBookings,
  saveBookings,
  fmtDate,
  fmtTime,
  getUsers,
  saveUsers,
  setCurrentUser
} from '../lib/storage'
import { useI18n } from '../lib/i18n'

export default function MyBookings() {
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
  const [filter, setFilter] = useState('all')
  const [confirmId, setConfirmId] = useState(null)
  const [version, setVersion] = useState(0)
  const [notif, setNotif] = useState(null)
  const [modal, setModal] = useState(false)
  const [showProfile, setShowProfile] = useState(true)

  const bookingsAll = getBookings()
  const all = bookingsAll
    .filter(b => user && b.userPhone === user.phone)
    .sort((a, b) => new Date(a.start) - new Date(b.start))

  const list = useMemo(() => {
    if (filter === 'active') return all.filter(b => b.status === 'approved')
    if (filter === 'canceled')
      return all.filter(b => b.status === 'canceled_client' || b.status === 'canceled_admin')
    return all
  }, [filter, version, bookingsAll.length])

  const validate = () => {
    const e = {}
    if (!form.phone && !form.email) e.contact = 'Нужен телефон или email'
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'Некорректный email'
    if (form.phone && !/^[+\d][\d\s\-()]{5,}$/.test(form.phone)) e.phone = 'Некорректный телефон'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const saveProfile = (ev) => {
    ev.preventDefault()
    if (!validate()) return
    const users = getUsers()
    const idx = users.findIndex(u =>
      (u.phone && u.phone === user.phone) ||
      (u.email && u.email === user.email)
    )
    const updated = { ...user, ...form }
    if (idx >= 0) users[idx] = updated; else users.push(updated)
    saveUsers(users)
    setCurrentUser(updated)
    setModal(true)
    setTimeout(() => setModal(false), 2200)
  }

  const cancel = (id) => setConfirmId(id)

  const doCancel = () => {
    const id = confirmId
    const arr = getBookings().map(b =>
      b.id === id ? { ...b, status: 'canceled_client', canceledAt: new Date().toISOString() } : b
    )
    saveBookings(arr)
    setConfirmId(null)
    setVersion(v => v + 1)
  }

  const refresh = () => setVersion(v => v + 1)

  if (!user) {
    return <div className="card"><b>{t('login_or_register')}</b></div>
  }

  const statusLabel = (b) => {
    if (b.status === 'pending') return '🟡 ' + t('pending')
    if (b.status === 'approved') return '🟢 ' + t('approved')
    if (b.status === 'canceled_client') return '❌ ' + t('canceled_by_client')
    if (b.status === 'canceled_admin') return '🔴 ' + t('canceled_by_admin')
    return b.status
  }

  return (
    <div style={container}>
      {/* === PROFILE === */}
      <div style={profileCard}>
        <div style={profileHeader} onClick={() => setShowProfile(!showProfile)}>
          <h3 style={{ margin: 0 }}>{t('my_profile')}</h3>
          <div style={arrow}>{showProfile ? '▲' : '▼'}</div>
        </div>

        <div
          style={{
            ...profileBody,
            maxHeight: showProfile ? '800px' : '0',
            opacity: showProfile ? 1 : 0,
            padding: showProfile ? '16px' : '0 16px',
          }}
        >
          <form className="col" style={{ gap: 12 }} onSubmit={saveProfile}>
            <div><label>Имя</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div><label>Instagram</label><input value={form.instagram} onChange={e => setForm({ ...form, instagram: e.target.value })} /></div>
            <div>
              <label>Телефон</label>
              <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
              {errors.phone && <small style={{ color: '#f87171' }}>{errors.phone}</small>}
            </div>
            <div>
              <label>Email</label>
              <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
              {errors.email && <small style={{ color: '#f87171' }}>{errors.email}</small>}
            </div>
            <div><label>Пароль</label><input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></div>

            {errors.contact && (
              <div style={{ background: 'rgba(255,0,0,0.1)', padding: 8, borderRadius: 8, color: '#f87171' }}>{errors.contact}</div>
            )}
            <button style={saveBtn}><span>💾</span> {t('save')}</button>
          </form>
        </div>
      </div>

      {/* === BOOKINGS === */}
      <div style={bookingsCard}>
        <div style={bookingsHeader}>
          <h3 style={{ margin: 0 }}>{t('my_bookings')}</h3>
          <div style={filterButtons}>
            <button style={filterBtn(filter === 'all')} onClick={() => setFilter('all')}>{t('all')}</button>
            <button style={filterBtn(filter === 'active')} onClick={() => setFilter('active')}>{t('active')}</button>
            <button style={filterBtn(filter === 'canceled')} onClick={() => setFilter('canceled')}>{t('canceled')}</button>
          </div>
        </div>

        <table style={table}>
          <thead><tr><th>Дата</th><th>Время</th><th>Статус</th><th></th></tr></thead>
          <tbody>
            {list.map(b => {
              const canCancel = (b.status === 'pending' || b.status === 'approved') && new Date(b.start) > new Date()
              return (
                <tr key={b.id}>
                  <td>{fmtDate(b.start)}</td>
                  <td>{fmtTime(b.start)}–{fmtTime(b.end)}</td>
                  <td>{statusLabel(b)}</td>
                  <td>
                    {canCancel && <button style={cancelBtn} onClick={() => cancel(b.id)}>{t('cancel')}</button>}
                  </td>
                </tr>
              )
            })}
            {!list.length && <tr><td colSpan="4" style={{ opacity: 0.6 }}>{t('no_records')}</td></tr>}
          </tbody>
        </table>
      </div>

      {/* === CANCEL CONFIRM === */}
      {confirmId && (
        <div style={modalBackdrop}>
          <div style={modalBox}>
            <h3>{t('confirm_cancel')}</h3>
            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              <button style={cancelBtn} onClick={doCancel}>{t('yes_cancel')}</button>
              <button style={okBtn} onClick={() => setConfirmId(null)}>{t('back')}</button>
            </div>
          </div>
        </div>
      )}

      {/* === SUCCESS MODAL === */}
      {modal && (
        <div style={modalBackdrop}>
          <div style={modalBox}>
            <div style={loader}></div>
            <h3 style={{ marginTop: 10 }}>{t('profile_updated')}</h3>
          </div>
        </div>
      )}
    </div>
  )
}

/* === STYLES === */
const container = { animation: 'fadeIn 0.5s ease', paddingBottom: '40px' }

const profileCard = {
  background: 'rgba(20,15,30,0.65)',
  border: '1px solid rgba(168,85,247,0.25)',
  borderRadius: '14px',
  marginBottom: '24px',
  overflow: 'hidden',
  backdropFilter: 'blur(18px)',
  boxShadow: '0 8px 32px rgba(120,50,200,0.15)'
}

const profileHeader = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  cursor: 'pointer',
  padding: '14px 18px',
  background: 'rgba(40,20,70,0.45)',
  borderBottom: '1px solid rgba(168,85,247,0.25)',
  color: '#fff'
}

const arrow = { fontSize: '0.8rem', opacity: 0.8 }

const profileBody = {
  color: '#fff',
  overflow: 'hidden',
  transition: 'all 0.45s ease'
}

const saveBtn = {
  marginTop: '10px',
  width: '100%',
  padding: '10px 20px',
  borderRadius: '10px',
  border: '1px solid rgba(168,85,247,0.4)',
  background: 'linear-gradient(180deg, rgba(130,60,255,0.8), rgba(60,20,120,0.8))',
  color: '#fff',
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'all 0.3s ease'
}

const bookingsCard = { ...profileCard, padding: '18px' }
const bookingsHeader = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }
const filterButtons = { display: 'flex', gap: '8px' }

const filterBtn = (active) => ({
  borderRadius: '10px',
  padding: '8px 18px',
  background: active ? 'rgba(130,60,255,0.25)' : 'rgba(30,20,40,0.6)',
  border: active ? '1px solid rgba(168,85,247,0.6)' : '1px solid rgba(120,80,180,0.3)',
  color: '#fff',
  cursor: 'pointer',
  transition: '0.3s'
})

const table = {
  width: '100%',
  borderCollapse: 'collapse',
  color: '#fff'
}

const cancelBtn = {
  borderRadius: '8px',
  border: '1px solid rgba(180,95,255,0.4)',
  background: 'rgba(40,20,70,0.7)',
  color: '#fff',
  padding: '6px 14px',
  cursor: 'pointer',
  transition: 'all 0.3s ease'
}

const modalBackdrop = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.6)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 2000,
  animation: 'fadeIn 0.3s ease'
}

const modalBox = {
  background: 'rgba(20,15,35,0.85)',
  border: '1px solid rgba(180,95,255,0.4)',
  borderRadius: '14px',
  padding: '24px 32px',
  textAlign: 'center',
  color: '#fff',
  boxShadow: '0 0 40px rgba(150,85,247,0.25)',
  animation: 'popIn 0.3s ease'
}

const okBtn = {
  borderRadius: '8px',
  border: '1px solid rgba(168,85,247,0.5)',
  background: 'rgba(40,20,70,0.7)',
  color: '#fff',
  padding: '6px 16px',
  cursor: 'pointer'
}

const loader = {
  width: '28px',
  height: '28px',
  margin: '0 auto 10px',
  borderRadius: '50%',
  border: '3px solid rgba(255,255,255,0.25)',
  borderTopColor: '#a855f7',
  animation: 'spin 1s linear infinite'
}

const style = document.createElement('style')
style.innerHTML = `
@keyframes fadeIn { from { opacity: 0; transform: translateY(-5px);} to { opacity: 1; transform: translateY(0);} }
@keyframes popIn { from { opacity: 0; transform: scale(0.9);} to { opacity: 1; transform: scale(1);} }
@keyframes spin { to { transform: rotate(360deg);} }
`
document.head.appendChild(style)
