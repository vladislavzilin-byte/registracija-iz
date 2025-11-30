import { useState, useEffect } from "react";
import {
  getUsers,
  saveUsers,
  setCurrentUser,
  getCurrentUser,
} from "../lib/storage";
import { useI18n } from "../lib/i18n";

/* ===================== helpers ===================== */
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

  // Если не начинается с 370 — добавляем
  if (!digits.startsWith("370")) {
    digits = "370" + digits.replace(/^0+/, "");
  }

  if (digits.length > 11) digits = digits.slice(0, 11);

  return "+" + digits;
};


/* ===================== Forgot Password Modal ===================== */
function ForgotPasswordModal({ open, onClose }) {
  const { t } = useI18n();
  const [phoneInput, setPhoneInput] = useState("");
  const [foundPassword, setFoundPassword] = useState("");
  const [message, setMessage] = useState("");

  if (!open) return null;

  const handleRecover = () => {
    const phoneNorm = phoneInput.replace(/\D/g, "");
    const users = getUsers() || [];
    const user = users.find(
      (u) => u.phone && normalizePhone(u.phone) === phoneNorm
    );

    if (!user) {
      setFoundPassword("");
      setMessage(t("auth_user_not_found"));
      return;
    }
    if (user.passwordHash) {
      setMessage(t("auth_password_encrypted"));
      setFoundPassword("");
    } else if (user.password) {
      setFoundPassword(user.password);
      setMessage("");
    } else {
      setFoundPassword("");
      setMessage(t("auth_password_missing"));
    }
  };

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <h3 style={{ color: "#fff", marginBottom: 12 }}>
          {t("auth_recover_title")}
        </h3>

        <input
          type="text"
          placeholder={t("auth_enter_phone")}
          value={phoneInput}
          onChange={(e) => setPhoneInput(e.target.value)}
          style={inputStyle}
        />

        <button onClick={handleRecover} style={buttonStyle}>
          {t("auth_show_password")}
        </button>

        {message && (
          <div style={{ color: "#ff9bbb", marginTop: 10 }}>{message}</div>
        )}

        {foundPassword && (
          <div style={{ color: "#b58fff", marginTop: 10 }}>
            {t("auth_your_password")}: <strong>{foundPassword}</strong>
          </div>
        )}

        <button onClick={onClose} style={closeBtnStyle}>
          {t("close")}
        </button>
      </div>
    </div>
  );
}

