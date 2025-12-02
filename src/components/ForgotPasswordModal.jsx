import { useState } from "react";
import { useI18n } from "../lib/i18n";
import { getUsers, saveUsers, setCurrentUser } from "../lib/storage";

/* SHA256 */
async function sha256(message) {
  const msgUint8 = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const normalizePhone = (p) => (p || "").replace(/\D/g, "");

export default function ForgotPasswordModal({
  open,
  onClose,
  onPasswordChanged,
  lang, // <-- язык получаем из Auth.jsx
}) {
  const { t } = useI18n();

  const [step, setStep] = useState("identify");
  const [identifier, setIdentifier] = useState("");
  const [emailForReset, setEmailForReset] = useState("");
  const [code, setCode] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [newPwdConfirm, setNewPwdConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

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
  };

  const handleClose = () => {
    if (!loading) {
      resetState();
      onClose?.();
    }
  };

  /* =============================================
      STEP 1: SEND CODE
  ============================================= */
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
          lang, // <-- язык отправляем правильно
        }),
      });

      const data = await resp.json().catch(() => ({}));

      if (!resp.ok || !data.ok) {
        throw new Error(data.error || "send_failed");
      }

      setEmailForReset(user.email);
      setStep("code");
      setMsg(t("auth_code_sent"));
    } catch (err) {
      console.error(err);
      setError(t("auth_send_error"));
    } finally {
      setLoading(false);
    }
  };

  /* =============================================
      STEP 2: VERIFY CODE + SET NEW PASSWORD
  ============================================= */
  const handleConfirm = async () => {
    setError("");
    setMsg("");

    if (!code.trim()) {
      setError(t("auth_err_code_required"));
      return;
    }

    if (newPwd.length < 6) {
      setError(t("auth_err_pwd_short"));
      return;
    }

    if (newPwd !== newPwdConfirm) {
      setError(t("auth_err_pwd_match"));
      return;
    }

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

      if (!resp.ok || !data.ok) {
        throw new Error(data.error || "invalid_code");
      }

      // Update local user
      const users = getUsers() || [];
      const hash = await sha256(newPwd);
      let updatedUser = null;

      const updatedUsers = users.map((u) => {
        if (u.email && u.email.toLowerCase() === emailForReset.toLowerCase()) {
          const nu = { ...u, passwordHash: hash };
          if ("password" in nu) delete nu.password;
          updatedUser = nu;
          return nu;
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
    } catch (err) {
      console.error(err);
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
            <p style={p1}>{t("auth_reset_step1_text")}</p>

            <input
              type="text"
              placeholder={t("phone_or_email")}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              style={inputStyle}
            />

            {error && <div style={errStyle}>{error}</div>}
            {msg && <div style={msgStyle}>{msg}</div>}

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
            <p style={p1}>{t("auth_reset_step2_text")}</p>

            <p style={p2}>
              {t("auth_code_sent_to")}{" "}
              <span style={{ color: "#fff" }}>{emailForReset}</span>
            </p>

            <input
              type="text"
              placeholder={t("auth_enter_code")}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              style={{ ...inputStyle, letterSpacing: 2 }}
            />

            <input
              type="password"
              placeholder={t("password")}
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
              style={{ ...inputStyle, marginTop: 10 }}
            />

            <input
              type="password"
              placeholder={t("password_confirm")}
              value={newPwdConfirm}
              onChange={(e) => setNewPwdConfirm(e.target.value)}
              style={{ ...inputStyle, marginTop: 10 }}
            />

            {error && <div style={errStyle}>{error}</div>}
            {msg && <div style={msgStyle}>{msg}</div>}

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

/* ========== Styles ========== */

const p1 = {
  margin: "0 0 10px 0",
  fontSize: 14,
  color: "#cbd5f5",
  opacity: 0.9,
};

const p2 = {
  margin: "0 0 10px 0",
  fontSize: 13,
  color: "#9ca3af",
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

const errStyle = { color: "#ff9bbb", marginTop: 10 };
const msgStyle = { color: "#a5f3fc", marginTop: 8 };

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
