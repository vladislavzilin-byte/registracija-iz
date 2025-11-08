import { useState, useEffect } from "react";
import {
  getUsers,
  saveUsers,
  setCurrentUser,
  getCurrentUser,
} from "../lib/storage";
import ForgotPasswordModal from "./ForgotPasswordModal";
import { useI18n } from "../lib/i18n";
import { User, Lock, Unlock } from "lucide-react";

// --- вспомогательные функции ---
async function sha256(message) {
  const msgUint8 = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
const normalizePhone = (p) => (p || "").replace(/\D/g, "");
const validateEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

// --- основная компонента ---
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

  // rate limit
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

      const strongPass = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{7,}$/;
      if (!strongPass.test(password))
        errs.password =
          "Пароль должен содержать минимум 7 символов, заглавную букву, цифру и спецсимвол (!@#$%^&*).";

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

    // проверка rate limit
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

    // LOGIN
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
        (!u.passwordHash && u.password === password); // ✅ совместимость
      return (phoneMatch || emailMatch) && hashMatch;
    });

    if (!found) {
      const newAttempts = loginAttempts + 1;
      setLoginAttempts(newAttempts);
      if (newAttempts >= 5) {
        setLockUntil(Date.now() + 60_000); // блокировка на 1 мин
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
      <div className="card" style={{ color: "#fff" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <b>{current.name}</b>
            <div style={{ opacity: 0.8 }}>
              {current.email || current.phone || ""}
            </div>
          </div>
          <button onClick={logout}>{t("logout")}</button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="card">
        <div className="segmented" style={{ marginBottom: 12 }}>
          <button
            type="button"
            className={mode === "login" ? "active" : ""}
            onClick={() => {
              setMode("login");
              setError("");
            }}
          >
            {t("login")}
          </button>
          <button
            type="button"
            className={mode === "register" ? "active" : ""}
            onClick={() => {
              setMode("register");
              setError("");
            }}
          >
            {t("register")}
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {mode === "login" ? (
            <>
              <label>{t("phone_or_email")}</label>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  borderRadius: "10px",
                  background: "rgba(255,255,255,0.08)",
                  padding: "4px 8px",
                }}
              >
                <User size={18} strokeWidth={2} style={{ opacity: 0.8 }} />
                <input
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="+3706... / email"
                  style={{
                    flex: 1,
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    color: "#fff",
                  }}
                />
              </div>

              <label>{t("password")}</label>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  borderRadius: "10px",
                  background: "rgba(255,255,255,0.08)",
                  padding: "4px 8px",
                }}
              >
                <Lock size={18} strokeWidth={2} style={{ opacity: 0.8 }} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••"
                  style={{
                    flex: 1,
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    color: "#fff",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {showPassword ? (
                    <Unlock size={18} strokeWidth={2} style={{ opacity: 0.9 }} />
                  ) : (
                    <Lock size={18} strokeWidth={2} style={{ opacity: 0.9 }} />
                  )}
                </button>
              </div>
            </>
          ) : (
            <>
              <label>{t("name")}</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Inga"
              />

              <label>{t("instagram")}</label>
              <input
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                placeholder="@username"
              />

              <label>{t("email_opt")}</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
              />

              <label>{t("phone")}</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+3706..."
              />

              {/* PASSWORD */}
              <label>{t("password")}</label>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  borderRadius: "10px",
                  background: "rgba(255,255,255,0.08)",
                  padding: "4px 8px",
                }}
              >
                <Lock size={18} strokeWidth={2} style={{ opacity: 0.8 }} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••"
                  style={{
                    flex: 1,
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    color: "#fff",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {showPassword ? (
                    <Unlock size={18} strokeWidth={2} style={{ opacity: 0.9 }} />
                  ) : (
                    <Lock size={18} strokeWidth={2} style={{ opacity: 0.9 }} />
                  )}
                </button>
              </div>
              <div
                style={{
                  fontSize: "0.85rem",
                  opacity: 0.85,
                  marginTop: "4px",
                  marginBottom: "6px",
                }}
              >
                Пароль должен содержать минимум <b>7 символов</b>, <b>одну заглавную букву</b>, <b>цифру</b> и <b>спецсимвол</b> (!@#$%).
              </div>

              {/* CONFIRM */}
              <label>{t("confirm_password")}</label>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  borderRadius: "10px",
                  background: "rgba(255,255,255,0.08)",
                  padding: "4px 8px",
                }}
              >
                <Lock size={18} strokeWidth={2} style={{ opacity: 0.8 }} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  placeholder="••••••"
                  style={{
                    flex: 1,
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    color: "#fff",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {showPassword ? (
                    <Unlock size={18} strokeWidth={2} style={{ opacity: 0.9 }} />
                  ) : (
                    <Lock size={18} strokeWidth={2} style={{ opacity: 0.9 }} />
                  )}
                </button>
              </div>
            </>
          )}

          {error && (
            <div
              style={{
                color: "rgb(255,150,150)",
                fontSize: "0.9rem",
                marginTop: 6,
