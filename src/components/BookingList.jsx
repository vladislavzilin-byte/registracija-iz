import { useState, useEffect } from 'react'
import { getBookings, getProfile, updateProfile } from '../lib/api'
import { useI18n } from '../lib/i18n'

export default function MyBookings() {
  const { t } = useI18n()
  const [profile, setProfile] = useState({ name: '', phone: '', password: '' })
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  // === Загрузка профиля и визитов ===
  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        const p = await getProfile()
        const b = await getBookings()
        setProfile(p)
        setBookings(b)
      } catch (err) {
        console.error('Ошибка загрузки:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // === Обновление профиля ===
  const handleUpdate = async () => {
    setSaving(true)
    setMessage('')
    try {
      await updateProfile(profile)
      setMessage('✅ Профиль обновлён')
    } catch (err) {
      setMessage('❌ Ошибка при обновлении')
    } finally {
      setSaving(false)
      setTimeout(() => setMessage(''), 2500)
    }
  }

  return (
    <div style={page}>
      {/* === Блок профиля === */}
      <div style={glassCard}>
        <h2 style={sectionTitle}>{t('my_profile')}</h2>
        <div style={form}>
          <input
            style={input}
            placeholder={t('name')}
            value={profile.name}
            onChange={(e) => setProfile({ ...profile, name: e.target.value })}
          />
          <input
            style={input}
            placeholder={t('phone')}
            value={profile.phone}
            onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
          />
          <input
            style={input}
            type="password"
            placeholder={t('password')}
            value={profile.password}
            onChange={(e) => setProfile({ ...profile, password: e.target.value })}
          />
          <button style={saveButton} onClick={handleUpdate} disabled={saving}>
            {saving ? <span style={spinner}></span> : t('save_changes')}
          </button>
          {message && <div style={toast}>{message}</div>}
        </div>
      </div>

      {/* === Блок записей === */}
      <div style={glassCard}>
        <div style={headerRow}>
          <h2 style={sectionTitle}>{t('my_bookings')}</h2>
          <button style={refreshButton} onClick={() => window.location.reload()}>
            {loading ? <span style={spinnerSmall}></span> : '⟳'}
          </button>
        </div>

        {loading ? (
          <div style={loadingBox}>
            <span style={spinnerLarge}></span>
          </div>
        ) : bookings.length === 0 ? (
          <p style={noBookings}>{t('no_bookings')}</p>
        ) : (
          <div style={tableWrapper}>
            {bookings.map((b, i) => (
              <div key={i} style={{ ...bookingRow, animationDelay: `${i * 0.07}s` }}>
                <div style={bookingCol}>{b.date}</div>
                <div style={bookingCol}>{b.time}</div>
                <div style={bookingCol}>
                  <div style={{ ...statusDot, background: b.statusColor || '#facc15' }}></div>
                  {b.status || 'Ожидает подтверждения'}
                </div>
                <button style={cancelButton}>{t('cancel')}</button>
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
  gap: '32px',
  marginTop: 25,
}

const glassCard = {
  background: 'rgba(20,10,40,0.55)',
  border: '1px solid rgba(168,85,247,0.25)',
  borderRadius: '20px',
  padding: '24px 26px',
  backdropFilter: 'blur(18px)',
  boxShadow: `
    0 0 25px rgba(150,85,255,0.15),
    inset 0 0 30px rgba(120,60,200,0.08)
  `,
  animation: 'fadeIn 0.6s ease-in-out',
  transition: 'all 0.3s ease',
}

const sectionTitle = {
  fontSize: '1.2rem',
  fontWeight: 600,
  color: '#E9D8FF',
  textShadow: '0 0 10px rgba(170,90,255,0.6)',
  marginBottom: 16,
}

const form = {
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
}

const input = {
  padding: '12px 14px',
  borderRadius: '12px',
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
  borderRadius: '12px',
  border: '1px solid rgba(168,85,247,0.6)',
  background:
    'linear-gradient(135deg, rgba(150,70,255,0.8), rgba(80,30,150,0.85))',
  color: '#fff',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.3s ease',
  boxShadow: '0 0 18px rgba(150,85,255,0.35)',
}
saveButton[':hover'] = { filter: 'brightness(1.2)' }

const toast = {
  marginTop: 10,
  textAlign: 'center',
  fontSize: '0.9rem',
  color: '#a855f7',
  opacity: 0.9,
}

const headerRow = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 12,
}

const refreshButton = {
  borderRadius: '50%',
  width: 34,
  height: 34,
  background: 'rgba(35,20,70,0.6)',
  border: '1px solid rgba(168,85,247,0.5)',
  color: '#c5a6ff',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: '0.25s ease',
}

const tableWrapper = {
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
  marginTop: 8,
}

const bookingRow = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr 2fr auto',
  alignItems: 'center',
  padding: '12px 16px',
  borderRadius: '12px',
  background: 'rgba(25,10,50,0.5)',
  border: '1px solid rgba(168,85,247,0.15)',
  color: '#fff',
  animation: 'fadeUp 0.4s ease forwards',
}

const bookingCol = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
}

const cancelButton = {
  borderRadius: '10px',
  padding: '6px 14px',
  border: '1px solid rgba(255,100,150,0.5)',
  background: 'rgba(90,20,50,0.4)',
  color: '#ff8faa',
  cursor: 'pointer',
  transition: '0.25s ease',
}
cancelButton[':hover'] = { filter: 'brightness(1.3)' }

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
  width: '18px',
  height: '18px',
  borderRadius: '50%',
  border: '2px solid rgba(255,255,255,0.25)',
  borderTopColor: '#a855f7',
  animation: 'spin 0.8s linear infinite',
}

const spinnerSmall = {
  width: '14px',
  height: '14px',
  borderRadius: '50%',
  border: '2px solid rgba(255,255,255,0.25)',
  borderTopColor: '#a855f7',
  animation: 'spin 0.8s linear infinite',
}

const spinnerLarge = {
  width: '30px',
  height: '30px',
  borderRadius: '50%',
  border: '3px solid rgba(255,255,255,0.25)',
  borderTopColor: '#a855f7',
  animation: 'spin 0.8s linear infinite',
}

const style = document.createElement('style')
style.innerHTML = `
@keyframes spin {
  to { transform: rotate(360deg); }
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}
`
document.head.appendChild(style)
