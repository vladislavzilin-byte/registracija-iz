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

  // ✅ Проверяем новые подтверждения от админа
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
    const idx = users.findIndex(u =>
      (u.phone && u.phone === user.phone) ||
      (u.email && u.email === user.email)
    )

    const updated = { ...user, ...form }
    if (idx >= 0) users[idx] = updated
    else users.push(updated)
    saveUsers(users)
    setCurrentUser(updated)

    // 🔄 обновляем бронирования
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
    const id = confirmId
    const arr = getBookings().map(b =>
      b.id === id ? { ...b, status: 'canceled_client', canceledAt: new Date().toISOString() } : b
    )
    saveBookings(arr)
    setConfirmId(null)
    setVersion(v => v + 1)
  }

  if (!user) return <div className="card"><b>{t('login_or_register')}</b></div>

  const statusLabel = (b) => {
    if (b.status === 'pending') return '🟡 ' + t('pending')
    if (b.status === 'approved') return '🟢 ' + t('approved')
    if (b.status === 'canceled_client') return '❌ ' + t('canceled_by_client')
    if (b.status === 'canceled_admin') return '🔴 ' + t('canceled_by_admin')
    return b.status
  }

  return (
    <div style={container}>
      {/* === ПРОФИЛЬ === */}
      <div style={outerCard}>
        <h3 style={{ margin: 0, padding: '10px 20px' }}>Профиль</h3>

        <div style={innerCard}>
          <div style={innerHeader} onClick={() => setShowProfile(!showProfile)}>
            <span style={{ color: '#a855f7', transition: 'transform 0.3s', transform: showProfile ? 'rotate(180deg)' : 'rotate(0deg)' }}>▾</span>
            <span style={{ fontWeight: 600 }}>Редактировать профиль</span>
          </div>

          <div
            style={{
              ...profileBody,
              maxHeight: showProfile ? '800px' : '0',
              opacity: showProfile ? 1 : 0,
              padding: showProfile ? '20px' : '0 20px'
            }}
          >
            <form className="col" style={{ gap: 12, textAlign: 'center' }} onSubmit={saveProfile}>
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
              <div>
                <label>Пароль</label>
                <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
              </div>

              {errors.contact && (
                <div style={{ background: 'rgba(255,0,0,0.1)', padding: 8, borderRadius: 8, color: '#f87171' }}>{errors.contact}</div>
              )}

              <button type="submit" style={saveBtn}><span>💾</span> {t('save')}</button>
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
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(168,85,247,0.25)' }}>
              <th style={tableCell}>Дата</th>
              <th style={tableCell}>Время</th>
              <th style={tableCell}>Статус</th>
              <th style={tableCell}></th>
            </tr>
          </thead>
          <tbody>
            {list.map(b => {
              const canCancel =
                (b.status === 'pending' || b.status === 'approved') &&
                new Date(b.end) > new Date()
              return (
                <tr key={b.id} style={tableRow}>
                  <td style={tableCell}>{fmtDate(b.start)}</td>
                  <td style={tableCell}>{fmtTime(b.start)}–{fmtTime(b.end)}</td>
                  <td style={tableCell}>{statusLabel(b)}</td>
                  <td style={tableCell}>
                    {canCancel && <button style={cancelBtn} onClick={() => cancel(b.id)}>{t('cancel')}</button>}
                  </td>
                </tr>
              )
            })}
            {!list.length && (
              <tr>
                <td colSpan="4" style={{ ...tableCell, opacity: 0.6 }}>{t('no_records')}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* === МОДАЛКИ === */}
      {modal && (
        <div style={modalBackdrop}>
          <div style={modalBox}>
            <div style={loader}></div>
            <h3 style={{ marginTop: 10 }}>{t('profile_updated')}</h3>
          </div>
        </div>
      )}

      {approvedModal && (
        <div style={modalBackdrop}>
          <div style={modalBox}>
            <h3 style={{ color: '#4ade80' }}>✅ Ваша запись подтверждена!</h3>
          </div>
        </div>
      )}
    </div>
  )
}

/* === СТИЛИ === */
const container = { animation: 'fadeIn 0.5s ease', paddingBottom: '40px' }

const outerCard = {
  background: 'rgba(15,10,25,0.9)',
  border: '1px solid rgba(168,85,247,0.3)',
  borderRadius: '14px',
  boxShadow: '0 0 25px rgba(168,85,247,0.15)',
  color: '#fff',
  marginBottom: '24px',
  overflow: 'hidden'
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
  cursor: 'pointer',
  transition: 'all 0.3s ease'
}

const bookingsCard = { ...outerCard, padding: '18px' }
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

const table = { width: '100%', borderCollapse: 'collapse', color: '#fff', textAlign: 'center' }
const tableCell = { padding: '12px 0', borderBottom: '1px solid rgba(168,85,247,0.12)' }
const tableRow = { transition: 'background 0.25s ease' }
const cancelBtn = { borderRadius: '8px', border: '1px solid rgba(180,95,255,0.4)', background: 'rgba(40,20,70,0.7)', color: '#fff', padding: '6px 14px', cursor: 'pointer', transition: 'all 0.3s ease' }

const modalBackdrop = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000, animation: 'fadeIn 0.3s ease' }

const modalBox = { background: 'rgba(20,15,35,0.85)', border: '1px solid rgba(180,95,255,0.4)', borderRadius: '14px', padding: '24px 32px', textAlign: 'center', color: '#fff', boxShadow: '0 0 40px rgba(150,85,247,0.25)', animation: 'popIn 0.3s ease' }

const loader = { width: '28px', height: '28px', margin: '0 auto 10px', borderRadius: '50%', border: '3px solid rgba(255,255,255,0.25)', borderTopColor: '#a855f7', animation: 'spin 1s linear infinite' }
