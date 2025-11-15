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

  // 🟣 Проверка, является ли пользователь администратором
  const isAdmin =
    user?.role === 'admin' ||
    user?.isAdmin === true ||
    user?.email === 'vlados@admin.com' ||
    user?.email === 'vladislavzilin@gmail.com'

  return (
    <div className="container" style={containerStyle}>
      
      {/* === Верхняя панель === */}
      <div style={navBar}>
        <div style={leftSide}>
          <button
            onClick={() => setTab('calendar')}
            style={navButton(tab === 'calendar')}
          >
            {t('nav_calendar')}
          </button>

          <button
            onClick={() => setTab('my')}
            style={navButton(tab === 'my')}
          >
            {t('nav_my')}
          </button>

          {/* === Новая кнопка: KAINAS === */}
          <button
            onClick={() => setTab('prices')}
            style={navButton(tab === 'prices')}
          >
            Kainas
          </button>

          {/* === Кнопка Админ (только для админа) === */}
          {isAdmin && (
            <button
              onClick={() => setTab('admin')}
              style={{
                ...navButton(tab === 'admin'),
                animation: 'fadeInUp 0.4s ease-out',
              }}
            >
              {t('nav_admin')}
            </button>
          )}
        </div>

        {/* === Языки === */}
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
      </div>

      {/* === Контент === */}
      <Auth onAuth={setUser} />

      {tab === 'calendar' && <Calendar />}
      {tab === 'my' && <MyBookings />}
      {tab === 'admin' && isAdmin && <Admin />}

      {/* === Новый раздел KAINAS === */}
      {tab === 'prices' && <Calendar showPrices={true} />}

      {/* === Футер === */}
      <footer style={footerStyle}>© IZ HAIR TREND</footer>
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
  position: 'sticky',
  top: 0,
  zIndex: 1000,
}

const leftSide = { display: 'flex', gap: '12px' }

const navButton = (active) => ({
  borderRadius: '12px',
  padding: '10px 22px',
  fontWeight: 500,
  cursor: 'pointer',
  background: active
    ? 'linear-gradient(180deg, rgba(150,80,255,0.4), rgba(80,0,140,0.3))'
    : 'rgba(25,20,40,0.4)',
  border: active
    ? '1.5px solid rgba(168,85,247,0.85)'
    : '1px solid rgba(140,90,200,0.25)',
  color: '#fff',
  transition: 'all 0.25s ease',
  boxShadow: active
    ? '0 0 12px rgba(168,85,247,0.6), inset 0 0 8px rgba(168,85,247,0.25)'
    : '0 0 6px rgba(0,0,0,0.2)',
  textShadow: active ? '0 0 6px rgba(168,85,247,0.6)' : 'none',
  backdropFilter: 'blur(8px)',
  transform: active ? 'translateY(-1px)' : 'translateY(0)',
})

const langBlock = { display: 'flex', gap: '8px' }

const langButton = (active) => ({
  borderRadius: '10px',
  width: '44px',
  height: '36px',
  fontWeight: 600,
  border: active
    ? '1.5px solid rgba(168,85,247,0.9)'
    : '1px solid rgba(120,80,180,0.25)',
  background: active
    ? 'linear-gradient(180deg, rgba(130,60,255,0.9), rgba(70,0,120,0.85))'
    : 'rgba(20,15,30,0.45)',
  color: '#fff',
  cursor: 'pointer',
  boxShadow: active ? '0 0 12px rgba(150,85,247,0.4)' : 'none',
  transition: 'all 0.25s ease',
})

const footerStyle = {
  marginTop: 40,
  textAlign: 'center',
  opacity: 0.4,
  fontSize: '0.9rem',
}

/* === Анимация === */
const style = document.createElement('style')
style.innerHTML = `
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
`
document.head.appendChild(style)
