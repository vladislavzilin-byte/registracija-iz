
import Auth from './components/Auth.jsx'
import Calendar from './components/Calendar.jsx'
import Admin from './components/Admin.jsx'
import MyBookings from './components/MyBookings.jsx'
import { useState } from 'react'
import { getCurrentUser, getLang, setLang } from './lib/storage'
import { useI18n, dict } from './lib/i18n'

export default function App(){
  const { lang, setLang, t } = useI18n()
  const [tab, setTab] = useState('calendar')
  const [user, setUser] = useState(getCurrentUser())

  return (
    <div className="container">
      <div className="sticky">
        <div className="nav">
          <div className="brand"><img src="/logo.svg" alt="logo" /><span>{t('brand')}</span></div>
          <div className="tabs">
            <button className={tab==='calendar'?'':'ghost'} onClick={()=>setTab('calendar')}>{t('nav_calendar')}</button>
            <button className={tab==='my'?'':'ghost'} onClick={()=>setTab('my')}>{t('nav_my')}</button>
            <button className={tab==='admin'?'':'ghost'} onClick={()=>setTab('admin')}>{t('nav_admin')}</button>
            <div className="lang">
              <button className={lang==='lt'?'':'ghost'} onClick={()=>setLang('lt')}>🇱🇹</button>
              <button className={lang==='ru'?'':'ghost'} onClick={()=>setLang('ru')}>🇷🇺</button>
              <button className={lang==='en'?'':'ghost'} onClick={()=>setLang('en')}>🇬🇧</button>
            </div>
          </div>
        </div>
      </div>

      <Auth onAuth={setUser} />

      {tab==='calendar' && <Calendar />}
      {tab==='my' && <MyBookings />}
      {tab==='admin' && <Admin />}

      <footer>
        <img src="/logo.svg" alt="logo" /> © IZ HAIR TREND
      </footer>
    </div>
  )
}
