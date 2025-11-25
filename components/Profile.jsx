import React, { useState } from 'react'
import {
  getCurrentUser, setCurrentUser,
  getUsers, saveUsers,
  getBookings, saveBookings
} from '../lib/storage'
import { useI18n } from '../lib/i18n'

export default function Profile() {
  const { t } = useI18n()
  const user = getCurrentUser()

  if (!user) {
    return (
      <div className="card" style={{ marginTop: 16 }}>
        <h3>{t('my_profile')}</h3>
        <p className="muted">{t('profile_login_hint')}</p>
      </div>
    )
  }

  const [form, setForm] = useState({
    name: user.name || '',
    instagram: user.instagram || '',
    phone: user.phone || '',
    email: user.email || '',
    password: user.password || ''
  })
  const [toast, setToast] = useState(null)

  const onChange = k => e => setForm(prev => ({ ...prev, [k]: e.target.value }))

  const save = e => {
    e.preventDefault()

    const users = getUsers()
    const idx = users.findIndex(u => (u.phone === user.phone) || (u.email === user.email))
    const updated = { ...user, ...form }

    // 🔄 обновляем профиль пользователя
    if (idx >= 0) users[idx] = updated
    else users.push(updated)
    saveUsers(users)
    setCurrentUser(updated)

    // 🔄 обновляем его брони
    const bookings = getBookings().map(b =>
      b.userEmail === user.email || b.userPhone === user.phone
        ? {
            ...b,
            userName: updated.name,
            userPhone: updated.phone,
            userInstagram: updated.instagram,
            userEmail: updated.email
          }
        : b
    )
    saveBookings(bookings)

    // 🔔 уведомляем админку, чтобы обновилась таблица
    window.dispatchEvent(new Event('profileUpdated'))

    // ✅ показываем уведомление
    setToast(t('profile_saved'))
    setTimeout(() => setToast(null), 1500)
  }

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <h3>{t('my_profile')}</h3>
      <form onSubmit={save} className="col" style={{ gap: 12 }}>
        <div>
          <label>{t('name')}</label>
          <input value={form.name} onChange={onChange('name')} />
        </div>
        <div>
          <label>{t('instagram')}</label>
          <input value={form.instagram} onChange={onChange('instagram')} />
        </div>
        <div>
          <label>{t('phone')}</label>
          <input value={form.phone} onChange={onChange('phone')} />
        </div>
        <div>
          <label>{t('email_opt')}</label>
          <input value={form.email} onChange={onChange('email')} />
        </div>
        <div>
          <label>{t('password')}</label>
          <input
            type="password"
            value={form.password}
            onChange={onChange('password')}
          />
        </div>
        <div>
          <button type="submit">{t('save')}</button>
        </div>
      </form>
      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
