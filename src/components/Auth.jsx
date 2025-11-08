import { useState, useEffect } from "react";
import {
  getUsers,
  saveUsers,
  setCurrentUser,
  getCurrentUser,
} from "../lib/storage";
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

// === Forgot Password Modal ===
function ForgotPasswordModal({ open, onClose }) {
  const [phoneInput, setPhoneInput] = useState("");
  const [foundPassword, setFoundPassword] = useState("");
  const [message, setMessage] = useState("");

  if (!open) return null;

  const handleRecover = () => {
    const phoneNorm = phoneInput.replace(/\D/g, "");
    const users = getUsers() || [];
    const user = users.find((u) => u.phone && normalizePhone(u.phone) === phoneNorm);

    if (!user) {
      setFoundPassword("");
      setMessage("Пользователь не найден");
      return;
    }

    if (user.passwordHash) {
      setMessage("Ваш пароль хранится в зашифрованном виде и не может быть показан.");
      setFoundPassword("");
    } else if (user.password) {
      setFoundPassword(user.password);
      setMessage("");
    } else {
      setFoundPassword("");
      setMessage("Пароль не найден");
    }
  };

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <h3 style={{ color: "#fff", marginBottom: 12 }}>Восстановление пароля</h3>
        <input
          type="text"
          placeholder="Введите номер телефона"
          value={phoneInput}
          onChange={(e) => setPhoneInput(e.target.value)}
          style={inputStyle}
        />
        <button onClick={handleRecover} style={buttonStyle}>
          Показать пароль
        </button>
        {message && <div style={{ color: "#ff9bbb", marginTop: 10 }}>{message}</div>}
        {foundPassword && (
          <div style={{ color: "#b58fff", marginTop: 10 }}>
            Ваш пароль: <strong>{foundPassword}</strong>
          </div>
        )}
        <button onClick={onClose} style={closeBtnStyle}>
          Закрыть
        </button>
      </div>
    </div>
  );
}

// === основной компонент Auth ===
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

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2200);
  };

  const validateForm = () => {
    const errs = {};
    if (mode === "register") {
      if (!name.trim()) errs.name = "Введите имя";
      if (!phone.trim()) errs.phone = "Введите телефон";
      if (email && !validateEmail(email)) errs.email = "Неверный email";
      if (password.length < 6) errs.password = "Минимум 6 символов";
      if (password !== passwordConfirm)
        errs.passwordConfirm = "Пароли не совпадают";
    } else {
      if (!identifier.trim()) errs.identifier = "Введите email или телефон";
      if (!password) errs.password = "Введите пароль";
    }
    return errs;
  };

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

  // === отображение ===
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
          <div style={{ position: "relative", zIndex: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={avatarStyle}>{initials}</div>
              <div>
                <div style={nameStyle}>{current.name}</div>
                <div style={contactStyle}>{current.phone}</div>
                {current.email && <div style={contactStyle}>{current.email}</div>}
                {current.instagram && <div style={contactStyle}>{current.instagram}</div>}
              </div>
            </div>
            <button onClick={logout} style={logoutButton}>Выйти</button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {toast && <div style={toastStyle}>{toast}</div>}
      <style>{fadeAnim}</style>
      <style>{segmentStyles}</style>

      <div className="card" style={{ paddingTop: 18 }}>
        <div className="segmented" style={{ marginBottom: 14 }}>
          <button type="button" className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>Вход</button>
          <button type="button" className={mode === "register" ? "active" : ""} onClick={() => setMode("register")}>Регистрация</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {mode === "login" ? (
            <>
              <input className="glass-input" value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="+3706... / email" />
              <div style={{ position: "relative" }}>
                <input className="glass-input" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Пароль" />
                <span onClick={() => setShowPassword((s) => !s)} style={{ position: "absolute", right: 12, top: 10, cursor: "pointer", opacity: 0.75 }}>
                  {showPassword ? "🙈" : "👁"}
                </span>
              </div>
              <div onClick={() => setRecoverOpen(true)} style={{ textAlign: "right", color: "#b58fff", fontSize: "0.9rem", cursor: "pointer", marginTop: "-6px" }}>Забыли пароль?</div>
            </>
          ) : (
            <>
              <input className="glass-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Имя" />
              <input className="glass-input" value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="@instagram" />
              <input className="glass-input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
              <input className="glass-input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+3706..." />
              <input className="glass-input" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Пароль" />
              <input className="glass-input" type={showPassword ? "text" : "password"} value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)} placeholder="Подтвердите пароль" />
            </>
          )}

          {error && <div style={{ color: "#ff88aa", textAlign: "center" }}>{error}</div>}
          <button type="submit" className="cta">{mode === "login" ? "Войти" : "Регистрация"}</button>
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

