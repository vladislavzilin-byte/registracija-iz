import { useState } from "react";
import { useI18n } from "../lib/i18n";
import {
  getUsers,
  saveUsers,
  getCurrentUser,
  setCurrentUser,
} from "../lib/storage";
import ForgotPasswordModal from "./ForgotPasswordModal";

/* ==========================================
   Helpers
========================================== */

async function sha256(message) {
  const msgUint8 = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const normalizePhone = (p) => (p || "").replace(/\D/g, "");
const validateEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

const formatLithuanianPhone = (value) => {
  let digits = value.replace(/\D/g, "");
  if (!digits.startsWith("370")) {
    digits = "370" + digits.replace(/^0+/, "");
  }
  if (digits.length > 11) digits = digits.slice(0, 11);
  return "+" + digits;
};

/* ==========================================
   MAIN COMPONENT
========================================== */

export default function Auth({ onAuth }) {
  const { t, lang } = useI18n(); // <-- важно! теперь lang есть
  const [mode, setMode] = useState("login");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  const [name, setName] = useState("");
  const [instagram, setInstagram] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);
  const [recoverOpen, setRecoverOpen] = useState(false);
  const [errorFields, setErrorFields] = useState({
    identifier: false,
    password: false,
    name: false,
    email: false,
    phone: false,
    passwordConfirm: false,
  });

  const showToast = (txt) => {
    setToast(txt);
    setTimeout(() => setToast(null), 2000);
  };

  /* ==========================================
     LOGIN
  ========================================== */

  const handleLogin = async () => {
    setError("");
    setErrorFields({ identifier: false, password: false });

    if (!identifier.trim()) {
      setError(t("auth_err_identifier"));
      setErrorFields((f) => ({ ...f, identifier: true }));
      return;
    }

    if (!password.trim()) {
      setError(t("auth_err_enter_password"));
      setErrorFields((f) => ({ ...f, password: true }));
      return;
    }

    const users = getUsers() || [];

    const phoneNorm = normalizePhone(identifier);
    const emailNorm = identifier.toLowerCase();

    const user = users.find((u) => {
      const phoneMatch =
        u.phone && normalizePhone(u.phone) === phoneNorm && !!phoneNorm;
      const emailMatch = u.email && u.email.toLowerCase() === emailNorm;
      return phoneMatch || emailMatch;
    });

    if (!user) {
      setError(t("auth_err_invalid_login"));
      return;
    }

    // old accounts: plain passwords
    if (user.password) {
      if (user.password !== password) {
        setError(t("auth_err_invalid_login"));
        return;
      }
      setCurrentUser(user);
      onAuth?.(user);
      return;
    }

    // new accounts
    const hash = await sha256(password);
    if (hash !== user.passwordHash) {
      setError(t("auth_err_invalid_login"));
      return;
    }

    setCurrentUser(user);
    onAuth?.(user);
  };

  /* ==========================================
     REGISTER
  ========================================== */

  const handleRegister = async () => {
    setError("");

    const errs = {
      name: !name.trim(),
      email: email && !validateEmail(email),
      phone: !phone.trim(),
      password: password.length < 6,
      passwordConfirm: passwordConfirm !== password,
    };

    setErrorFields(errs);

    if (Object.values(errs).some(Boolean)) {
      setError(t("auth_err_invalid_login"));
      return;
    }

    const users = getUsers() || [];

    const exists = users.find(
      (u) =>
        (u.phone && normalizePhone(u.phone) === normalizePhone(phone)) ||
        (u.email && u.email.toLowerCase() === email.toLowerCase())
    );

    if (exists) {
      setError(t("auth_err_user_exists"));
      return;
    }

    const hash = await sha256(password);

    const user = {
      id: Date.now(),
      name,
      instagram,
      email,
      phone,
      passwordHash: hash,
    };

    users.push(user);
    saveUsers(users);
    setCurrentUser(user);
    onAuth?.(user);
    showToast(t("auth_account_created"));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    mode === "login" ? handleLogin() : handleRegister();
  };

  /* ==========================================
     UI
  ========================================== */

  return (
    <>
      {toast && <div style={toastStyle}>{toast}</div>}

      <div className="card" style={{ paddingTop: 18 }}>
        <div className="segmented" style={{ marginBottom: 14 }}>
          <button
            type="button"
            className={mode === "login" ? "active" : ""}
            onClick={() => setMode("login")}
          >
            {t("login")}
          </button>

          <button
            type="button"
            className={mode === "register" ? "active" : ""}
            onClick={() => setMode("register")}
          >
            {t("register")}
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: 12 }}
        >
          {mode === "login" ? (
            <>
              <input
                className={`glass-input ${
                  errorFields.identifier ? "error" : ""
                }`}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={t("phone_or_email")}
              />

              <input
                className={`glass-input ${
                  errorFields.password ? "error" : ""
                }`}
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("password")}
              />

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
                {t("forgot_password")}
              </div>
            </>
          ) : (
            <>
              <input
                className={`glass-input ${errorFields.name ? "error" : ""}`}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("name")}
              />

              <input
                className="glass-input"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                placeholder="@instagram"
              />

              <input
                className={`glass-input ${errorFields.email ? "error" : ""}`}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
              />

              <input
                className={`glass-input ${errorFields.phone ? "error" : ""}`}
                value={phone}
                onChange={(e) =>
                  setPhone(formatLithuanianPhone(e.target.value))
                }
                placeholder={t("phone")}
                style={{ color: phone ? "#fff" : "#aaa" }}
              />

              <input
                className={`glass-input ${
                  errorFields.password ? "error" : ""
                }`}
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("password")}
              />

              <input
                className={`glass-input ${
                  errorFields.passwordConfirm ? "error" : ""
                }`}
                type={showConfirmPassword ? "text" : "password"}
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                placeholder={t("password_confirm")}
              />
            </>
          )}

          {error && (
            <div style={{ color: "#ff88aa", textAlign: "center" }}>
              {error}
            </div>
          )}

          <button type="submit" className="cta">
            {mode === "login" ? t("login") : t("register")}
          </button>
        </form>
      </div>

      <ForgotPasswordModal
        open={recoverOpen}
        onClose={() => setRecoverOpen(false)}
        onPasswordChanged={(user) => {
          setCurrentUser(user);
          onAuth?.(user);
          showToast(t("auth_reset_success"));
        }}
        lang={lang} // <-- сериализация языка в модалку
      />
    </>
  );
}

/* ==========================================
   STYLES
========================================== */

const toastStyle = {
  position: "fixed",
  top: 25,
  right: 25,
  background:
    "linear-gradient(135deg, rgba(124,58,237,0.8), rgba(168,85,247,0.6))",
  padding: "10px 18px",
  borderRadius: 12,
  color: "#fff",
};
