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
    <div className="container" style={{ position: 'relative', minHeight: '100vh' }}>
      {/* === Верхняя панель (НЕ фиксированная) === */}
      <div
        style={{
          ...navBar,
          flexWrap: isMobile ? 'wrap' : 'nowrap',
          justifyContent: isMobile ? 'center' : 'space-between',
          padding: isMobile ? '10px 12px' : '14px 28px',
          borderRadius: isMobile ? '0 0 10px 10px' : '0 0 16px 16px',
          position: 'relative',
        }}
      >
        {/* Навигация */}
        <div
          style={{
            ...navGroup,
            flexWrap: isMobile ? 'wrap' : 'nowrap',
            justifyContent: isMobile ? 'center' : 'flex-start',
            gap: isMobile ? '8px' : '12px',
          }}
        >
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
                flex: isMobile ? '1 1 100px' : '0',
                minWidth: isMobile ? '90px' : '130px',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Языки справа (ПК) */}
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
      <footer style={footerStyle}>
        <img src="/logo.svg" alt="logo" style={{ height: 20, opacity: 0.7, marginRight: 6 }} />
        © IZ HAIR TREND
      </footer>

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

/* === Стили === */
const navBar = {
  display: 'flex',
  alignItems: 'center',
  background: 'rgba(8,6,15,0.8)',
  backdropFilter: 'blur(18px)',
  boxShadow: `
    0 3px 16px rgba(0,0,0,0.55),
    0 0 40px rgba(110,50,200,0.18),
    inset 0 -1px 0 rgba(150,85,247,0.12)
  `,
  zIndex: 100,
  animation: 'fadeIn 0.6s ease-in-out',
}

const navGroup = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
}
const langGroup = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
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
  position: 'relative', // ✅ вместо sticky
  zIndex: 10,           // ✅ чуть меньше, чтобы не перекрывала модальные окна
}
const activeButton = {
  border: '1px solid rgba(180,95,255,0.8)',
  background: 'linear-gradient(180deg, rgba(80,30,130,0.9), rgba(40,15,70,0.9))',
  boxShadow: '0 0 25px rgba(180,95,255,0.6), 0 0 10px rgba(180,95,255,0.3) inset',
}

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
  opacity: 0.45,
  fontSize: '0.9rem',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
}

/* Анимация */
const style = document.createElement('style')
style.innerHTML = `
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
}
`
document.head.appendChild(style)