/* ===================== MAIN COMPONENT ===================== */
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
  const [errorFields, setErrorFields] = useState({});
  const [recoverOpen, setRecoverOpen] = useState(false);
  const [current, setCurrent] = useState(getCurrentUser());

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [toast, setToast] = useState("");

  /* ===================== Auto-profile updater ===================== */
  useEffect(() => {
    const interval = setInterval(() => {
      const updated = getCurrentUser();
      if (updated && JSON.stringify(updated) !== JSON.stringify(current)) {
        setCurrent(updated);
        onAuth?.(updated);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [current]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2200);
  };

  /* ===================== Validation ===================== */
  const validateForm = () => {
    const errs = {};

    if (mode === "register") {
      if (!name.trim()) errs.name = t("auth_err_name");
      if (!phone.trim()) errs.phone = t("auth_err_phone");
      if (email && !validateEmail(email)) errs.email = t("auth_err_email");
      if (password.length < 6) errs.password = t("auth_err_pwd_short");
      if (password !== passwordConfirm)
        errs.passwordConfirm = t("auth_err_pwd_match");
    } else {
      if (!identifier.trim()) errs.identifier = t("auth_err_identifier");
      if (!password) errs.password = t("auth_err_enter_password");
    }

    return errs;
  };

  /* ===================== Submit ===================== */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setErrorFields({});

    const errs = validateForm();
    if (Object.keys(errs).length) {
      setError(Object.values(errs)[0]);
      setErrorFields(errs);
      return;
    }

    let users = getUsers();
    if (!Array.isArray(users)) users = [];

    /* ---------- Registration ---------- */
    if (mode === "register") {
      const phoneNorm = normalizePhone(phone);
      const existing = users.find(
        (u) =>
          normalizePhone(u.phone) === phoneNorm ||
          (u.email && u.email.toLowerCase() === email.toLowerCase())
      );
      if (existing) {
        setError(t("auth_err_user_exists"));
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

      showToast(t("auth_account_created"));
      onAuth?.(newUser);
      return;
    }

    /* ---------- Login ---------- */
    const id = identifier.trim();
    const phoneNorm = normalizePhone(id);
    const emailNorm = id.toLowerCase();
    const hash = await sha256(password);

    const found = users.find((u) => {
      const phoneMatch = normalizePhone(u.phone) === phoneNorm && !!phoneNorm;
      const emailMatch = u.email && u.email.toLowerCase() === emailNorm;
      const pwdMatch =
        (u.passwordHash && u.passwordHash === hash) ||
        (!u.passwordHash && u.password === password);

      return (phoneMatch || emailMatch) && pwdMatch;
    });

    if (!found) {
      setError(t("auth_err_invalid_login"));
      return;
    }

    setCurrentUser(found);
    setCurrent(found);
    onAuth?.(found);
  };

  const logout = () => {
    setCurrentUser(null);
    setCurrent(null);
    onAuth?.(null);
  };

  /* ===================== Password Eye Icons ===================== */
  const eyeIcon = {
    position: "absolute",
    right: 12,
    top: 10,
    cursor: "pointer",
    opacity: 0.85,
  };

  const eyeOpen = (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#b58fff" strokeWidth="1.8">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"></path>
      <circle cx="12" cy="12" r="3"></circle>
    </svg>
  );

  const eyeClosed = (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#b58fff" strokeWidth="1.8">
      <path d="M17.94 17.94A10.94 10.94 0 0112 20c-7 0-11-8-11-8a21.36 21.36 0 015.1-6.36M1 1l22 22"></path>
    </svg>
  );

  /* ===================== PROFILE VIEW ===================== */
  if (current) {
    const initials = current.name
      ? current.name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase()
      : "U";

    return (
      <>
        {toast && <div style={toastStyle}>{toast}</div>}

        <div style={profileCard}>
          <div style={auroraBg} />
          <div style={borderGlow} />

          <div
            style={{
              position: "relative",
              zIndex: 2,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "6px 8px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={avatarStyle}>{initials}</div>
              <div>
                <div style={nameStyle}>{current.name}</div>
                {current.phone && <div style={contactStyle}>{current.phone}</div>}
                {current.email && <div style={contactStyle}>{current.email}</div>}
                {current.instagram && (
                  <div style={contactStyle}>{current.instagram}</div>
                )}
              </div>
            </div>

            <button onClick={logout} style={logoutButton}>
              {t("logout")}
            </button>
          </div>
        </div>
      </>
    );
  }

  /* ===================== LOGIN / REGISTER FORM ===================== */
  return (
    <>
      {toast && <div style={toastStyle}>{toast}</div>}
      <style>{segmentStyles}</style>

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
          {/* ------------ LOGIN ------------ */}
          {mode === "login" ? (
            <>
              <input
                className={`glass-input ${errorFields.identifier ? "error" : ""}`}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={t("phone_or_email")}
              />

              <div style={{ position: "relative" }}>
                <input
                  className={`glass-input ${errorFields.password ? "error" : ""}`}
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("password")}
                />

                <span onClick={() => setShowPassword(!showPassword)} style={eyeIcon}>
                  {showPassword ? eyeOpen : eyeClosed}
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
                {t("forgot_password")}
              </div>
            </>
          ) : (
            /* ------------ REGISTER ------------ */
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
                onChange={(e) => setPhone(formatLithuanianPhone(e.target.value))}
                placeholder={t("phone")}
                style={{ color: phone ? "#fff" : "#aaa" }}
              />

              <div style={{ position: "relative" }}>
                <input
                  className={`glass-input ${errorFields.password ? "error" : ""}`}
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("password")}
                />
                <span
                  onClick={() => setShowPassword(!showPassword)}
                  style={eyeIcon}
                >
                  {showPassword ? eyeOpen : eyeClosed}
                </span>
              </div>

              <div style={{ position: "relative" }}>
                <input
                  className={`glass-input ${errorFields.passwordConfirm ? "error" : ""}`}
                  type={showConfirmPassword ? "text" : "password"}
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  placeholder={t("password_confirm")}
                />

                <span
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={eyeIcon}
                >
                  {showConfirmPassword ? eyeOpen : eyeClosed}
                </span>
              </div>
            </>
          )}

          {error && (
            <div
              style={{
                color: "#ff88aa",
                textAlign: "center",
                animation: "fade 0.3s",
              }}
            >
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
      />
    </>
  );
}

/* ===================== STYLES ===================== */
const segmentStyles = `
.segmented {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  padding: 6px;
  border-radius: 16px;
  background: rgba(17, 0, 40, 0.45);
  border: 1px solid rgba(168,85,247,0.35);
  backdrop-filter: blur(8px);
}
.segmented button {
  height: 42px;
  border-radius: 12px;
  border: 1px solid rgba(168,85,247,0.3);
  color: #fff;
  background: rgba(31,0,63,0.3);
  transition: .25s;
}
.segmented button.active {
  border: 1.5px solid rgba(168,85,247,0.9);
  background: rgba(31,0,63,0.45);
  box-shadow: 0 0 12px rgba(168,85,247,0.55), 0 0 22px rgba(168,85,247,0.35);
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
  transition: .25s;
}
.cta {
  height: 42px;
  border-radius: 12px;
  border: 1px solid rgba(168,85,247,0.45);
  background: linear-gradient(180deg, rgba(86,0,145,0.9), rgba(44,0,77,0.85));
  color: #fff;
  font-weight: 500;
  transition: 0.25s;
}
.cta:hover {
  box-shadow: 0 0 20px rgba(168,85,247,0.6);
  transform: translateY(-1px);
}
`;

const profileCard = {
  position: "relative",
  padding: "24px",
  borderRadius: "20px",
  background: "linear-gradient(180deg, rgba(32,18,45,1) 0%, rgba(22,10,33,1) 100%)",
  border: "1px solid rgba(150,90,255,0.25)",
  backdropFilter: "blur(16px)",
  overflow: "hidden",
  color: "#fff",
};

const auroraBg = {
  position: "absolute",
  inset: 0,
  background:
    "radial-gradient(800px 500px at -10% 120%, rgba(120,80,220,0.08), transparent 70%), " +
    "radial-gradient(700px 400px at 110% -20%, rgba(100,70,210,0.06), transparent 65%), " +
    "radial-gradient(800px 450px at 50% 120%, rgba(80,70,200,0.05), transparent 75%)",
};

const borderGlow = {
  position: "absolute",
  inset: 0,
  borderRadius: "20px",
  border: "4px solid rgba(175,95,255,1)",
  boxShadow: `
    0 0 8px rgba(175,95,255,0.9),
    0 0 18px rgba(175,95,255,0.7),
    0 0 28px rgba(175,95,255,0.45)
  `,
};

const avatarStyle = {
  width: 48,
  height: 48,
  borderRadius: 14,
  border: "1px solid rgba(150,90,255,0.35)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#fff",
  fontWeight: 700,
};

const nameStyle = {
  fontWeight: 700,
  fontSize: "1.15rem",
};

const contactStyle = {
  opacity: 0.85,
  fontSize: "0.9rem",
};

const logoutButton = {
  borderRadius: "12px",
  border: "1px solid rgba(168,85,247,0.45)",
  background: "rgba(31,0,63,0.45)",
  color: "#fff",
  padding: "10px 24px",
  cursor: "pointer",
};

const overlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.6)",
  backdropFilter: "blur(8px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 2000,
};

const modalStyle = {
  background: "rgba(25,0,50,0.65)",
  border: "1px solid rgba(168,85,247,0.4)",
  borderRadius: 18,
  padding: "24px 28px",
  color: "#fff",
};

const inputStyle = {
  width: "100%",
  borderRadius: 10,
  border: "1px solid rgba(168,85,247,0.45)",
  background: "rgba(10,0,25,0.45)",
  padding: "10px 12px",
  color: "#fff",
};

const buttonStyle = {
  width: "100%",
  marginTop: 12,
  borderRadius: 10,
  background:
    "linear-gradient(135deg, rgba(124,58,237,0.75), rgba(168,85,247,0.65))",
  border: "1px solid rgba(168,85,247,0.55)",
  color: "#fff",
  padding: "10px 0",
  cursor: "pointer",
};

const closeBtnStyle = {
  marginTop: 16,
  color: "#d0b3ff",
  background: "none",
  border: "none",
  cursor: "pointer",
  textDecoration: "underline",
};

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
