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

// Цвета для тегов услуг
const tagColors = {
  "Šukuosena": "#c084fc",
  "Tresų nuoma": "#60a5fa",
  "Papuošalų nuoma": "#f472b6",
  "Atvykimas": "#facc15",
  "Konsultacija": "#34d399"
}

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
    if (filter === 'active') return all.filter(b => b.status === 'approved' || b.status === 'approved_paid')
    if (filter === 'canceled')
      return all.filter(b => b.status === 'canceled_client' || b.status === 'canceled_admin')
    return all
  }, [filter, version, bookingsAll.length])

  // ПУШ-окно если запись только что подтверждена
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

    // обновляем все записи этого пользователя
    const bookings = getBookings().map(b =>
      (b.userEmail === user.email || b.userPhone === user.phone)
        ? { ...b, userName: updated.name, userPhone: updated.phone, userInstagram: updated.instagram, userEmail: updated.email }
        : b
    )
    saveBookings(bookings)
    window.dispatchEvent(new Event('profileUpdated'))

    setModal(true)
    setTimeout(() => setModal(false), 2000)
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

  // Оплата → меняем статус
  const pay = (id) => {
    const arr = getBookings().map(b =>
      b.id === id ? { ...b, status: 'approved_paid', paidAt: new Date().toISOString() } : b
    )
    saveBookings(arr)
    setVersion(v => v + 1)
  }

  if (!user) return <div className="card"><b>{t('login_or_register')}</b></div>

  const statusDot = (b) => {
    if (b.status === 'approved_paid')
      return <span style={{ ...dot, background: '#4ade80', boxShadow: '0 0 8px #4ade80' }}></span>

    if (b.status === 'approved')
      return <span style={{ ...dot, background: '#ef4444', boxShadow: '0 0 8px #ef4444' }}></span>

    if (b.status === 'pending')
      return <span style={{ ...dot, background: '#facc15' }}></span>

    return <span style={{ ...dot, background: '#999' }}></span>
  }

  return (
    <div style={container}>

      {/* === ПРОФИЛЬ (как раньше!) === */}
      <div style={outerCard}>
        <h3 style={{ margin: 0, padding: '10px 20px' }}>Профиль</h3>
        <div style={innerCard}>
          <div style={innerHeader} onClick={() => setShowProfile(!showProfile)}>
            <span style={{ color: '#a855f7', transform: showProfile ? 'rotate(180deg)' : 'rotate(0deg)', transition: '0.3s' }}>▾</span>
            <span style={{ fontWeight: 600 }}>Редактировать профиль</span>
          </div>

          <div style={{
            ...profileBody,
            maxHeight: showProfile ? '900px' : '0',
            opacity: showProfile ? 1 : 0,
            padding: showProfile ? '20px' : '0 20px'
          }}>
            <form className="col" style={{ gap: 12 }} onSubmit={saveProfile}>
              <div><label>Имя</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
              <div><label>Instagram</label><input value={form.instagram} onChange={e => setForm({ ...form, instagram: e.target.value })} /></div>
              <div><label>Телефон</label><input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
              <div><label>Email</label><input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
              <div><label>Пароль</label><input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></div>

              {errors.contact && <div style={{ color: '#f87171' }}>{errors.contact}</div>}

              <button type="submit" style={saveBtn}>💾 Сохранить</button>
            </form>
          </div>
        </div>
      </div>

      {/* === МОИ ЗАПИСИ === */}
      <div style={bookingsCard}>
        <div style={bookingsHeader}>
          <h3 style={{ margin: 0 }}>Мои записи</h3>

          <div style={filterButtons}>
            <button style={filterBtn(filter === 'all')} onClick={() => setFilter('all')}>Все</button>
            <button style={filterBtn(filter === 'active')} onClick={() => setFilter('active')}>Активные</button>
            <button style={filterBtn(filter === 'canceled')} onClick={() => setFilter('canceled')}>Отменённые</button>
          </div>
        </div>

        {/* 📱 Мобильные карточки */}
        <div className="mobile-list">
          {list.map(b => {
            const canCancel =
              (b.status === 'pending' || b.status === 'approved') &&
              new Date(b.end) > new Date()

            return (
            <div key={b.id} style={cardItem}>
  {/* Дата + статус */}
  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
    {statusDot(b)}
    <b>{fmtDate(b.start)}</b>
  </div>

  {/* Время (24h формат работает в storage.js) */}
  <div style={{ opacity: .8, marginTop: 4 }}>
    {fmtTime(b.start)} – {fmtTime(b.end)}
  </div>

  {/* Теги услуг */}
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
    {b.services?.map(s => (
      <span key={s} style={{
        padding: '4px 8px',
        borderRadius: 8,
        background: 'rgba(255,255,255,0.08)',
        border: `1px solid ${tagColors[s]}55`,
        color: tagColors[s],
        fontSize: 13
      }}>
        {s}
      </span>
    ))}
  </div>

  {/* 💰 ДЕПОЗИТ */}
  {b.price && (
    <div style={{
      marginTop: 10,
      padding: '10px 12px',
      borderRadius: 10,
      background: 'rgba(255,255,255,0.06)',
      border: '1px solid rgba(148,163,184,0.3)',
      fontSize: 14,
      color: '#fff'
    }}>
      Avansas (€): <b>{b.price}</b>
    </div>
  )}

  {/* 📌 СТАТУС */}
  <div style={{ marginTop: 10, fontSize: 14 }}>
    <b>Статус: </b>
    {b.status === 'approved_paid' && (
      <span style={{ color: '#4ade80' }}>🟢 Оплачено</span>
    )}
    {b.status === 'approved' && (
      <span style={{ color: '#22c55e' }}>🟢 Подтверждена</span>
    )}
    {b.status === 'pending' && (
      <span style={{ color: '#eab308' }}>🟡 Ожидает подтверждения</span>
    )}
    {(b.status === 'canceled_client' || b.status === 'canceled_admin') && (
      <span style={{ color: '#ef4444' }}>🔴 Отменена</span>
    )}
  </div>

  {/* Оплата */}
  {b.status === 'approved' && (
    <button style={payBtn} onClick={() => pay(b.id)}>💳 Apmokėti</button>
  )}

  {/* Отмена */}
  {canCancel && (
    <button style={cancelBtn} onClick={() => cancel(b.id)}>Отменить</button>
  )}
</div>
            )
          })}
        </div>

      </div>

      {/* === МОДАЛКИ === */}
      {modal && (
        <div style={modalBackdrop}>
          <div style={modalBox}>
            <h3 style={{ marginTop: 10 }}>Данные обновлены</h3>
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

      {/* Подтверждение отмены */}
      {confirmId && (
        <div style={modalBackdrop}>
          <div style={modalBox}>
            <h3>Отменить запись?</h3>
            <button onClick={doCancel} style={cancelBtn}>Да</button>
            <button onClick={() => setConfirmId(null)} style={{ ...cancelBtn, background: 'rgba(80,80,120,0.4)' }}>Нет</button>
          </div>
        </div>
      )}

    </div>
  )
}

/* === СТИЛИ === */

const container = { paddingBottom: '40px' }

const dot = {
  width: 12,
  height: 12,
  borderRadius: '50%',
  display: 'inline-block'
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
  background: 'rgba(20,10,35,0.8)'
}

const innerHeader = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '12px 16px',
  cursor: 'pointer',
  background: 'rgba(25,15,45,0.8)',
  borderBottom: '1px solid rgba(168,85,247,0.25)'
}

