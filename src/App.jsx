import Auth from './components/Auth.jsx'
import Calendar from './components/Calendar.jsx'
import Admin from './components/Admin.jsx'
import MyBookings from './components/MyBookings.jsx'
import { useState } from 'react'
import { getCurrentUser } from './lib/storage'
import { useI18n } from './lib/i18n'

export default function App() {
  const { lang, setLang, t } = useI18n()
  const [tab, setTab] = useState('calendar')
  const [user, setUser] = useState(getCurrentUser())

  return (
    <div className="container">
      {/* === Верхняя панель (Aurora Purple Header) === */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '14px 28px',
          background:
            'linear-gradient(180deg, rgba(36,17,50,0.95) 0%, rgba(20,10,30,0.95) 100%)',
          borderBottom: '1px solid rgba(168,85,247,0.3)',
          boxShadow: '0 0 25px rgba(150,90,255,0.15)',
          backdropFilter: 'blur(14px)',
          borderRadius: '0 0 14px 14px',
          position: 'sticky',
          top: 0,
          zIndex: 1000,
        }}
      >
        {/* LEFT — навигация */}
        <div style={{ display: 'flex', gap: '12px' }}>
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
        <div style={{ display: 'flex', gap: '10px' }}>
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

      <footer>
        <img src="/logo.svg" alt="logo" /> © IZ HAIR TREND
      </footer>
    </div>
  )
}

// === Стили ===
const navButton = {
  borderRadius: '10px',
  padding: '8px 18px',
  fontWeight: 500,
  fontSize: '0.95rem',
  border: '1px solid rgba(168,85,247,0.45)',
  background:
    'linear-gradient(180deg, rgba(55,20,90,0.9), rgba(25,10,45,0.9))',
  color: '#fff',
  cursor: 'pointer',
  transition: 'all 0.25s ease',
  boxShadow: '0 0 10px rgba(150,90,255,0.15)',
}

const activeButton = {
  border: '1px solid rgba(180,95,255,0.8)',
  boxShadow: '0 0 18px rgba(170,90,255,0.4)',
  background:
    'linear-gradient(180deg, rgba(80,30,130,0.9), rgba(40,15,70,0.9))',
}

const langButton = {
  borderRadius: '10px',
  padding: '7px 14px',
  border: '1px solid rgba(168,85,247,0.4)',
  color: '#fff',
  fontWeight: 500,
  fontSize: '0.85rem',
  background: 'rgba(25,10,45,0.6)',
  cursor: 'pointer',
  transition: '0.25s ease',
}

const activeLang = {
  background:
    'linear-gradient(180deg, rgba(110,60,190,0.9), rgba(60,20,110,0.9))',
  border: '1px solid rgba(180,95,255,0.7)',
  boxShadow: '0 0 15px rgba(150,90,255,0.3)',
}
