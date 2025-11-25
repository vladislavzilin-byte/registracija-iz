// src/App.jsx
import Auth from './components/Auth.jsx'
import Calendar from './components/Calendar.jsx'
import Admin from './components/Admin.jsx'
import MyBookings from './components/MyBookings.jsx'
import { useState, useEffect } from 'react'
import { getCurrentUser } from './lib/storage'
import { useI18n } from './lib/i18n'
import { LangProvider, useLang } from './lib/LangContext'

// Механизм скрытия языкового меню на мобилке
const useMobileLangHide = () => {
  const [hidden, setHidden] = useState(false)
  useEffect(() => {
    let last = window.scrollY
    const onScroll = () => {
      if (window.innerWidth > 768) {
        setHidden(false)
        return
      }
      if (window.scrollY > last + 12) setHidden(true)
      if (window.scrollY < last - 12) setHidden(false)
      last = window.scrollY
    }
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return hidden
}

// Внутренняя часть приложения — тут всё состояние
function AppContent() {
  const { lang, setLang } = useLang()        // ← из контекста
  const { t } = useI18n()                    // ← t и lang теперь везде синхронны
  const [tab, setTab] = useState('calendar')
  const [user, setUser] = useState(getCurrentUser())
  const hiddenLang = useMobileLangHide()
  const [kPress, setKPress] = useState(false)

  const isAdmin =
    user?.role === 'admin' ||
    user?.isAdmin === true ||
    user?.email === 'vlados@admin.com' ||
    user?.email === 'vladislavzilin@gmail.com'

  // Делаем setLang доступным для мобильных кнопок
  useEffect(() => {
    window.setLang = setLang
  }, [setLang])

  // Универсальная подсветка всех языковых кнопок (и десктоп, и мобилка)
  useEffect(() => {
    document.querySelectorAll('[data-lang]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.lang === lang)
    })
  }, [lang])

  return (
    <div className="container" style={containerStyle}>
      {/* === Верхняя панель === */}
      <div style={navBar}>
        <div style={leftSide}>
          <button onClick={() => setTab('calendar')} style={navButton(tab === 'calendar')}>
            {t('nav_calendar')}
          </button>

          <button onClick={() => setTab('my')} style={navButton(tab === 'my')}>
            {t('nav_my')}
          </button>

          <button
            style={{
              ...navButton(false),
              transform: kPress ? 'translateY(6px)' : 'translateY(0)',
              transition: 'transform .25s ease',
            }}
            onClick={() => {
              setKPress(true)
              setTimeout(() => setKPress(false), 260)
              setTab('calendar')
              setTimeout(() => {
                const section = document.getElementById('kainas-section')
                section?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }, 150)
              window.dispatchEvent(new CustomEvent('togglePrices'))
            }}
          >
            Kainas
          </button>

          {isAdmin && (
            <button
              onClick={() => setTab('admin')}
              style={{ ...navButton(tab === 'admin'), animation: 'fadeInUp 0.4s ease-out' }}
            >
              {t('nav_admin')}
            </button>
          )}
        </div>

        {/* === ЯЗЫКИ ДЛЯ ПК === */}
        <div
          className={`lang-switcher-top ${hiddenLang ? 'hidden-mobile' : ''}`}
          style={{ display: 'flex', gap: '8px' }}
        >
          <button data-lang="lt" onClick={() => setLang('lt')} className="lang-btn">LT</button>
          <button data-lang="ru" onClick={() => setLang('ru')} className="lang-btn">RU</button>
          <button data-lang="en" onClick={() => setLang('en')} className="lang-btn">GB</button>
        </div>
      </div>

      {/* === Контент === */}
      <Auth onAuth={setUser} />
      {tab === 'calendar' && <Calendar />}
      {tab === 'my' && <MyBookings />}
      {tab === 'admin' && isAdmin && <Admin />}

      <footer style={footerStyle}>© IZ HAIR TREND</footer>
    </div>
  )
}

// Главный компонент — оборачиваем в провайдер
export default function App() {
  return (
    <LangProvider>
      <AppContent />
    </LangProvider>
  )
}

/* ============================================================
   СТИЛИ
   ============================================================ */
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
  border: active ? '1.5px solid rgba(168,85,247,0.85)' : '1px solid rgba(140,90,200,0.25)',
  color: '#fff',
  transition: 'all 0.25s ease',
  boxShadow: active
    ? '0 0 12px rgba(168,85,247,0.6), inset 0 0 8px rgba(168,85,247,0.25)'
    : '0 0 6px rgba(0,0,0,0.2)',
  textShadow: active ? '0 0 6px rgba(168,85,247,0.6)' : 'none',
  backdropFilter: 'blur(8px)',
  transform: active ? 'translateY(-1px)' : 'translateY(0)',
})

