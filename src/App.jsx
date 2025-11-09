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
  const [showLangBar, setShowLangBar] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > lastScrollY && window.scrollY > 80) setShowLangBar(false)
      else setShowLangBar(true)
      setLastScrollY(window.scrollY)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [lastScrollY])

  return (
    <div className="container" style={containerStyle}>
      {/* Верхняя панель */}
      <div style={navBar}>
        <div style={leftSide}>
          <button
            className={tab === 'calendar' ? 'active' : ''}
            onClick={() => setTab('calendar')}
            style={navButton(tab === 'calendar')}
          >
            {t('nav_calendar')}
          </button>
          <button
            className={tab === 'my' ? 'active' : ''}
            onClick={() => setTab('my')}
            style={navButton(tab === 'my')}
          >
            {t('nav_my')}
          </button>
          <button
            className={tab === 'admin' ? 'active' : ''}
            onClick={() => setTab('admin')}
            style={navButton(tab === 'admin')}
          >
            {t('nav_admin')}
          </button>
        </div>

        {!isMobile && (
          <div style={langBlock}>
            <button onClick={() => setLang('lt')} style={langButton(lang === 'lt')}>
              LT
            </button>
            <button onClick={() => setLang('ru')} style={langButton(lang === 'ru')}>
              RU
            </button>
            <button onClick={() => setLang('en')} style={langButton(lang === 'en')}>
              GB
            </button>
          </div>
        )}
      </div>

      <Auth onAuth={setUser} />
      {tab === 'calendar' && <Calendar />}
      {tab === 'my' && <MyBookings />}
      {tab === 'admin' && <Admin />}

      <footer style={footerStyle}>© IZ HAIR TREND</footer>

      {isMobile && (
        <div
          style={{
            ...mobileLangBar,
            opacity: showLangBar ? 1 : 0,
            transform: `translate(-50%, ${showLangBar ? '0' : '20px'})`,
          }}
        >
          {['lt', 'ru', 'en'].map(code => (
            <button
              key={code}
              onClick={() => setLang(code)}
              style={{
                ...langButtonMobile,
                ...(lang === code ? activeLangMobile : {}),
              }}
            >
              {code === 'lt' ? '🇱🇹' : code === 'ru' ? '🇷🇺' : '🇬🇧'}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* === СТИЛИ === */

const containerStyle = {
  minHeight: '100vh',
  background:
    'radial-gradient(800px at 50% 120%, rgba(80,40,180,0.12), transparent 80%),' +
    'radial-gradient(600px at 0% 0%, rgba(140,70,255,0.05), transparent 80%),' +
    '#0b0a0f',
  color: '#fff',
  fontFamily: 'Inter, sans-serif',
  animation: 'fadeIn 0.8s ease-in-out',
}

const navBar = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '14px 28px',
  background: 'rgba(10,10,15,0.75)',
  backdropFilter: 'blur(18px)',
  boxShadow:
    '0 4px 12px rgba(0,0,0,0.45), 0 0 25px rgba(150,85,247,0.12), inset 0 -1px 0 rgba(168,85,247,0.2)',
  borderRadius: '0 0 16px 16px',
  position: 'relative',
  zIndex: 10,
}

const leftSide = {
  display: 'flex',
  gap: '12px',
}

const navButton = (active) => ({
  borderRadius: '12px',
  padding: '10px 22px',
  fontWeight: 500,
  cursor: 'pointer',
  background: active
    ? 'linear-gradient(180deg, rgba(130,60,255,0.9), rgba(70,0,120,0.85))'
    : 'rgba(20,15,30,0.6)',
  border: active
    ? '1.5px solid rgba(168,85,247,0.8)'
    : '1px solid rgba(120,80,180,0.3)',
  boxShadow: active
    ? '0 0 18px rgba(150,85,247,0.35)'
    : '0 0 0 rgba(0,0,0,0)',
  transition: 'all 0.3s ease',
  color: '#fff',
})

const langBlock = {
  display: 'flex',
  gap: '8px',
}

const langButton = (active) => ({
  borderRadius: '10px',
  width: '44px',
  height: '36px',
  fontWeight: 600,
  border: active
    ? '1.5px solid rgba(168,85,247,0.9)'
    : '1px solid rgba(120,80,180,0.25)',
  background: active
    ? 'linear-gradient(180deg, rgba(130,60,255,0.85), rgba(70,0,120,0.8))'
    : 'rgba(20,15,30,0.5)',
  color: '#fff',
  cursor: 'pointer',
  boxShadow: active ? '0 0 16px rgba(150,85,247,0.4)' : 'none',
  transition: 'all 0.3s ease',
})

const mobileLangBar = {
  position: 'fixed',
  bottom: 10,
  left: '50%',
  display: 'flex',
  justifyContent: 'center',
  gap: '14px',
  padding: '10px 16px',
  background: 'rgba(8,6,15,0.8)',
  border: '1px solid rgba(168,85,247,0.25)',
  borderRadius: '16px',
  backdropFilter: 'blur(14px)',
  boxShadow: '0 0 25px rgba(150,85,247,0.25)',
  zIndex: 2000,
  transition: 'all 0.4s ease-in-out',
}

const langButtonMobile = {
  borderRadius: '10px',
  padding: '7px 14px',
  border: '1px solid rgba(168,85,247,0.35)',
  background: 'rgba(25,10,45,0.7)',
  color: '#fff',
  fontWeight: 500,
  fontSize: '1rem',
  cursor: 'pointer',
  transition: '0.25s ease',
}

const activeLangMobile = {
  background: 'linear-gradient(180deg, rgba(110,60,190,0.9), rgba(60,20,110,0.9))',
  border: '1px solid rgba(180,95,255,0.7)',
  boxShadow: '0 0 18px rgba(150,90,255,0.4)',
}

const footerStyle = {
  marginTop: 40,
  textAlign: 'center',
  opacity: 0.4,
  fontSize: '0.9rem',
}

/* === Анимация === */
const style = document.createElement('style')
style.innerHTML = `
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
}`
document.head.appendChild(style)
