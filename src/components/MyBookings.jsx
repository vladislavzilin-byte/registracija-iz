import { useState, useEffect } from 'react'
import { useI18n } from '../lib/i18n'

export default function MyBookings() {
  const { t } = useI18n()

  // === STATE ===
  const [bookings, setBookings] = useState([])
  const [profile, setProfile] = useState({ name: '', phone: '', email: '' })
  const [showProfile, setShowProfile] = useState(false)
  const [showModal, setShowModal] = useState(false)

  // === LOAD BOOKINGS & PROFILE ===
  useEffect(() => {
    const storedBookings = JSON.parse(localStorage.getItem('bookings') || '[]')
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    setBookings(storedBookings)
    setProfile(user)
  }, [])

  // === HELPERS ===
  const fmtDate = (d) =>
    new Date(d).toLocaleDateString('lt-LT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })

  const fmtTime = (t) => t.slice(0, 5)

  // === CANCEL BOOKING ===
  const cancelBooking = (id) => {
    const updated = bookings.filter((b) => b.id !== id)
    setBookings(updated)
    localStorage.setItem('bookings', JSON.stringify(updated))
  }

  // === UPDATE PROFILE ===
  const updateProfile = () => {
    localStorage.setItem('user', JSON.stringify(profile))
    setShowModal(true)
    setTimeout(() => setShowModal(false), 2500)
  }

  // === RENDER ===
  return (
    <div style={container}>
      {/* === PROFILE HEADER === */}
      <div style={profileHeader}>
        <h2 style={{ margin: 0 }}>{t('my_profile')}</h2>
        <button style={arrowBtn} onClick={() => setShowProfile(!showProfile)}>
          {showProfile ? '▲' : '▼'}
        </button>
      </div>

      {/* === COLLAPSIBLE PROFILE FORM === */}
      {showProfile && (
        <div style={profileBox}>
          <div style={row}>
            <label>{t('name')}</label>
            <input
              type="text"
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
            />
          </div>
          <div style={row}>
            <label>{t('phone')}</label>
            <input
              type="tel"
              value={profile.phone}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
            />
          </div>
          <div style={row}>
            <label>{t('email')}</label>
            <input
              type="email"
              value={profile.email}
              onChange={(e) => setProfile({ ...profile, email: e.target.value })}
            />
          </div>
          <button style={saveBtn} onClick={updateProfile}>
            {t('update_profile')}
          </button>
        </div>
      )}

      {/* === MODAL === */}
      {showModal && (
        <div style={modalBackdrop}>
          <div style={modal}>
            <div style={spinner}></div>
            <h3>{t('profile_updated')}</h3>
            <button style={okBtn} onClick={() => setShowModal(false)}>
              OK
            </button>
          </div>
        </div>
      )}

      {/* === BOOKINGS LIST === */}
      <h2 style={{ marginTop: 40, marginBottom: 16 }}>{t('my_bookings')}</h2>
      {bookings.length === 0 ? (
        <p style={{ opacity: 0.6 }}>{t('no_bookings')}</p>
      ) : (
        <div style={bookingGrid}>
          {bookings.map((b) => (
            <div key={b.id} style={bookingCard}>
              <div style={bookingRow}>
                <strong>{b.service}</strong>
                <span>
                  {fmtDate(b.date)} · {fmtTime(b.time)}
                </span>
              </div>
              <button style={cancelBtn} onClick={() => cancelBooking(b.id)}>
                {t('cancel')}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* === STYLES === */
const container = {
  animation: 'fadeIn 0.5s ease',
  paddingBottom: '60px',
}

const profileHeader = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '10px',
}

const arrowBtn = {
  border: '1px solid rgba(168,85,247,0.4)',
  background: 'rgba(30,15,50,0.6)',
  color: '#fff',
  borderRadius: '8px',
  padding: '4px 10px',
  cursor: 'pointer',
  transition: '0.3s ease',
}

const profileBox = {
  background: 'rgba(20,15,30,0.65)',
  border: '1px solid rgba(168,85,247,0.25)',
  borderRadius: '14px',
  padding: '16px',
  boxShadow: '0 8px 25px rgba(150,85,247,0.15)',
  animation: 'fadeIn 0.4s ease',
}

const row = {
  display: 'flex',
  flexDirection: 'column',
  marginBottom: '12px',
}

const saveBtn = {
  marginTop: '6px',
  padding: '10px 18px',
  borderRadius: '10px',
  border: '1px solid rgba(168,85,247,0.4)',
  background:
    'linear-gradient(180deg, rgba(80,30,130,0.85), rgba(40,15,70,0.9))',
  color: '#fff',
  cursor: 'pointer',
  fontWeight: 500,
  transition: 'all 0.3s ease',
}

const bookingGrid = {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
}

const bookingCard = {
  background: 'rgba(20,15,30,0.6)',
  border: '1px solid rgba(168,85,247,0.25)',
  borderRadius: '12px',
  padding: '14px',
  boxShadow: '0 4px 15px rgba(150,85,247,0.1)',
  transition: 'transform 0.25s ease',
}

const bookingRow = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '8px',
}

const cancelBtn = {
  background: 'rgba(60,25,90,0.7)',
  border: '1px solid rgba(180,95,255,0.5)',
  color: '#fff',
  borderRadius: '8px',
  padding: '6px 14px',
  cursor: 'pointer',
  transition: 'all 0.3s ease',
}

const modalBackdrop = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.55)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 3000,
  animation: 'fadeIn 0.25s ease',
}

const modal = {
  background: 'rgba(20,15,35,0.85)',
  border: '1px solid rgba(180,95,255,0.35)',
  borderRadius: '14px',
  padding: '22px 26px',
  textAlign: 'center',
  boxShadow: '0 0 40px rgba(160,85,255,0.25)',
  animation: 'popIn 0.25s ease',
  color: '#fff',
}

const spinner = {
  width: '26px',
  height: '26px',
  borderRadius: '50%',
  margin: '0 auto 12px',
  border: '3px solid rgba(255,255,255,0.25)',
  borderTopColor: '#a855f7',
  animation: 'spin 1s linear infinite',
}

const okBtn = {
  marginTop: '10px',
  padding: '8px 16px',
  borderRadius: '10px',
  background: 'rgba(40,20,70,0.8)',
  border: '1px solid rgba(168,85,247,0.5)',
  color: '#fff',
  cursor: 'pointer',
  transition: '0.3s ease',
}

const style = document.createElement('style')
style.innerHTML = `
@keyframes fadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
@keyframes popIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
@keyframes spin { to { transform: rotate(360deg); } }
`
document.head.appendChild(style)