const segmentStyles = `
.segmented {
  display: grid; grid-template-columns: 1fr 1fr; gap: 8px;
  padding: 6px; border-radius: 16px;
  background: linear-gradient(145deg, rgba(66,0,145,0.28), rgba(20,0,40,0.35));
  border: 1px solid rgba(168,85,247,0.35);
  backdrop-filter: blur(8px);
}
.segmented button {
  height: 42px; border-radius: 12px;
  border: 1px solid rgba(168,85,247,0.35);
  color: #fff; background: rgba(31,0,63,0.45);
  transition: .2s;
}
.segmented button.active {
  background: linear-gradient(180deg, rgba(124,58,237,0.55), rgba(88,28,135,0.5));
  box-shadow: inset 0 0 0 1px rgba(168,85,247,0.45), 0 10px 28px rgba(120,0,255,0.18);
}
.glass-input {
  width: 100%; height: 42px; border-radius: 12px;
  padding: 10px 12px; color: #fff;
  border: 1px solid rgba(168,85,247,0.35);
  background: rgba(17,0,40,0.45);
  outline: none; transition: .2s;
}
.glass-input:focus {
  border-color: rgba(168,85,247,0.65);
  box-shadow: 0 0 0 3px rgba(168,85,247,0.18);
  background: rgba(24,0,60,0.55);
}
.cta {
  height: 42px; border-radius: 12px;
  border: 1px solid rgba(168,85,247,0.55);
  color: #fff;
  background: linear-gradient(180deg, rgba(124,58,237,0.6), rgba(88,28,135,0.55));
  backdrop-filter: blur(6px);
  transition: .2s;
}
.cta:hover { transform: translateY(-1px); box-shadow: 0 10px 24px rgba(120,0,255,0.22); }
`;

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
  minWidth: 44, height: 44, borderRadius: 12,
  background: "rgba(168,85,247,0.18)",
  border: "1px solid rgba(168,85,247,0.35)",
  display: "flex", alignItems: "center", justifyContent: "center",
  color: "#fff", fontWeight: 700, fontSize: "1.1rem",
};
const nameStyle = {
  fontSize: "1.35rem", fontWeight: 700, marginBottom: 3,
  background: "linear-gradient(90deg, rgba(236,223,255,1), rgba(198,173,255,0.85))",
  WebkitBackgroundClip: "text", color: "transparent",
};
const contactStyle = { opacity: 0.85 };
const logoutButton = {
  padding: "6px 14px", fontSize: "0.85rem", borderRadius: "10px",
  border: "1px solid rgba(168,85,247,0.5)",
  background: "rgba(168,85,247,0.12)",
  color: "#fff", cursor: "pointer",
  transition: "0.25s", whiteSpace: "nowrap",
  backdropFilter: "blur(6px)",
};
const toastStyle = {
  position: "fixed", top: "25px", right: "25px",
  background: "linear-gradient(135deg, rgba(124,58,237,0.8), rgba(168,85,247,0.6))",
  border: "1px solid rgba(200,150,255,0.4)",
  color: "#fff", padding: "10px 18px", borderRadius: "12px",
  backdropFilter: "blur(10px)", boxShadow: "0 0 25px rgba(140,70,255,0.35)",
  fontWeight: 500, letterSpacing: "0.3px", zIndex: 1000,
  animation: "fadeInOut 2s ease-in-out forwards",
};
const overlayStyle = {
  position: "fixed", top: 0, left: 0,
  width: "100vw", height: "100vh",
  background: "rgba(0,0,0,0.6)",
  backdropFilter: "blur(8px)",
  display: "flex", alignItems: "center", justifyContent: "center",
  zIndex: 2000,
};
const modalStyle = {
  background: "rgba(25,0,50,0.65)",
  border: "1px solid rgba(168,85,247,0.4)",
  borderRadius: "18px",
  padding: "24px 28px",
  width: "90%",
  maxWidth: "380px",
  boxShadow: "0 0 40px rgba(140,70,255,0.35)",
  backdropFilter: "blur(15px)",
  textAlign: "center",
  color: "#fff",
};
const inputStyle = {
  width: "100%",
  borderRadius: "10px",
  border: "1px solid rgba(168,85,247,0.45)",
  background: "rgba(10,0,25,0.45)",
  padding: "10px 12px",
  color: "#fff",
  marginTop: "8px",
  outline: "none",
};
const buttonStyle = {
  width: "100%",
  marginTop: "12px",
  borderRadius: "10px",
  background: "linear-gradient(135deg, rgba(124,58,237,0.75), rgba(168,85,247,0.65))",
  border: "1px solid rgba(168,85,247,0.55)",
  color: "#fff",
  padding: "10px 0",
  cursor: "pointer",
};
const closeBtnStyle = {
  marginTop: "16px",
  color: "#d0b3ff",
  background: "none",
  border: "none",
  cursor: "pointer",
  textDecoration: "underline",
  fontSize: "0.9rem",
};