const profileBody = { overflow: 'hidden', transition: 'all 0.45s ease' }

const saveBtn = {
  marginTop: '10px',
  width: '100%',
  padding: '10px 20px',
  borderRadius: '10px',
  background: 'linear-gradient(180deg, #9333ea, #4c1d95)',
  color: '#fff',
  cursor: 'pointer'
}

const bookingsCard = { ...outerCard, padding: '18px' }
const bookingsHeader = { display: 'flex', justifyContent: 'space-between', marginBottom: 10 }
const filterButtons = { display: 'flex', gap: 8 }

const filterBtn = (active) => ({
  padding: '8px 18px',
  borderRadius: '10px',
  background: active ? 'rgba(130,60,255,0.25)' : 'rgba(30,20,40,0.6)',
  border: '1px solid rgba(168,85,247,0.5)',
  color: '#fff'
})

const cardItem = {
  border: '1px solid rgba(168,85,247,0.25)',
  background: 'rgba(20,10,30,0.55)',
  padding: 14,
  borderRadius: 14,
  marginBottom: 12,
  animation: 'fadeIn .35s ease'
}

const payBtn = {
  marginTop: 10,
  width: '100%',
  padding: '8px 10px',
  borderRadius: 10,
  background: 'rgba(50,180,80,0.25)',
  border: '1px solid #4ade80',
  color: '#4ade80',
  cursor: 'pointer'
}

const cancelBtn = {
  marginTop: 10,
  padding: '8px 12px',
  borderRadius: 10,
  background: 'rgba(120,30,60,0.4)',
  border: '1px solid rgba(200,80,120,0.6)',
  color: '#fff',
  cursor: 'pointer'
}

const modalBackdrop = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.6)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 3000
}

const modalBox = {
  background: 'rgba(20,15,35,0.85)',
  borderRadius: 14,
  padding: '24px 32px',
  border: '1px solid rgba(168,85,247,0.3)',
  color: '#fff',
  textAlign: 'center'
}

