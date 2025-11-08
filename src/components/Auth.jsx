import { useState, useEffect } from "react";
import {
  getUsers,
  saveUsers,
  setCurrentUser,
  getCurrentUser,
} from "../lib/storage";
import ForgotPasswordModal from "./ForgotPasswordModal";
import { useI18n } from "../lib/i18n";

// === вспомогательные ===
async function sha256(message) {
  const msgUint8 = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
const normalizePhone = (p) => (p || "").replace(/\D/g, "");
const validateEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

export default function Auth({ onAuth }) {
  const { t } = useI18n();

  const [mode, setMode] = useState("login");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [name, setName] = useState("");
  const [instagram, setInstagram] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [recoverOpen, setRecoverOpen] = useState(false);
  const [current, setCurrent] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [toast, setToast] = useState("");

  const [loginAttempts, setLoginAttempts] = useState(0);
  const [lockUntil, setLockUntil] = useState(null);

  useEffect(() => {
    const user = getCurrentUser();
    setCurrent(user);
  }, []);

  // === Toast ===
  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2200);
  };

  // === Проверка формы ===
  const validateForm = () => {
    const errs = {};
    if (mode === "register") {
      if (!name.trim()) errs.name = "Введите имя";
      if (!phone.trim()) errs.phone = "Введите телефон";
      if (email && !validateEmail(email)) errs.email = "Неверный email";
      if (password.length < 6) errs.password = "Минимум 6 символов";
      if (password !== passwordConfirm) errs.passwordConfirm = "Пароли не совпадают";
    } else {
      if (!identifier.trim()) errs.identifier = "Введите email или телефон";
      if (!password) errs.password = "Введите пароль";
    }
    return errs;
  };

  // === Сабмит ===
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const errs = validateForm();
    if (Object.keys(errs).length) {
      setError(Object.values(errs)[0]);
      return;
    }

    if (lockUntil && Date.now() < lockUntil) {
      setError("Слишком много попыток, попробуйте позже");
      return;
    }

    let users = getUsers();
    if (!Array.isArray(users)) users = [];

    // === Регистрация ===
    if (mode === "register") {
      const phoneNorm = normalizePhone(phone);
      const existing = users.find(
        (u) =>
          normalizePhone(u.phone) === phoneNorm ||
          (u.email && u.email.toLowerCase() === email.toLowerCase())
      );
      if (existing) {
        setError("Пользователь с таким email или телефоном уже существует");
        return;
      }

      const passwordHash = await sha256(password);
      const newUser = {
        name: name.trim(),
        instagram,
        phone: phoneNorm,
        email: email.trim().toLowerCase(),
        passwordHash,
      };

      users.push(newUser);
      saveUsers(users);
      setCurrentUser(newUser);
      setCurrent(newUser);
      showToast("Аккаунт успешно создан!");
      onAuth?.(newUser);
      return;
    }

    // === Вход ===
    const id = identifier.trim();
    const phoneNorm = normalizePhone(id);
    const emailNorm = id.toLowerCase();
    const passwordHash = await sha256(password);

    const found = users.find((u) => {
      const phoneMatch = normalizePhone(u.phone) === phoneNorm && !!phoneNorm;
      const emailMatch = u.email && u.email.toLowerCase() === emailNorm;
      const hashMatch =
        (u.passwordHash && u.passwordHash === passwordHash) ||
        (!u.passwordHash && u.password === password);
      return (phoneMatch || emailMatch) && hashMatch;
    });

    if (!found) {
      const newAttempts = loginAttempts + 1;
      setLoginAttempts(newAttempts);
      if (newAttempts >= 5) {
        setLockUntil(Date.now() + 60_000);
        setLoginAttempts(0);
        setError("Превышено число попыток. Повторите через 1 минуту.");
      } else {
        setError("Неверный логин или пароль");
      }
      return;
    }

    setLoginAttempts(0);
    setCurrentUser(found);
    setCurrent(found);
    onAuth?.(found);
  };

  const logout = () => {
    setCurrentUser(null);
    setCurrent(null);
    onAuth?.(null);
  };

  // === Авторизованный ===
  if (current) {
    const initials = current.name
      ? current.name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase()
      : "U";

    return (
      <>
        {toast && <div style={toastStyle}>{toast}</div>}
        <style>{fadeAnim}</style>
        <div style={cardStyle}>
          <div style={auroraBg} />
          <div style={borderGlow} />
          <div
            style={{
              position: "relative",
              zIndex: 2,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={avatarStyle}>{initials}</div>
              <div>
                <div style={nameStyle}>{current.name}</div>
                <div style={contactStyle}>{current.phone}</div>
                {current.email && <div style={contactStyle}>{current.email}</div>}
                {current.instagram && <div style={contactStyle}>{current.instagram}</div>}
              </div>
            </div>

            <button onClick={logout} style={logoutButton}>
              {t("logout") || "Выйти"}
            </button>
          </div>
        </div>
      </>
    );
  }

  // === Не авторизован ===
  return (
    <>
      {toast && <div style={toastStyle}>{toast}</div>}
      <style>{fadeAnim}</style>
      <style>{segmentStyles}</style>

      <div className="card" style={{ paddingTop: 18 }}>
        <div className="segmented" style={{ marginBottom: 14 }}>
          <button
            type="button"
            className={mode === "login" ? "active" : ""}
            onClick={() => setMode("login")}
          >
            Вход
          </button>
          <button
            type="button"
            className={mode === "register" ? "active" : ""}
            onClick={() => setMode("register")}
          >
            Регистрация
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {mode === "login" ? (
            <>
              <input
                className="glass-input"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Телефон или Email"
              />
              <div style={{ position: "relative" }}>
                <input
                  className="glass-input"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Пароль"
                />
                <span
                  onClick={() => setShowPassword((s) => !s)}
                  style={{
                    position: "absolute",
                    right: 12,
                    top: 10,
                    cursor: "pointer",
                    opacity: 0.75,
                  }}
                >
                  {showPassword ? (
                    <svg width="20" height="20" fill="none" stroke="#c7a3ff" strokeWidth="1.8" viewBox="0 0 24 24">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  ) : (
                    <svg width="20" height="20" fill="none" stroke="#c7a3ff" strokeWidth="1.8" viewBox="0 0 24 24">
                      <path d="M17.94 17.94A10.94 10.94 0 0112 20c-7 0-11-8-11-8a21.36 21.36 0 015.1-6.36M9.88 9.88A3 3 0 0012 15a3 3 0 002.12-.88M1 1l22 22" />
                    </svg>
                  )}
                </span>
              </div>

              <div
                onClick={() => setRecoverOpen(true)}
                style={{
                  textAlign: "right",
                  color: "#b58fff",
                  fontSize: "0.9rem",
                  cursor: "pointer",
                  marginTop: "-6px",
                }}
              >
                Забыли пароль?
              </div>
            </>
          ) : (
            <>
              <input className="glass-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Имя" />
              <input className="glass-input" value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="@instagram" />
              <input className="glass-input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
              <input className="glass-input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+3706..." />
              <input
                className="glass-input"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Пароль"
              />
              <input
                className="glass-input"
                type={showPassword ? "text" : "password"}
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                placeholder="Подтвердите пароль"
              />
            </>
          )}

          {error && <div style={{ color: "#ff88aa", textAlign: "center" }}>{error}</div>}

          <button type="submit" className="cta">
            {mode === "login" ? "Войти" : "Регистрация"}
          </button>
        </form>
      </div>

      <ForgotPasswordModal open={recoverOpen} onClose={() => setRecoverOpen(false)} />
    </>
  );
}

// === стили ===
const fadeAnim = `
@keyframes fadeInOut {
  0% { opacity: 0; transform: translateY(-10px); }
  15% { opacity: 1; transform: translateY(0); }
  85% { opacity: 1; transform: translateY(0); }
  100% { opacity: 0; transform: translateY(-10px); }
}`;
