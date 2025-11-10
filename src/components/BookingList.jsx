import { useState, useEffect } from 'react'
import { getBookings, getProfile, updateProfile } from '../lib/api'
import { useI18n } from '../lib/i18n'

export default function MyBookings() {
  const { t } = useI18n()
  const [profile, setProfile] = useState({ name: '', instagram: '', phone: '', email: '', password: '' })
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  // === Загрузка данных ===
  useEffect(() => {
    async function loadData() {
      try {
        const p = await getProfile()
        const b = await getBookings()
        setProfile(p || {})
        setBookings(b || [])
      } catch (err) {
        console.error('Ошибка загрузки данных:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // === Сохранение профиля ===
  const handleSave = async () => {
    setSaving(true)
    try {
      await updateProfile(profile)
      setMessage('✅ Сохранено')
      setTimeout(() => setMessage(''), 2000)
    } catch (err) {
      setMessage('❌ Ошибка')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={page}>
      {/* === Блок профиля === */}
      <div style={card}>
        <h2 style={title}>{t('my_profile')}</h2>
        <div style={form}>
          <input
            style={input}
            placeholder="Имя"
            value={profile.name || ''}
            onChange={(e) => setProfile({ ...profile, name: e.target.value })}
          />
          <input
            style={input}
            placeholder="Instagram"
            value={profile.instagram || ''}
            onChange={(e) => setProfile({ ...profile, instagram: e.target.value })}
          />
          <input
            style={input}
            placeholder="Телефон"
            value={profile.phone || ''}
            onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
          />
          <input
            style={input}
            placeholder="Email"
            value={profile.email || ''}
            onChange={(e) => setProfile({ ...profile, email: e.target.value })}
          />
          <input
            style={input}
            type="password"
            placeholder="Пароль"
            value={profile.password || ''}
            onChange={(e) => setProfile({ ...profile, password: e.target.value })}
          />
          <button style={saveButton} onClick={handleSave} disabled={saving}>
            {saving ? '...' : t('save_changes')}
          </button>
          {message && <div style={toast}>{message}</div>}
        </div>
      </div>

      {/* === Блок записей === */}
      <div style={card}>
        <h2 style={title}>{t('my_bookings')}</h2>
        {loading ? (
          <div style={loadingBox}>
            <span style={spinner}></span>
          </div>
        ) : bookings.length === 0 ? (
          <p style={noBookings}>Нет записей</p>
        ) : (
          <div style={tableWrapper}>
            {bookings.map((b, i) => (
              <div key={i} style={{ ...bookingRow, animationDelay: `${i * 0.07}s` }}>
                <div>{b.date}</div>
                <div>{b.time}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    style={{
                      ...statusDot,
                      background:
                        b.status === 'confirmed'
                          ? '#4ade80'
                          : b.status === 'pending'
                          ? '#facc15'
                          : '#f87171',
                    }}
                  />
                  {b.status === 'confirmed'
                    ? 'Подтверждено'
                    : b.status === 'pending'
                    ? 'Ожидает подтверждения'
                    : 'Отменено'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* === СТИЛИ === */
const page = {
  display: 'flex',
  flexDirection: 'column',
  gap: 32,
  marginTop: 25,
}

const card = {
  background: 'rgba(20,10,40,0.55)',
  border: '1px solid rgba(168,85,247,0.25)',
  borderRadius: 20,
  padding: '24px 26px',
  backdropFilter: 'blur(18px)',
  boxShadow: `
    0 0 25px rgba(150,85,255,0.15),
    inset 0 0 30px rgba(120,60,200,0.08)
  `,
  animation: 'fadeIn 0.6s ease-in-out',
}

const title = {
  fontSize: '1.2rem',
  fontWeight: 600,
  color: '#E9D8FF',
  textShadow: '0 0 8px rgba(170,90,255,0.5)',
  marginBottom: 16,
}

const form = {
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
}

const input = {
  padding: '12px 14px',
  borderRadius: 12,
  border: '1px solid rgba(168,85,247,0.25)',
  background: 'rgba(255,255,255,0.04)',
  color: '#fff',
  fontSize: '0.95rem',
  outline: 'none',
  transition: '0.3s',
}

const saveButton = {
  marginTop: 10,
  padding: '10px 20px',
  borderRadius: 12,
  border: '1px solid rgba(168,85,247,0.6)',
  background: 'linear-gradient(135deg, rgba(150,70,255,0.8), rgba(80,30,150,0.85))',
  color: '#fff',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.3s ease',
  boxShadow: '0 0 15px rgba(160,85,255,0.3)',
}

const toast = {
  marginTop: 8,
  textAlign: 'center',
  fontSize: '0.9rem',
  color: '#a855f7',
  opacity: 0.9,
}

const tableWrapper = {
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  marginTop: 8,
}

const bookingRow = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr 2fr',
  alignItems: 'center',
  padding: '12px 16px',
  borderRadius: 12,
  background: 'rgba(25,10,50,0.5)',
  border: '1px solid rgba(168,85,247,0.15)',
  color: '#fff',
  animation: 'fadeUp 0.4s ease forwards',
}

const statusDot = {
  width: 10,
  height: 10,
  borderRadius: '50%',
  boxShadow: '0 0 8px currentColor',
}

const noBookings = {
  textAlign: 'center',
  color: 'rgba(255,255,255,0.6)',
  padding: '12px 0',
}

const loadingBox = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  padding: 40,
}

const spinner = {
  width: 28,
  height: 28,
  borderRadius: '50%',
  border: '3px solid rgba(255,255,255,0.25)',
  borderTopColor: '#a855f7',
  animation: 'spin 0.8s linear infinite',
}

const style = document.createElement('style')
style.innerHTML = `
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
`
document.head.appendChild(style)
