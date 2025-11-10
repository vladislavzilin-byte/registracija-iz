import React, { useEffect, useMemo, useState } from 'react'
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
  const [modal, setModal] = useState(false)
  const [approvedModal, setApprovedModal] = useState(false)
  const [showProfile, setShowProfile] = useState(false)

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

  useEffect(() => {
    const prev = JSON.parse(localStorage.getItem('prevBookings') || '[]')
    const approvedNow = all.find(b => b.status === 'approved' && !prev.find(p => p.id === b.id && p.status === 'approved'))
    if (approvedNow) {
      setApprovedModal(true)
      setTimeout(() => setApprovedModal(false), 2500)
    }
    localStorage.setItem('prevBookings', JSON.stringify(all))
  }, [all])

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
    const idx = users.findIndex(u => (u.phone === user.phone) || (u.email === user.email))
    const updated = { ...user, ...form }
    if (idx >= 0) users[idx] = updated; else users.push(updated)
    saveUsers(users)
    setCurrentUser(updated)
    const bookings = getBookings().map(b =>
      (b.userEmail === user.email || b.userPhone === user.phone)
        ? { ...b, userName: updated.name, userPhone: updated.phone, userInstagram: updated.instagram, userEmail: updated.email }
        : b
    )
    saveBookings(bookings)
    window.dispatchEvent(new Event('profileUpdated'))
    setModal(true)
    setTimeout(() => setModal(false), 2200)
  }

  const cancel = (id) => setConfirmId(id)
  const doCancel = () => {
    const arr = getBookings().map(b =>
      b.id === confirmId ? { ...b, status: 'canceled_client', canceledAt: new Date().toISOString() } : b
    )
    saveBookings(arr)
    setConfirmId(null)
    setVersion(v => v + 1)
  }

  if (!user) return <div className="card"><b>{t('login_or_register')}</b></div>

  const initials = (user.name || '?')
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()

  const statusLabel = (b) => {
    if (b.status === 'pending') return '🟡 ' + t('pending')
    if (b.status === 'approved') return '🟢 ' + t('approved')
    if (b.status === 'canceled_client') return '❌ ' + t('canceled_by_client')
    if (b.status === 'canceled_admin') return '🔴 ' + t('canceled_by_admin')
    return b.status
  }

  return (
    <div style={container}>
      {/* === АККАУНТ === */}
      <div style={accountCard}>
        <div style={avatar}>{initials}</div>

        <div style={accountInfo}>
          <div style={{ fontWeight: 600, fontSize: '1.05rem' }}>{user.name}</div>
          {user.phone && <div style={infoLine}>{user.phone}</div>}
          {user.email && <div style={infoLine}>{user.email}</div>}
          {user.instagram && <div style={infoLine}>@{user.instagram}</div>}
        </div>

        <button style={logoutBtn} onClick={() => {
          localStorage.removeItem('currentUser')
          window.location.reload()
        }}>
          {t('logout') || 'Выйти'}
        </button>
      </div>

      {/* === ПРОФИЛЬ === */}
      <div style={outerCard}>
        <h3 style={{ margin: 0, padding: '10px 20px' }}>Профиль</h3>
        <div style={innerCard}>
          <div style={innerHeader} onClick={() => setShowProfile(!showProfile)}>
            <span style={{ color: '#a855f7', transition: 'transform 0.3s', transform: showProfile ? 'rotate(180deg)' : 'rotate(0deg)' }}>▾</span>
            <span style={{ fontWeight: 600 }}>Редактировать профиль</span>
          </div>

          <div style={{
            ...profileBody,
            maxHeight: showProfile ? '800px' : '0',
            opacity: showProfile ? 1 : 0,
            padding: showProfile ? '20px' : '0 20px'
          }}>
            <form className="col" style={{ gap: 12, textAlign: 'center' }} onSubmit={saveProfile}>
              <div><label>Имя</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
              <div><label>Instagram</label><input value={form.instagram} onChange={e => setForm({ ...form, instagram: e.target.value })} /></div>
              <div><label>Телефон</label><input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
              <div><label>Email</label><input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
              <div><label>Пароль</label><input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></div>
              <button type="submit" style={saveBtn}>💾 {t('save')}</button>
            </form>
          </div>
        </div>
      </div>

      {/* === МОИ ЗАПИСИ === */}
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
              const canCancel =
                (b.status === 'pending' || b.status === 'approved') &&
                new Date(b.end) > new Date()
              return (
                <tr key={b.id} style={tableRow}>
                  <td>{fmtDate(b.start)}</td>
                  <td>{fmtTime(b.start)}–{fmtTime(b.end)}</td>
                  <td>{statusLabel(b)}</td>
                  <td>{canCancel && <button style={cancelBtn} onClick={() => cancel(b.id)}>{t('cancel')}</button>}</td>
                </tr>
              )
            })}
            {!list.length && <tr><td colSpan="4" style={{ opacity: 0.6 }}>{t('no_records')}</td></tr>}
          </tbody>
        </table>
      </div>

      {modal && <Modal text={t('profile_updated')} />}
      {approvedModal && <Modal text="✅ Ваша запись подтверждена!" />}
    </div>
  )
}

