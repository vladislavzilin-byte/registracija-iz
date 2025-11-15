import Auth from '../components/Auth.jsx'
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

  const isAdmin =
    user?.role === 'admin' ||
    user?.isAdmin === true ||
    user?.email === 'vlados@admin.com' ||
    user?.email === 'vladislavzilin@gmail.com'

  // 📌 Состояние для Kainas
  const [showPriceList, setShowPriceList] = useState(false)

  return (
    <div className="container" style={containerStyle}>
      
      {/* === NAV BAR === */}
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

        {/* LANGUAGES */}
        <div style={langBlock}>
          <button onClick={() => setLang('lt')} style={langButton(lang === 'lt')}>LT</button>
          <button onClick={() => setLang('ru')} style={langButton(lang === 'ru')}>RU</button>
          <button onClick={() => setLang('en')} style={langButton(lang === 'en')}>GB</button>
        </div>
      </div>

      {/* === PROFILE === */}
      <Auth onAuth={setUser} />
      

      {/* ===========================================================
            🔥  НОВЫЙ БЛОК KAINAS — как окно профиля
      ============================================================ */}
      <div
        style={{
          marginTop: '20px',
          background: 'rgba(15, 10, 25, 0.6)',
          borderRadius: '16px',
          border: '1px solid rgba(168,85,247,0.35)',
          boxShadow: '0 0 25px rgba(150,85,247,0.15)',
          padding: '20px',
        }}
      >
        <h2 style={{ margin: 0, marginBottom: '16px', fontSize: '26px' }}>Kainas</h2>

        {/* DROPDOWN */}
        <div
          onClick={() => setShowPriceList(!showPriceList)}
          style={{
            background: 'rgba(20, 15, 35, 0.8)',
            border: '1px solid rgba(150,80,255,0.35)',
            padding: '16px 18px',
            borderRadius: '10px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            userSelect: 'none'
          }}
        >
          <span
            style={{
              color: '#b37bff',
              fontSize: '20px',
              transform: showPriceList ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: '0.25s'
            }}
          >
            ▾
          </span>

          <span style={{ color: 'white', fontSize: '17px' }}>
            Žiūrėti kainas
          </span>
        </div>

        {showPriceList && (
          <div
            style={{
              marginTop: '16px',
              background: 'rgba(20,10,40,0.7)',
              border: '1px solid rgba(160,80,255,0.3)',
              borderRadius: '14px',
              padding: '22px 26px',
              lineHeight: '1.55',
              fontSize: '17px',
              color: 'white',
            }}
          >
            <div style={{ marginBottom: '16px' }}>
              <b>80–130 €</b><br />
              Šukuosenos kaina<br />
              <span style={{ opacity: 0.75 }}>Priklauso nuo darbo apimties</span>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <b>25 €</b><br />
              Konsultacija<br />
              <span style={{ opacity: 0.75 }}>
                Užtrunkame nuo 30 min. iki valandos
              </span>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <b>50 € užstatas</b><br />
              <b>100 €</b><br />
              Plaukų Tresų nuoma<br />
              <span style={{ opacity: 0.75 }}>
                Grąžinti reikia per 3/4 d. Grąžinate plaukus, grąžinu užstatą
              </span>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <b>Iki 20 €</b><br />
              Papuošalų nuoma
            </div>

            <div>
              <b>130 €</b><br />
              Atvykimas Klaipėdoje<br />
              <span style={{ opacity: 0.75 }}>
                Daiktų kraustymai, važinėjimai – per tą laiką galiu priimti kitą klientę.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* === CONTENT === */}
      {tab === 'calendar' && <Calendar />}
      {tab === 'my' && <MyBookings />}
      {tab === 'admin' && isAdmin && <Admin />}

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
}

const navBar = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '14px 28px',
  background: 'rgba(10,10,15,0.75)',
  backdropFilter: 'blur(18px)',
  borderRadius: '0 0 16px 16px',
  position: 'sticky',
  top: 0,
  zIndex: 1000,
}

const leftSide = { display: 'flex', gap: '12px' }

const navButton = (active) => ({
  borderRadius: '12px',
  padding: '10px 22px',
  background: active
    ? 'linear-gradient(180deg, rgba(150,80,255,0.4), rgba(80,0,140,0.3))'
    : 'rgba(25,20,40,0.4)',
  border: active
    ? '1.5px solid rgba(168,85,247,0.85)'
    : '1px solid rgba(140,90,200,0.25)',
  color: '#fff',
  cursor: 'pointer',
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
})

const footerStyle = {
  marginTop: 40,
  textAlign: 'center',
  opacity: 0.4,
  fontSize: '0.9rem',
}
