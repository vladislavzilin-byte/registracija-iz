// Auth.jsx — улучшенная клиентская версия (не заменяет сервер)
import { useState, useEffect } from 'react'
import {
  getUsers,
  saveUsers,
  setCurrentUser,
  getCurrentUser
} from '../lib/storage'
import { useI18n } from '../lib/i18n'
import ForgotPasswordModal from './ForgotPasswordModal'

// Утилита: простое SHA-256 хеширование строки (более безопасно, чем plain text,
// но НЕ заменяет серверное хеширование (bcrypt/argon2)).
async function sha256hex(message) {
  const enc = new TextEncoder()
  const msgUint8 = enc.encode(message)
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

function normalizePhone(p = '') {
  return (p || '').replace(/\D+/g, '') // оставить только цифры
}

function validateEmail(email = '') {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export default function Auth({ onAuth }) {
  const { t } = useI18n()

  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [name, setName] = useState('')
  const [instagram, setInstagram] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [identifier, setIdentifier] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const [recoverOpen, setRecoverOpen] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [current, setCurrent] = useState(null)

  useEffect(() => {
    const cur = getCurrentUser()
    setCurrent(cur)
  }, [])

  // валидация формы (простая)
  function validateForm() {
    const errs = {}
    if (mode === 'register') {
      if (!name.trim()) errs.name = t('required')
      const ph = normalizePhone(phone)
      if (!ph) errs.phone = t('required')
      if (email && !validateEmail(email)) errs.email = t('invalid_email')
      if (!password || password.length < 6) errs.password = t('password_min')
      if (password !== passwordConfirm) errs.passwordConfirm = t('password_mismatch')
    } else {
      if (!identifier.trim()) errs.identifier = t('required')
      if (!password) errs.password = t('required')
    }
    return errs
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setFieldErrors({})
    const errs = validateForm()
    if (Object.keys(errs).length) {
      setFieldErrors(errs)
      return
    }

    setIsSubmitting(true)
    try {
      const users = getUsers()

      if (mode === 'register') {
        const ph = normalizePhone(phone)

        // проверка дубликатов по телефону или email
        if (users.find(u => normalizePhone(u.phone) === ph)) {
          setFieldErrors({ phone: t('phone_taken') || 'Этот номер уже зарегистрирован' })
          setIsSubmitting(false)
          return
        }
        if (email && users.find(u => u.email && u.email.toLowerCase() === email.toLowerCase())) {
          setFieldErrors({ email: t('email_taken') || 'Этот email уже зарегистрирован' })
          setIsSubmitting(false)
          return
        }

        // хешируем пароль перед сохранением
        const passwordHash = await sha256hex(password)

        const user = {
          name: name.trim(),
          instagram: instagram.trim(),
          phone: ph,
          email: email ? email.trim().toLowerCase() : '',
          passwordHash,
          createdAt: new Date().toISOString()
        }

        users.push(user)
        saveUsers(users)

        // В реальном мире — здесь нужно получать JWT / session от сервера.
        setCurrentUser(user)
        setCurrent(user)
        onAuth?.(user)
        // сбрасываем поля
        setPassword('')
        setPasswordConfirm('')
        return
      }

      // LOGIN
      const id = identifier.trim()
      const normalizedIdPhone = normalizePhone(id)
      // попытка найти пользователя по телефону (числа) или email
      let user = null

      // хеш пароля
      const passwordHash = await sha256hex(password)

      user = users.find(u => (
        (u.phone && normalizePhone(u.phone) === normalizedIdPhone) ||
        (u.email && u.email.toLowerCase() === id.toLowerCase())
      ) && u.passwordHash === passwordHash)

      if (!user) {
        // не показываем подробности — просто мягкая ошибка
        setError(t('invalid_credentials') || 'Неверный логин или пароль')
        // не открываем модалку восстановления автоматически — даём пользователю выбор
        setIsSubmitting(false)
        return
      }

      setCurrentUser(user)
      setCurrent(user)
      onAuth?.(user)
    } catch (err) {
      console.error(err)
      setError(t('unexpected_error') || 'Произошла ошибка')
    } finally {
      setIsSubmitting(false)
    }
  }

  const logout = () => {
    setCurrentUser(null)
    setCurrent(null)
    onAuth?.(null)
  }

  // UI — если уже залогинен
  if (current) {
    const initials = current.name
      ? current.name.split(" ").map(p => p[0]).join("").slice(0,2).toUpperCase()
      : "U"

    return (
      <div style={{ position: 'relative', padding: 24, borderRadius: 16, background: 'rgba(15,6,26,0.55)', color:'#fff' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
          <div style={{ display:'flex', gap:12, alignItems:'center' }}>
            <div style={{ width:44, height:44, borderRadius:10, background:'rgba(168,85,247,0.18)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700 }}>
              {initials}
            </div>
            <div>
              <div style={{ fontWeight:700 }}>{current.name}</div>
              <div style={{ opacity:0.9 }}>{current.phone}{current.email ? ` · ${current.email}` : ''}</div>
            </div>
          </div>
          <button onClick={logout} style={{ padding:'8px 12px', borderRadius:10 }}>{t('logout')}</button>
        </div>
      </div>
    )
  }

  // форма логина/регистрации
  return (
    <>
      <style>{`
        .segmented { display:grid; grid-template-columns:1fr 1fr; gap:8px; padding:6px; border-radius:12px; }
        .segmented button { height:40px; border-radius:10px; }
        .glass-input { width:100%; height:40px; border-radius:10px; padding:8px 10px; }
        .error { color:#ffb3b3; font-size:0.9rem; margin-top:6px; }
        .muted { opacity:0.9; font-size:0.9rem; }
      `}</style>

      <div className="card" style={{ paddingTop: 12 }}>
        <div className="segmented" style={{ marginBottom: 12 }}>
          <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => { setMode('login'); setFieldErrors({}); setError('') }}>
            {t('login')}
          </button>
          <button type="button" className={mode === 'register' ? 'active' : ''} onClick={() => { setMode('register'); setFieldErrors({}); setError('') }}>
            {t('register')}
          </button>
        </div>

        <form onSubmit={submit} className="row" style={{ rowGap: 12 }}>
          {mode === 'register' && (
            <>
              <div className="col">
                <label>{t('name')}</label>
                <input className="glass-input" value={name} onChange={(e)=>setName(e.target.value)} placeholder="Inga" />
                {fieldErrors.name && <div className="error">{fieldErrors.name}</div>}
              </div>

              <div className="col">
                <label>{t('instagram')}</label>
                <input className="glass-input" value={instagram} onChange={(e)=>setInstagram(e.target.value)} placeholder="@username" />
              </div>

              <div className="col">
                <label>{t('email_opt')}</label>
                <input className="glass-input" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="name@example.com" />
                {fieldErrors.email && <div className="error">{fieldErrors.email}</div>}
              </div>

              <div className="col">
                <label>{t('phone')}</label>
                <input className="glass-input" value={phone} onChange={(e)=>setPhone(e.target.value)} placeholder="+3706..." />
                {fieldErrors.phone && <div className="error">{fieldErrors.phone}</div>}
              </div>
            </>
          )}

          {mode === 'login' && (
            <div className="col">
              <label>{t('phone_or_email')}</label>
              <input className="glass-input" value={identifier} onChange={(e)=>setIdentifier(e.target.value)} placeholder="+3706... / email" />
              {fieldErrors.identifier && <div className="error">{fieldErrors.identifier}</div>}
            </div>
          )}

          <div className="col" style={{ position:'relative' }}>
            <label>{t('password')}</label>
            <div style={{ display:'flex', gap:8 }}>
              <input
                className="glass-input"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e)=>setPassword(e.target.value)}
                placeholder="••••••••"
              />
              <button type="button" onClick={() => setShowPassword(s => !s)} style={{ alignSelf:'center' }}>
                {showPassword ? t('hide') : t('show')}
              </button>
            </div>
            {fieldErrors.password && <div className="error">{fieldErrors.password}</div>}
          </div>

          {mode === 'register' && (
            <div className="col">
              <label>{t('confirm_password')}</label>
              <input className="glass-input" type={showPassword ? 'text' : 'password'} value={passwordConfirm} onChange={(e)=>setPasswordConfirm(e.target.value)} placeholder="••••••••" />
              {fieldErrors.passwordConfirm && <div className="error">{fieldErrors.passwordConfirm}</div>}
            </div>
          )}

          {error && <div className="error">{error}</div>}

          <div className="col" style={{ alignSelf:'end' }}>
            <button type="submit" className="cta" disabled={isSubmitting} style={{ opacity: isSubmitting ? 0.7 : 1 }}>
              {isSubmitting ? t('loading') || '...' : (mode === 'login' ? t('login') : t('register'))}
            </button>
          </div>
        </form>

        <div style={{ marginTop: 8, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div className="muted">{t('or')}</div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={() => setRecoverOpen(true)} style={{ fontSize: '0.85rem' }}>{t('forgot_password')}</button>
            {/* Здесь можно добавить OAuth / social login кнопки */}
          </div>
        </div>
      </div>

      <ForgotPasswordModal open={recoverOpen} onClose={()=>setRecoverOpen(false)} />
    </>
  )
}
