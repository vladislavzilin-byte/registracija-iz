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

  // ✅ Определяем мобильное устройство
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // ✅ Плавное появление/исчезновение панели языков при скролле (только моб.)
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

        {/* Языки справа (ПК) */}
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

      {/* Контент */}
      <Auth onAuth={setUser} />
      {tab === 'calendar' && <Calendar />}
      {tab === 'my' && <MyBookings />}
      {tab === 'admin' && <Admin />}

      {/* Футер */}
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
  padding: '14px 28px',
  background: 'rgba(10,10,15,0.75)',
  backdropFilter: 'blur(18px)',
  boxShadow:
    '0 4px 12px rgba(0,0,0,0.45), 0 0 25px rgba(150,85,247,0.12), inset 0 -1px 0 rgba(168,85,247,0.2)',
  borderRadius: '0 0 16px 16px',
  position: 'relative', //
