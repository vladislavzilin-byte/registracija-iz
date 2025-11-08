import { useState, useEffect } from "react";
import {
  getUsers,
  saveUsers,
  setCurrentUser,
  getCurrentUser,
} from "../lib/storage";
import ForgotPasswordModal from "./ForgotPasswordModal";
import { useI18n } from "../lib/i18n";

// === хэширование пароля ===
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
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recoverOpen, setRecoverOpen] = useState(false);
  const [current, setCurrent] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const [loginAttempts, setLoginAttempts] = useState(0);
  const [lockUntil, setLockUntil] = useState(null);

  useEffect(() => {
    const user = getCurrentUser();
    setCurrent(user);
  }, []);

  // === Валидация формы ===
  const validateForm = () => {
    const errs = {};
    if (mode === "register") {
      if (!name.trim()) errs.name = t("required") || "Введите имя";
      if (!phone.trim()) errs.phone = t("required") || "Введите телефон";
      if (email && !validateEmail(email))
        errs.email = t("invalid_email") || "Неверный email";
      if (password.length < 6)
        errs.password = t("password_min") || "Минимум 6 символов";
      if (password !== passwordConfirm)
        errs.passwordConfirm = t("password_mismatch") || "Пароли не совпадают";
    } else {
      if (!identifier.trim())
        errs.identifier = t("required") || "Введите email или телефон";
      if (!password) errs.password = t("required") || "Введите пароль";
    }
    return errs;
  };

  // === Сабмит ===
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});
    const errs = validateForm();
    if (Object.keys(errs).length) {
      setFieldErrors(errs);
      return;
    }

    if (lockUntil && Date.now() < lockUntil) {
      setError("Слишком много попыток, попробуйте позже");
      return;
    }

    let users = getUsers();
    if (!Array.isArray(users)) users = [];

    if (mode === "register") {
      const phoneNorm = normalizePhone(phone);
      const existingUser = users.find(
        (u) =>
          normalizePhone(u.phone) === phoneNorm ||
          (u.email && u.email.toLowerCase() === email.toLowerCase())
      );
      if (existingUser) {
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
      onAuth?.(newUser);
      return;
    }

    // === Вход ===
    const id = identifier.trim();
    const phoneNorm = normalizePhone(id);
    const emailNorm = id.toLowerCase();
    const passwordHash = await sha256(password);

    const found = users.find((u) => {
      const phoneMatch =
        normalizePhone(u.phone) === phoneNorm && !!phoneNorm;
      const emailMatch =
        u.email && u.email.toLowerCase() === emailNorm;
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

  // === Авторизован ===
  if (current) {
    const initials = current.name
      ? current.name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase()
      : "U";

    return (
      <div style={cardStyle}>
        <div style={auroraBg} />
        <div style={borderGlow} />
        <style>{`
          @keyframes avatarPulse {
            0%, 100% { box-shadow: 0 0 0 0 rgba(168,85,247,0.4); }
            50% { box-shadow: 0 0 15px 3px rgba(168,85,247,0.3); }
          }
        `}</style>
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
              <div style={contactStyle}>📞 {current.phone}</div>
              {current.email && <div style={contactStyle}>✉️ {current.email}</div>}
              {current.instagram && (
                <div style={contactStyle}>📸 {current.instagram}</div>
              )}
            </div>
          </div>

          <button onClick={logout} style={logoutButton}>
            {t("logout") || "Выйти"}
          </button>
        </div>
      </div>
    );
  }

  // === Не авторизован ===
  return (
    <>
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
        <div className="segmented" style={{ marginBottom: 14 }}>
          <button
            type="button"
            className={mode === "login" ? "active" : ""}
            onClick={() => setMode("login")}
          >
            {t("login") || "Вход"}
          </button>
          <button
            type="button"
            className={mode === "register" ? "active" : ""}
            onClick={() => setMode("register")}
          >
            {t("register") || "Регистрация"}
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {mode === "register" && (
            <>
              <input className="glass-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Имя" />
              <input className="glass-input" value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="@instagram" />
              <input className="glass-input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
              <input className="glass-input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+3706..." />
              <input className="glass-input" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Пароль" />
              <input className="glass-input" type={showPassword ? "text" : "password"} value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)} placeholder="Подтвердите пароль" />
            </>
          )}

          {mode === "login" && (
            <>
              <input className="glass-input" value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="+3706... / email" />
              <input className="glass-input" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Пароль" />
            </>
          )}

          {error && (
            <div style={{ color: "#ff88aa", textAlign: "center", fontSize: "0.9rem" }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={isSubmitting} className="cta">
            {mode === "login" ? t("login") || "Войти" : t("register") || "Регистрация"}
          </button>
        </form>
      </div>

      <ForgotPasswordModal open={recoverOpen} onClose={() => setRecoverOpen(false)} />
    </>
  );
}

// === стили для авторизованного ===
const cardStyle = {
  position: "relative",
  padding: "26px",
  borderRadius: "22px",
  background: "rgba(15, 6, 26, 0.55)",
  border: "1px solid rgba(168,85,247,0.35)",
  backdropFilter: "blur(22px)",
  boxShadow: "0 12px 45px rgba(0,0,0,0.45)",
  overflow: "hidden",
  marginBottom: "30px",
  fontFamily: "Poppins, Inter, sans-serif",
  color: "#fff",
};
const auroraBg = {
  position: "absolute",
  inset: 0,
  pointerEvents: "none",
  zIndex: 0,
  background:
    "radial-gradient(900px 500px at -10% 120%, rgba(168,85,247,0.18), transparent 65%)," +
    "radial-gradient(700px 400px at 110% -20%, rgba(139,92,246,0.16), transparent 60%)," +
    "radial-gradient(800px 450px at 50% 120%, rgba(99,102,241,0.12), transparent 65%)",
};
const borderGlow = {
  position: "absolute",
  inset: 0,
  borderRadius: "22px",
  padding: "1.5px",
  background:
    "linear-gradient(120deg, rgba(168,85,247,0.55), rgba(139,92,246,0.35), rgba(99,102,241,0.45))",
  WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
  WebkitMaskComposite: "xor",
  opacity: 0.7,
};
const avatarStyle = {
  minWidth: 44,
  height: 44,
  borderRadius: 12,
  background: "rgba(168,85,247,0.18)",
  border: "1px solid rgba(168,85,247,0.35)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#fff",
  fontWeight: 700,
  fontSize: "1.1rem",
  animation: "avatarPulse 3.6s ease-in-out infinite",
};
const nameStyle = {
  fontSize: "1.35rem",
  fontWeight: 700,
  marginBottom: 3,
  background: "linear-gradient(90deg, rgba(236,223,255,1), rgba(198,173,255,0.85))",
  WebkitBackgroundClip: "text",
  color: "transparent",
};
const contactStyle = { opacity: 0.85, display: "flex", alignItems: "center", gap: 6 };
const logoutButton = {
  padding: "6px 14px",
  fontSize: "0.85rem",
  borderRadius: "10px",
  border: "1px solid rgba(168,85,247,0.5)",
  background: "rgba(168,85,247,0.12)",
  color: "#fff",
  cursor: "pointer",
  transition: "0.25s",
  whiteSpace: "nowrap",
  backdropFilter: "blur(6px)",
  width: "65%",
  textAlign: "center",
};
