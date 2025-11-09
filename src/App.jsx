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

  // Плавное появление/исчезновение панели языков
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
      {/* === Верхняя панель === */}
      <div
        style={{
          ...navBar,
          flexWrap: isMobile ? 'wrap' : 'nowrap',
          justifyContent: isMobile ? 'center' : 'space-between',
          padding: isMobile ? '10px 12px' : '14px 28px',
          borderRadius: isMobile ? '0 0 10px 10px' : '0 0 16px 16px',
        }}
      >
        {/* Кнопки навигации */}
        <div style={{ display: 'flex', gap: isMobile ? '8px' : '12px', flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
          {[
            { key: 'calendar', label: t('nav_calendar') },
            { key: 'my', label: t('nav_my') },
            { key: 'admin', label: t('nav_admin') },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                ...navButton,
                ...(tab === key ? activeButton : {}),
                minWidth: isMobile ? '90px' : '130px',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Языки (справа на ПК) */}
        {!isMobile && (
          <div style={langGroup}>
            {['lt', 'ru', 'en'].map(code => (
              <button
                key={code}
                onClick={() => setLang(code)}
                style={{
                  ...langButton,
                  ...(lang === code ? activeLang : {}),
                }}
              >
                {code === 'lt' ? '🇱🇹' : code === 'ru' ? '🇷🇺' : '🇬🇧'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* === Контент === */}
      <Auth onAuth={setUser} />
      {tab === 'calendar' && <Calendar />}
      {tab === 'my' && <MyBookings />}
      {tab === 'admin' && <Admin />}

      {/* === Футер === */}
      <footer style={footerStyle}>© IZ HAIR TREND</footer>

      {/* === Панель языков снизу (fade-in/out, только на мобильных) === */}
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
  background: 'rgba(10,10,15,0.75)',
  backdropFilter: 'blur(18px)',
  boxShadow:
    '0 4px 12px rgba(0,0,0,0.45), 0 0 25px rgba(150,85,247,0.12), inset 0 -1px 0 rgba(168,85,247,0.2)',
  borderRadius: '0 0 16px 16px',
  position: 'relative', // ✅ теперь панель двигается
  top: 'auto',
  zIndex: 10,
}

const navButton = {
  borderRadius: '12px',
  padding: '10px 22px',
  fontWeight: 500,
  cursor: 'pointer',
  background: 'rgba(20,15,30,0.6)',
  border: '1px solid rgba(120,80,180,0.3)',
  color: '#fff',
  transition: 'all 0.3s ease',
  boxShadow: '0 0 0 rgba(0,0,0,0)',
}
const activeButton = {
  background: 'linear-gradient(180deg, rgba(130,60,255,0.9), rgba(70,0,120,0.85))',
  border: '1.5px solid rgba(168,85,247,0.8)',
  boxShadow: '0 0 18px rgba(150,85,247,0.35)',
}

const langGroup = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
}

const langButton = {
  borderRadius: '10px',
  width: '44px',
  height: '36px',
  fontWeight: 600,
  border: '1px solid rgba(120,80,180,0.25)',
  background: 'rgba(20,15,30,0.5)',
  color: '#fff',
  cursor: 'pointer',
  transition: 'all 0.3s ease',
}
const activeLang = {
  background: 'linear-gradient(180deg, rgba(130,60,255,0.85), rgba(70,0,120,0.8))',
  border: '1.5px solid rgba(168,85,247,0.9)',
  boxShadow: '0 0 16px rgba(150,85,247,0.4)',
}

/* === Мобильная панель языков === */
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
