import { useState } from 'react'
import { getUsers, saveUsers, setCurrentUser, getCurrentUser } from '../lib/storage'
import { useI18n } from '../lib/i18n'
import ForgotPasswordModal from './ForgotPasswordModal'

export default function Auth({ onAuth }) {
  const { t } = useI18n()

  const [mode, setMode] = useState('login')
  const [name, setName] = useState('')
  const [instagram, setInstagram] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [identifier, setIdentifier] = useState('')

  const [recoverOpen, setRecoverOpen] = useState(false)

  const submit = (e) => {
    e.preventDefault()
    const users = getUsers()

    if (mode === 'register') {
      if (!name || !phone || !password) return alert('Заполните все поля')
      if (users.find((u) => u.phone === phone)) return alert('Такой номер уже зарегистрирован')

      const user = { name, instagram, phone, email, password }
      users.push(user)
      saveUsers(users)
      setCurrentUser(user)
      onAuth?.(user)
      return
    }

    const id = identifier.trim()
    const user = users.find(
      (u) => (u.phone === id || u.email === id) && u.password === password
    )

    if (!user) {
      setRecoverOpen(true)
      return alert('Неверный логин или пароль')
    }

    setCurrentUser(user)
    onAuth?.(user)
  }

  const logout = () => {
    setCurrentUser(null)
    onAuth?.(null)
  }

  const current = getCurrentUser()

  // ✅ LOGGED IN — PREMIUM PURPLE AURORA BLOCK (без изменений)
  if (current) {
    const initials = current.name
      ? current.name.split(" ").map(p => p[0]).join("").slice(0,2).toUpperCase()
      : "U"

    return (
      <div
        style={{
          position: 'relative',
          padding: '26px',
          borderRadius: '22px',
          background: 'rgba(15, 6, 26, 0.55)',
          border: '1px solid rgba(168, 85, 247, 0.35)',
          backdropFilter: 'blur(22px)',
          WebkitBackdropFilter: 'blur(22px)',
          boxShadow: '0 12px 45px rgba(0,0,0,0.45)',
          overflow: 'hidden',
          marginBottom: '30px',
          fontFamily: 'Poppins, Inter, sans-serif'
        }}
      >
        {/* Aurora */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            zIndex: 0,
            background:
              'radial-gradient(900px 500px at -10% 120%, rgba(168,85,247,0.18), transparent 65%),' +
              'radial-gradient(700px 400px at 110% -20%, rgba(139,92,246,0.16), transparent 60%),' +
              'radial-gradient(800px 450px at 50% 120%, rgba(99,102,241,0.12), transparent 65%)',
            animation: 'auroraShift 12s ease-in-out infinite alternate'
          }}
        />

        {/* Border glow */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '22px',
            padding: '1.5px',
            background: 'linear-gradient(120deg, rgba(168,85,247,0.55), rgba(139,92,246,0.35), rgba(99,102,241,0.45))',
            WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
            WebkitMaskComposite: 'xor',
            opacity: 0.7
          }}
        />

        {/* Content */}
        <div style={{ position:'relative', zIndex:1, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          {/* LEFT */}
          <div style={{ display:'flex', gap:16, alignItems:'center' }}>
            {/* Initials badge */}
            <div
              style={{
                minWidth: 44,
                height: 44,
                borderRadius: 12,
                background: 'rgba(168,85,247,0.18)',
                border: '1px solid rgba(168,85,247,0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontWeight: 700,
                fontSize: '1.1rem',
                animation: 'avatarPulse 3.6s ease-in-out infinite'
              }}
            >
              {initials}
            </div>

            {/* User data */}
            <div>
              <div
                style={{
                  fontSize: '1.35rem',
                  fontWeight: 700,
                  marginBottom: 3,
                  background: 'linear-gradient(90deg, rgba(236,223,255,1), rgba(198,173,255,0.85))',
                  WebkitBackgroundClip: 'text',
                  color: 'transparent'
                }}
              >
                {current.name}
              </div>

              {/* Phone */}
              <div style={{ opacity:0.9, display:'flex', alignItems:'center', gap:6 }}>
                📞 <span>{current.phone}</span>
              </div>

              {/* Instagram */}
              {current.instagram && (
                <div style={{ opacity:0.85, display:'flex', alignItems:'center', gap:6 }}>
                  📸 <span>{current.instagram}</span>
                </div>
              )}

              {/* Email */}
              {current.email && (
                <div style={{ opacity:0.85, display:'flex', alignItems:'center', gap:6 }}>
                  ✉️ <span>{current.email}</span>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT — LOGOUT */}
          <button
            onClick={logout}
            style={{
              padding: '6px 14px',
              fontSize: '0.85rem',
              borderRadius: '10px',
              border: '1px solid rgba(168,85,247,0.5)',
              background: 'rgba(168,85,247,0.12)',
              color: '#fff',
              cursor: 'pointer',
              transition: '0.25s',
              whiteSpace: 'nowrap',
              backdropFilter: 'blur(6px)',
              width: '65%',
              textAlign: 'center',
            }}
          >
            {t('logout')}
          </button>
        </div>
      </div>
    )
  }

  // ✅ LOGIN + REGISTER — переработан под Aurora/Glass
  return (
    <>
      {/* локальные стили только для этой формы */}
      <style>{`
        .segmented {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          padding: 6px;
          border-radius: 16px;
          background: linear-gradient(145deg, rgba(66,0,145,0.28), rgba(20,0,40,0.35));
          border: 1px solid rgba(168,85,247,0.35);
          backdrop-filter: blur(8px);
        }
        .segmented button {
          height: 42px;
          border-radius: 12px;
          border: 1px solid rgba(168,85,247,0.35);
          color: #fff;
          background: rgba(31,0,63,0.45);
          transition: .2s;
        }
        .segmented button.active {
          background: linear-gradient(180deg, rgba(124,58,237,0.55), rgba(88,28,135,0.5));
          box-shadow: inset 0 0 0 1px rgba(168,85,247,0.45), 0 10px 28px rgba(120,0,255,0.18);
        }

        .glass-input {
          width: 100%;
          height: 42px;
          border-radius: 12px;
          padding: 10px 12px;
          color: #fff;
          border: 1px solid rgba(168,85,247,0.35);
          background: rgba(17,0,40,0.45);
          outline: none;
          transition: .2s;
        }
        .glass-input:focus {
          border-color: rgba(168,85,247,0.65);
          box-shadow: 0 0 0 3px rgba(168,85,247,0.18);
          background: rgba(24,0,60,0.55);
        }

        .cta {
          height: 42px;
          border-radius: 12px;
          border: 1px solid rgba(168,85,247,0.55);
          color: #fff;
          background: linear-gradient(180deg, rgba(124,58,237,0.6), rgba(88,28,135,0.55));
          backdrop-filter: blur(6px);
          transition: .2s;
        }
        .cta:hover { transform: translateY(-1px); box-shadow: 0 10px 24px rgba(120,0,255,0.22); }
      `}</style>

      <div className="card" style={{ paddingTop: 18 }}>
        {/* Табы */}
        <div className="segmented" style={{ marginBottom: 14 }}>
          <button
            type="button"
            className={mode === 'login' ? 'active' : ''}
            onClick={() => setMode('login')}
          >
            {t('login')}
          </button>
          <button
            type="button"
            className={mode === 'register' ? 'active' : ''}
            onClick={() => setMode('register')}
          >
            {t('register')}
          </button>
        </div>

        {/* Форма */}
        <form onSubmit={submit} className="row" style={{ rowGap: 12 }}>
          {mode === 'register' && (
            <>
              <div className="col">
                <label>{t('name')}</label>
                <input className="glass-input" value={name} onChange={(e)=>setName(e.target.value)} placeholder="Inga" />
              </div>

              <div className="col">
                <label>{t('instagram')}</label>
                <input className="glass-input" value={instagram} onChange={(e)=>setInstagram(e.target.value)} placeholder="@username" />
              </div>

              <div className="col">
                <label>{t('email_opt')}</label>
                <input className="glass-input" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="name@example.com" />
              </div>

              <div className="col">
                <label>{t('phone')}</label>
                <input className="glass-input" value={phone} onChange={(e)=>setPhone(e.target.value)} placeholder="+3706..." />
              </div>
            </>
          )}

          {mode === 'login' && (
            <div className="col">
              <label>{t('phone_or_email')}</label>
              <input className="glass-input" value={identifier} onChange={(e)=>setIdentifier(e.target.value)} placeholder="+3706... / email" />
            </div>
          )}

          <div className="col">
            <label>{t('password')}</label>
            <input className="glass-input" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="••••••••" />
          </div>

          <div className="col" style={{ alignSelf:'end' }}>
            <button type="submit" className="cta">
              {mode === 'login' ? t('login') : t('register')}
            </button>
          </div>
        </form>
      </div>

      <ForgotPasswordModal open={recoverOpen} onClose={()=>setRecoverOpen(false)} />
    </>
  )
}