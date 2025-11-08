import { useState, useEffect } from "react";
import {
  getUsers,
  saveUsers,
  setCurrentUser,
  getCurrentUser,
} from "../lib/storage";
import ForgotPasswordModal from "./ForgotPasswordModal";
import { useI18n } from "../lib/i18n";

// --- вспомогательные функции ---
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

  // === Проверка формы ===
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
        errs.passwordConfirm =
          t("password_mismatch") || "Пароли не совпадают";
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

    const users = getUsers() || [];

    if (mode === "register") {
      const phoneNorm = normalizePhone(phone);
      if (
        users.find(
          (u) =>
            normalizePhone(u.phone) === phoneNorm ||
            (u.email && u.email.toLowerCase() === email.toLowerCase())
        )
      ) {
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

  // === UI ===
  if (current) {
    return (
      <div
        style={{
          background:
            "linear-gradient(145deg, rgba(40,0,60,0.9), rgba(10,0,20,0.9))",
          padding: "20px",
          borderRadius: "18px",
          boxShadow: "0 0 25px rgba(160,90,255,0.3)",
          color: "#fff",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ fontWeight: 600, fontSize: "1.2rem" }}>
              {current.name}
            </div>
            <div style={{ opacity: 0.8 }}>
              {current.email || current.phone || ""}
            </div>
          </div>
          <button
            onClick={logout}
            style={{
              background:
                "linear-gradient(90deg, #7a3cff, #a05bff, #c089ff)",
              border: "none",
              borderRadius: "12px",
              padding: "8px 18px",
              color: "#fff",
              cursor: "pointer",
              fontWeight: 500,
              boxShadow: "0 0 12px rgba(160,90,255,0.6)",
            }}
          >
            {t("logout") || "Выйти"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        style={{
          background:
            "linear-gradient(180deg, rgba(25,0,45,0.95), rgba(10,0,25,0.95))",
          borderRadius: "20px",
          padding: "28px",
          color: "#fff",
          boxShadow: "0 0 30px rgba(150,60,255,0.25)",
          width: "100%",
          maxWidth: "550px",
          margin: "auto",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "18px",
            background: "rgba(100,30,180,0.3)",
            borderRadius: "14px",
            overflow: "hidden",
          }}
        >
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setError("");
            }}
            style={{
              flex: 1,
              padding: "10px",
              border: "none",
              cursor: "pointer",
              background:
                mode === "login"
                  ? "linear-gradient(90deg, #7a3cff, #a05bff)"
                  : "transparent",
              color: "#fff",
              fontWeight: 600,
              transition: "0.3s",
            }}
          >
            {t("login") || "Вход"}
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("register");
              setError("");
            }}
            style={{
              flex: 1,
              padding: "10px",
              border: "none",
              cursor: "pointer",
              background:
                mode === "register"
                  ? "linear-gradient(90deg, #7a3cff, #a05bff)"
                  : "transparent",
              color: "#fff",
              fontWeight: 600,
              transition: "0.3s",
            }}
          >
            {t("register") || "Регистрация"}
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {mode === "login" ? (
            <>
              <input
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="+3706... / email"
                style={inputStyle}
              />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                style={inputStyle}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                style={toggleButton}
              >
                {showPassword ? "👁️" : "🙈"}
              </button>
            </>
          ) : (
            <>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Имя"
                style={inputStyle}
              />
              <input
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                placeholder="@instagram"
                style={inputStyle}
              />
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                style={inputStyle}
              />
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+3706..."
                style={inputStyle}
              />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Пароль"
                style={inputStyle}
              />
              <input
                type={showPassword ? "text" : "password"}
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                placeholder="Подтвердите пароль"
                style={inputStyle}
              />
            </>
          )}

          {error && (
            <div style={{ color: "#ff88aa", textAlign: "center", fontSize: "0.9rem" }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              marginTop: "8px",
              padding: "12px",
              border: "none",
              borderRadius: "14px",
              background:
                "linear-gradient(90deg, #7a3cff, #a05bff, #c089ff)",
              boxShadow: "0 0 18px rgba(160,90,255,0.5)",
              color: "#fff",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.3s ease",
            }}
          >
            {mode === "login" ? t("login") || "Войти" : t("register") || "Регистрация"}
          </button>
        </form>
      </div>

      <ForgotPasswordModal
        open={recoverOpen}
        onClose={() => setRecoverOpen(false)}
      />
    </>
  );
}

const inputStyle = {
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(160,90,255,0.4)",
  borderRadius: "12px",
  padding: "10px 12px",
  color: "#fff",
  fontSize: "1rem",
  outline: "none",
  transition: "0.3s",
  boxShadow: "0 0 10px rgba(160,90,255,0.15)",
};

const toggleButton = {
  alignSelf: "flex-end",
  background: "transparent",
  color: "#a889ff",
  border: "none",
  cursor: "pointer",
  marginTop: "-5px",
};
