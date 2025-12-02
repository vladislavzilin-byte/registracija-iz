import { useState, useEffect } from "react";
import {
  getUsers,
  saveUsers,
  getCurrentUser,
  setCurrentUser,
} from "../lib/storage";
import { useI18n } from "../lib/i18n";

/* ===================== HELPERS ===================== */
async function sha256(message) {
  const msgUint8 = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const normalizePhone = (p) => (p || "").replace(/\D/g, "");
const validateEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

// Lithuanian phone formatting
const formatLithuanianPhone = (value) => {
  let digits = value.replace(/\D/g, "");
  if (!digits.startsWith("370")) {
    digits = "370" + digits.replace(/^0+/, "");
  }
  if (digits.length > 11) digits = digits.slice(0, 11);
  return "+" + digits;
};

/* ===================== Eye Icons ===================== */
const eyeOpen = (
  <svg width="20" height="20" fill="#ccc">
    <path d="M10 3C5 3 1.73 7.11 1 10c.73 2.89 4 7 9 7s8.27-4.11 9-7c-.73-2.89-4-7-9-7zm0 12a5 5 0 110-10 5 5 0 010 10z" />
  </svg>
);
const eyeClosed = (
  <svg width="20" height="20" fill="#ccc">
    <path d="M2 3l14 14-1.5 1.5L10 13.5l-4.5 4.5L4 17l4.5-4.5L2 4.5 3.5 3z" />
  </svg>
);

/* ===================== Forgot Password Modal ===================== */
function ForgotPasswordModal({ open, onClose, onPasswordChanged }) {
  const { t, lang } = useI18n();

  const [step, setStep] = useState("identify");
  const [identifier, setIdentifier] = useState("");
  const [emailForReset, setEmailForReset] = useState("");
  const [code, setCode] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [newPwdConfirm, setNewPwdConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showNewPwd2, setShowNewPwd2] = useState(false);

  if (!open) return null;

  const resetState = () => {
    setStep("identify");
    setIdentifier("");
    setEmailForReset("");
    setCode("");
    setNewPwd("");
    setNewPwdConfirm("");
    setMsg("");
    setError("");
    setShowNewPwd(false);
    setShowNewPwd2(false);
  };

  const handleClose = () => {
    if (!loading) {
      resetState();
      onClose?.();
    }
  };

  // STEP 1 — SEND RESET CODE
  const handleSendCode = async () => {
    setError("");
    setMsg("");

    const id = identifier.trim();
    if (!id) {
      setError(t("auth_err_identifier"));
      return;
    }

    const users = getUsers() || [];
    const phoneNorm = normalizePhone(id);
    const emailNorm = id.toLowerCase();

    const user = users.find((u) => {
      const phoneMatch =
        u.phone && normalizePhone(u.phone) === phoneNorm && !!phoneNorm;
      const emailMatch = u.email && u.email.toLowerCase() === emailNorm;
      return phoneMatch || emailMatch;
    });

    if (!user) {
      setError(t("auth_user_not_found"));
      return;
    }

    if (!user.email) {
      setError(t("auth_no_email_for_reset"));
      return;
    }

    setLoading(true);
    try {
      const resp = await fetch("/api/reset/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user.email,
          lang,
        }),
      });

      const data = await resp.json().catch(() => ({}));

      if (!resp.ok || !data.ok) throw new Error(data.error || "send_failed");

      setEmailForReset(user.email);
      setStep("code");
      setMsg(t("auth_code_sent"));
    } catch {
      setError(t("auth_send_error"));
    } finally {
      setLoading(false);
    }
  };

  // STEP 2 — VERIFY & UPDATE PASSWORD
  const handleConfirm = async () => {
    setError("");
    setMsg("");

    if (!code.trim()) return setError(t("auth_err_code_required"));
    if (newPwd.length < 6) return setError(t("auth_err_pwd_short"));
    if (newPwd !== newPwdConfirm) return setError(t("auth_err_pwd_match"));

    setLoading(true);

    try {
      const resp = await fetch("/api/reset/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailForReset,
          code: code.trim(),
        }),
      });

      const data = await resp.json().catch(() => ({}));
      if (!resp.ok || !data.ok) throw new Error();

      const users = getUsers() || [];
      const hash = await sha256(newPwd);

      let updatedUser = null;
      const updatedUsers = users.map((u) => {
        if (u.email?.toLowerCase() === emailForReset.toLowerCase()) {
          updatedUser = { ...u, passwordHash: hash };
          delete updatedUser.password;
          return updatedUser;
        }
        return u;
      });

      saveUsers(updatedUsers);
      if (updatedUser) {
        setCurrentUser(updatedUser);
        onPasswordChanged?.(updatedUser);
      }

      setMsg(t("auth_reset_success"));
      setTimeout(() => handleClose(), 1200);
    } catch {
      setError(t("auth_invalid_or_expired_code"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={overlayStyle} onClick={handleClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ color: "#fff", marginBottom: 12 }}>
          {t("auth_recover_title")}
        </h3>

        {step === "identify" && (
          <>
            <p style={{ margin: "0 0 10px", fontSize: 14, color: "#cbd5f5" }}>
              {t("auth_reset_step1_text")}
            </p>

            <input
              type="text"
              placeholder={t("phone_or_email")}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              style={inputStyle}
            />

            {error && <div style={{ color: "#ff9bbb" }}>{error}</div>}
            {msg && <div style={{ color: "#a5f3fc" }}>{msg}</div>}

            <button
              onClick={handleSendCode}
              style={buttonStyle}
              disabled={loading}
            >
              {loading ? t("auth_sending") : t("auth_send_code")}
            </button>

            <button onClick={handleClose} style={closeBtnStyle}>
              {t("mb_close")}
            </button>
          </>
        )}

        {step === "code" && (
          <>
            <p style={{ marginBottom: 8, fontSize: 14, color: "#cbd5f5" }}>
              {t("auth_reset_step2_text")}
            </p>

            <p style={{ marginBottom: 10, fontSize: 13, color: "#9ca3af" }}>
              {t("auth_code_sent_to")}{" "}
              <span style={{ color: "#e5e7eb" }}>{emailForReset}</span>
            </p>

            <input
              type="text"
              placeholder={t("auth_enter_code")}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              style={{ ...inputStyle, letterSpacing: 2 }}
            />

            <div style={{ position: "relative", marginTop: 10 }}>
              <input
                type={showNewPwd ? "text" : "password"}
                placeholder={t("password")}
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                style={inputStyle}
              />

              <span
                onClick={() => setShowNewPwd(!showNewPwd)}
                style={eyeIcon}
              >
                {showNewPwd ? eyeOpen : eyeClosed}
              </span>
            </div>

            <div style={{ position: "relative", marginTop: 10 }}>
              <input
                type={showNewPwd2 ? "text" : "password"}
                placeholder={t("password_confirm")}
                value={newPwdConfirm}
                onChange={(e) => setNewPwdConfirm(e.target.value)}
                style={inputStyle}
              />

              <span
                onClick={() => setShowNewPwd2(!showNewPwd2)}
                style={eyeIcon}
              >
                {showNewPwd2 ? eyeOpen : eyeClosed}
              </span>
            </div>

            {error && <div style={{ color: "#ff9bbb" }}>{error}</div>}
            {msg && <div style={{ color: "#a5f3fc" }}>{msg}</div>}

            <button
              onClick={handleConfirm}
              style={buttonStyle}
              disabled={loading}
            >
              {loading ? t("auth_checking") : t("auth_change_password")}
            </button>

            <button onClick={handleClose} style={closeBtnStyle}>
              {t("mb_close")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* ===================== MAIN AUTH COMPONENT ===================== */

export default function Auth({ onAuth }) {
  const { t } = useI18n();

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
  const [errorFields, setErrorFields] = useState({});
  const [toast, setToast] = useState("");
  const [recoverOpen, setRecoverOpen] = useState(false);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  };

  /* ===================== SUBMIT ===================== */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setErrorFields({});

    if (mode === "login") {
      const users = getUsers() || [];
      const id = identifier.trim().toLowerCase();

      const user = users.find(
        (u) =>
          (u.email && u.email.toLowerCase() === id) ||
          (u.phone && normalizePhone(u.phone) === normalizePhone(id))
      );

      if (!user) {
        setError(t("auth_user_not_found"));
        setErrorFields({ identifier: true });
        return;
      }

      const hashed = await sha256(password);
      if (user.passwordHash !== hashed) {
        setError(t("auth_err_invalid_password"));
        setErrorFields({ password: true });
        return;
      }

      setCurrentUser(user);
      onAuth?.(user);
      return;
    }

    /* === registration === */
    const newErr = {};

    if (!name.trim()) newErr.name = true;
    if (!email.trim() || !validateEmail(email)) newErr.email = true;
    if (!phone.trim()) newErr.phone = true;
    if (password.length < 6) newErr.password = true;
    if (password !== passwordConfirm) newErr.passwordConfirm = true;

    if (Object.keys(newErr).length) {
      setErrorFields(newErr);
      setError(t("auth_err_fill_all"));
      return;
    }

    const users = getUsers() || [];

    if (users.find((u) => u.email?.toLowerCase() === email.toLowerCase())) {
      setError(t("auth_err_email_taken"));
      setErrorFields({ email: true });
      return;
    }

    const passwordHash = await sha256(password);

    const newUser = {
      name,
      instagram,
      email,
      phone,
      passwordHash,
    };

    saveUsers([...users, newUser]);
    setCurrentUser(newUser);
    onAuth?.(newUser);
  };

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

              <div style={{ position: "relative" }}>
                <input
                  className={`glass-input ${
                    errorFields.password ? "error" : ""
                  }`}
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

              <div style={{ position: "relative" }}>
                <input
                  className={`glass-input ${
                    errorFields.password ? "error" : ""
                  }`}
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
                  className={`glass-input ${
                    errorFields.passwordConfirm ? "error" : ""
                  }`}
                  type={showConfirmPassword ? "text" : "password"}
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  placeholder={t("password_confirm")}
                />
                <span
                  onClick={() =>
                    setShowConfirmPassword(!showConfirmPassword)
                  }
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
        onPasswordChanged={(user) => {
          setCurrentUser(user);
          onAuth?.(user);
          showToast(t("auth_reset_success"));
        }}
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
.glass-input.error {
  border-color: #ff6688;
}
.cta {
  height: 42px;
  border-radius: 12px;
  border: 1px solid rgba(168,85,247,0.45);
  background: linear-gradient(180deg, rgba(86,0,145,0.9), rgba(44,0,77,0.85));
  color: #fff;
  font-weight: 500;
  transition: .25s;
}
`;

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
  maxWidth: 420,
  width: "92%",
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

const eyeIcon = {
  position: "absolute",
  top: "50%",
  right: 12,
  transform: "translateY(-50%)",
  cursor: "pointer",
  opacity: 0.8,
};