function Modal({ text }) {
  return (
    <div style={modalBackdrop}>
      <div style={modalBox}>
        <div style={loader}></div>
        <h3>{text}</h3>
      </div>
    </div>
  )
}

/* === СТИЛИ === */
const container = { animation: 'fadeIn 0.5s ease', paddingBottom: '40px' }

const accountCard = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  background: 'rgba(20,10,35,0.8)',
  border: '1px solid rgba(168,85,247,0.3)',
  borderRadius: '14px',
  padding: '12px 20px',
  color: '#fff',
  marginBottom: '24px',
  backdropFilter: 'blur(10px)',
  boxShadow: '0 4px 25px rgba(120,50,200,0.25)'
}

const avatar = {
  width: 48,
  height: 48,
  borderRadius: '50%',
  background: 'rgba(130,60,255,0.35)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: 700,
  fontSize: '1.1rem',
  marginRight: '14px'
}

const accountInfo = { flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }
const infoLine = { opacity: 0.85, fontSize: '0.9rem' }

const logoutBtn = {
  border: '1px solid rgba(168,85,247,0.4)',
  background: 'linear-gradient(180deg, rgba(130,60,255,0.8), rgba(60,20,120,0.8))',
  borderRadius: '10px',
  padding: '6px 14px',
  color: '#fff',
  cursor: 'pointer',
  fontWeight: 500
}

const outerCard = {
  background: 'rgba(15,10,25,0.9)',
  border: '1px solid rgba(168,85,247,0.3)',
  borderRadius: '14px',
  color: '#fff',
  marginBottom: '24px'
}

const innerCard = {
  margin: '0 20px 20px',
  border: '1px solid rgba(168,85,247,0.2)',
  borderRadius: '12px',
  background: 'rgba(20,10,35,0.8)',
  overflow: 'hidden'
}

const innerHeader = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '12px 16px',
  cursor: 'pointer',
  background: 'rgba(25,15,45,0.8)',
  borderBottom: '1px solid rgba(168,85,247,0.25)'
}

const profileBody = { overflow: 'hidden', transition: 'all 0.45s ease', color: '#fff' }

const saveBtn = {
  marginTop: '10px',
  width: '100%',
  padding: '10px 20px',
  borderRadius: '10px',
  border: '1px solid rgba(168,85,247,0.4)',
  background: 'linear-gradient(180deg, rgba(130,60,255,0.8), rgba(60,20,120,0.8))',
  color: '#fff',
  fontWeight: 500,
  cursor: 'pointer'
}

const bookingsCard = { ...outerCard, padding: '18px' }
const bookingsHeader = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }
const filterButtons = { display: 'flex', gap: '8px' }
const filterBtn = active => ({
  borderRadius: '10px',
  padding: '8px 18px',
  background: active ? 'rgba(130,60,255,0.25)' : 'rgba(30,20,40,0.6)',
  border: active ? '1px solid rgba(168,85,247,0.6)' : '1px solid rgba(120,80,180,0.3)',
  color: '#fff',
  cursor: 'pointer'
})

const table = { width: '100%', borderCollapse: 'collapse', color: '#fff', textAlign: 'center' }
const tableRow = { transition: 'background 0.25s ease' }
const cancelBtn = { borderRadius: '8px', border: '1px solid rgba(180,95,255,0.4)', background: 'rgba(40,20,70,0.7)', color: '#fff', padding: '6px 14px', cursor: 'pointer' }

const modalBackdrop = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }
const modalBox = { background: 'rgba(20,15,35,0.85)', border: '1px solid rgba(180,95,255,0.4)', borderRadius: '14px', padding: '24px 32px', textAlign: 'center', color: '#fff', boxShadow: '0 0 40px rgba(150,85,247,0.25)' }
const loader = { width: '28px', height: '28px', margin: '0 auto 10px', borderRadius: '50%', border: '3px solid rgba(255,255,255,0.25)', borderTopColor: '#a855f7', animation: 'spin 1s linear infinite' }
