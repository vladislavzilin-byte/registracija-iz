import Auth from './components/Auth.jsx'
import Calendar from './components/Calendar.jsx'
import Admin from './components/Admin.jsx'
import MyBookings from './components/MyBookings.jsx'
import { useState, useEffect } from 'react'
import { getCurrentUser } from './lib/storage'
import { useI18n } from './lib/i18n'

export default function App() {
  const { lang, setLang, t } = useI18n()
  const [tab, setTab] = useState('calendar')
  const [user, setUser] = useState(getCurrentUser())
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  // следим за шириной экрана
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <div className="container">
      {/* === Верхняя панель (адаптивная) === */}
      <div
        style={{
          ...navBar,
          position: isMobile ? 'relative' : 'sticky',
          padding: isMobile ? '10px 14px' : '14px 28px',
          borderRadius: isMobile ? '0 0 12px 12px' : '0 0 16px 16px',
        }}
      >
        {/* LEFT — навигация */}
        <div
          style={{
            display: 'flex',
            gap: isMobile ? '8px' : '12px',
            flexWrap: 'wrap',
          }}
        >
          <button
            onClick={() => setTab('calendar')}
            style={{
              ...navButton,
              ...(tab === 'calendar' ? activeButton : {}),
            }}
          >
            {t('nav_calendar')}
          </button>
          <button
            onClick={() => setTab('my')}
            style={{
              ...navButton,
              ...(tab === 'my' ? activeButton : {}),
            }}
          >
            {t('nav_my')}
          </button>
          <button
            onClick={() => setTab('admin')}
            style={{
              ...navButton,
              ...(tab === 'admin' ? activeButton : {}),
            }}
          >
            {t('nav_admin')}
          </button>
        </div>

        {/* RIGHT — языки */}
        <div
          style={{
            display: 'flex',
            gap: '10px',
            flexWrap: 'wrap',
            justifyContent: isMobile ? 'flex-start' : 'flex-end',
          }}
        >
          <button
            onClick={() => setLang('lt')}
            style={{
              ...langButton,
              ...(lang === 'lt' ? activeLang : {}),
            }}
          >
            🇱🇹
          </button>
          <button
            onClick={() => setLang('ru')}
            style={{
              ...langButton,
              ...(lang === 'ru' ? activeLang : {}),
            }}
          >
            🇷🇺
          </button>
          <button
            onClick={() => setLang('en')}
            style={{
              ...langButton,
              ...(lang === 'en' ? activeLang : {}),
            }}
          >
            🇬🇧
          </button>
        </div>
      </div>

      {/* === Контент === */}
      <Auth onAuth={setUser} />
      {tab === 'calendar' && <Calendar />}
      {tab === 'my' && <MyBookings />}
      {tab === 'admin' && <Admin />}

      {/* === Футер === */}
      <footer style={footerStyle}>
        <img src="/logo.svg" alt="logo" style={{ height: 20, opacity: 0.7, marginRight: 6 }} />
        © IZ HAIR TREND
      </footer>
    </div>
  )
}

/* === Стили === */

// Верхняя панель
const navBar = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: '8px',
  background: 'rgba(8, 6, 15, 0.8)',
  backdropFilter: 'blur(18px)',
  boxShadow: `
    0 3px 16px rgba(0,0,0,0.55),
    0 0 40px rgba(110,50,200,0.18),
    inset 0 -1px 0 rgba(150,85,247,0.12)
  `,
  position: 'relative',
  top: 0,
  zIndex: 1000,
  animation: 'fadeIn 0.6s ease-in-out',
}

// Кнопки навигации
const navButton = {
  borderRadius: '10px',
  padding: '9px 20px',
  fontWeight: 500,
  fontSize: '0.95rem',
  border: '1px solid rgba(168,85,247,0.4)',
  background: 'linear-gradient(180deg, rgba(55,20,90,0.85), rgba(25,10,45,0.85))',
  color: '#fff',
  cursor: 'pointer',
  transition: 'all 0.3s ease',
  boxShadow: '0 0 10px rgba(150,90,255,0.15)',
}

const activeButton = {
  border: '1px solid rgba(180,95,255,0.8)',
  background: 'linear-gradient(180deg, rgba(80,30,130,0.9), rgba(40,15,70,0.9))',
  boxShadow: '0 0 25px rgba(180,95,255,0.6), 0 0 10px rgba(180,95,255,0.3) inset',
}

// Кнопки языков
const langButton = {
  borderRadius: '10px',
  padding: '7px 14px',
  border: '1px solid rgba(168,85,247,0.35)',
  color: '#fff',
  fontWeight: 500,
  fontSize: '0.85rem',
  background: 'rgba(25,10,45,0.6)',
  cursor: 'pointer',
  transition: '0.25s ease',
}

const activeLang = {
  background: 'linear-gradient(180deg, rgba(110,60,190,0.9), rgba(60,20,110,0.9))',
  border: '1px solid rgba(180,95,255,0.7)',
  boxShadow: '0 0 15px rgba(150,90,255,0.3)',
}

// Футер
const footerStyle = {
  marginTop: 40,
  textAlign: 'center',
  opacity: 0.45,
  fontSize: '0.9rem',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
}

/* Анимация появления */
const style = document.createElement('style')
style.innerHTML = `
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
}`
document.head.appendChild(style)