const footerStyle = {
  marginTop: 40,
  textAlign: 'center',
  opacity: 0.4,
  fontSize: '0.9rem',
}

/* ============================================================
   CSS + МОБИЛЬНОЕ МЕНЮ ЯЗЫКОВ
   ============================================================ */
const css = document.createElement('style')
css.innerHTML = `
.lang-group {
  display: flex;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 16px;
  background: rgba(20, 10, 45, 0.7);
  border: 1.5px solid rgba(180, 120, 255, 0.55);
  box-shadow: 0 0 18px rgba(160, 80, 240, 0.35);
  backdrop-filter: blur(10px);
}
.lang-btn {
  border-radius: 10px;
  padding: 4px 8px;
  min-width: 42px;
  font-size: 12px;
  font-weight: 600;
  background: linear-gradient(180deg, rgba(160,70,255,0.9), rgba(80,0,160,0.9));
  border: 1.5px solid rgba(210,160,255,0.7);
  color: #fff;
  cursor: pointer;
  transition: all 0.25s ease;
}
.lang-btn.active {
  background: linear-gradient(180deg, rgba(200,120,255,1), rgba(120,20,220,1));
  border: 2px solid rgba(255,230,255,0.9);
  box-shadow: 0 0 16px rgba(200,120,255,0.9);
}
@media (min-width: 768px) {
  .lang-switcher-top { display:flex !important; }
  .lang-switcher-bottom { display:none !important; }
  .lang-btn {
    background: rgba(25,20,40,0.4);
    border: 1px solid rgba(140,90,200,0.25);
    box-shadow: 0 0 6px rgba(0,0,0,0.2);
  }
  .lang-btn.active {
    background: linear-gradient(180deg, rgba(150,80,255,0.4), rgba(80,0,140,0.3));
    border: 1.5px solid rgba(168,85,247,0.85);
    box-shadow: 0 0 12px rgba(168,85,247,0.6), inset 0 0 8px rgba(168,85,247,0.25);
    text-shadow: 0 0 6px rgba(168,85,247,0.6);
  }
}
@media (max-width: 768px) {
  .lang-switcher-top { display:none !important; }
}
.lang-switcher-bottom {
  position: fixed;
  bottom: 12px;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  z-index: 9999;
  transition: transform 0.35s ease, opacity 0.35s ease;
  pointer-events: none;
}
.lang-switcher-bottom > .lang-group { pointer-events: all; }
.lang-switcher-bottom.hidden-mobile {
  transform: translateY(150%);
  opacity: 0;
}
`
document.head.appendChild(css)

// Мобильное меню языков (с data-lang для подсветки)
const bottomLang = document.createElement('div')
bottomLang.className = 'lang-switcher-bottom'
bottomLang.innerHTML = `
  <div class="lang-group">
    <button class="lang-btn lang-bottom-lt" data-lang="lt">LT</button>
    <button class="lang-btn lang-bottom-ru" data-lang="ru">RU</button>
    <button class="lang-btn lang-bottom-en" data-lang="en">GB</button>
  </div>
`
document.body.appendChild(bottomLang)

// Клик по мобильным кнопкам
document.querySelector('.lang-bottom-lt')?.addEventListener('click', () => window.setLang?.('lt'))
document.querySelector('.lang-bottom-ru')?.addEventListener('click', () => window.setLang?.('ru'))
document.querySelector('.lang-bottom-en')?.addEventListener('click', () => window.setLang?.('en'))

// Скрытие при скролле
window.addEventListener('scroll', () => {
  if (window.innerWidth > 768) return
  if (window.scrollY > 40) bottomLang.classList.add('hidden-mobile')
  else bottomLang.classList.remove('hidden-mobile')
})
