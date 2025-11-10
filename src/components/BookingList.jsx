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
      setMessage('✅ Профиль успешно обновлён')
    } catch (err) {
      setMessage('❌ Ошибка при обновлении')
    } finally {
      setSaving(false)
      setTimeout(() => setMessage(''), 2500)
    }
  }

  return (
    <div style={wrapper}>
      {/* === Блок профиля === */}
      <div style={card}>
        <h2 style={title}>{t('my_profile')}</h2>
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

      {/* === Таблица визитов === */}
      <div style={card}>
        <div style={headerRow}>
          <h2 style={title}>{t('my_bookings')}</h2>
          <button style={refreshButton} onClick={() => window.location.reload()}>
            {loading ? <span style={spinner}></span> : '⟳'}
          </button>
        </div>

        {loading ? (
          <div style={loadingBox}>
            <span style={spinnerLarge}></span>
          </div>
        ) : bookings.length === 0 ? (
          <p style={noBookings}>{t('no_bookings')}</p>
        ) : (
          <table style={table}>
            <thead>
              <tr>
                <th>{t('date')}</th>
                <th>{t('time')}</th>
                <th>{t('service')}</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b, i) => (
                <tr key={i} style={tableRow}>
                  <td>{b.date}</td>
                  <td>{b.time}</td>
                  <td>{b.service}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

/* === СТИЛИ === */

const wrapper = {
  display: 'flex',
  flexDirection: 'column',
  gap: '32px',
  marginTop: 20,
}

const card = {
  background: 'rgba(18, 10, 30, 0.65)',
  border: '1px solid rgba(168,85,247,0.25)',
  borderRadius: '16px',
  padding: '22px 24px',
  boxShadow: '0 0 35px rgba(150,85,255,0.1)',
  backdropFilter: 'blur(14px)',
  animation: 'fadeIn 0.6s ease-in-out',
}

const title = {
  fontSize: '1.2rem',
  fontWeight: 600,
  marginBottom: 14,
  color: '#e8d9ff',
  textShadow: '0 0 8px rgba(170,90,255,0.6)',
}

const form = {
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
}

const input = {
  padding: '12px 14px',
  borderRadius: '10px',
  border: '1px solid rgba(168,85,247,0.25)',
  background: 'rgba(255,255,255,0.03)',
  color: '#fff',
  fontSize: '0.95rem',
  outline: 'none',
  transition: 'all 0.3s ease',
  boxShadow: 'inset 0 0 10px rgba(150,85,255,0.05)',
}

const saveButton = {
  marginTop: 10,
  padding: '10px 20px',
  borderRadius: '10px',
  background: 'linear-gradient(90deg, rgba(150,70,255,0.6), rgba(90,40,180,0.6))',
  border: '1px solid rgba(168,85,247,0.7)',
  color: '#fff',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.3s ease',
  boxShadow: '0 0 15px rgba(160,85,255,0.3)',
}
saveButton[':hover'] = { filter: 'brightness(1.2)' }

const toast = {
  marginTop: 8,
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
refreshButton[':hover'] = { transform: 'rotate(90deg)' }

const table = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: '0.95rem',
  color: '#f5f0ff',
}
const tableRow = {
  transition: 'background 0.2s ease',
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
  border: '2px solid rgba(255,255,255,0.3)',
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
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}
`
document.head.appendChild(style)
