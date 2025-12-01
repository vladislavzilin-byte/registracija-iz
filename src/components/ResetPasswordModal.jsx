import { useState } from "react";
import { useI18n } from "../lib/i18n";
import sha256 from "../lib/sha256"; // если нет — я дам

export default function ResetPasswordModal({ open, onClose }) {
  const { t } = useI18n();

  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  const api = async (url, data) =>
    (await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })).json();

  /* ========================
      STEP 1 — SEND OTP
  ======================== */
  const handleSendOtp = async () => {
    setError("");
    if (!email.trim()) {
      setError(t("auth_err_email"));
      return;
    }
    setLoading(true);

    const res = await api("/api/reset/send-code", { email });

    setLoading(false);

    if (!res.ok) {
      setError("Ошибка сервера");
      return;
    }

    setStep(2);
  };

  /* ========================
      STEP 2 — VERIFY OTP
  ======================== */
  const handleVerifyOtp = async () => {
    setError("");
    if (!code.trim()) {
      setError(t("auth_err_code_required"));
      return;
    }
    setLoading(true);

  const res = await api("/api/reset/verify-code", { email, code });

    setLoading(false);

    if (!res.ok) {
      if (res.error === "invalid_code") setError(t("auth_err_code_wrong"));
      else if (res.error === "expired") setError(t("auth_err_code_expired"));
      else setError(t("auth_err_unknown"));
      return;
    }

    setToken(res.token);
    setStep(3);
  };

  /* ========================
      STEP 3 — NEW PASSWORD
  ======================== */
  const handleSetPassword = async () => {
    setError("");

    if (newPassword.length < 6) {
      setError(t("auth_err_pwd_short"));
      return;
    }

    setLoading(true);

    const passwordHash = await sha256(newPassword);

    const res = await api("/api/set-new-password", {
      email,
      token,
      newPasswordHash: passwordHash,
    });

    setLoading(false);

    if (!res.ok) {
      setError(t("auth_err_unknown"));
      return;
    }

    // УСПЕХ
    alert(t("auth_password_changed"));
    onClose();
  };

  return (
    <div style={overlay}>
      <div style={modal}>
        {/* === STEP 1 === */}
        {step === 1 && (
          <>
            <h2>{t("auth_reset_title")}</h2>

            <input
              className="glass-input"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            {error && <div style={errStyle}>{error}</div>}

            <button className="cta" onClick={handleSendOtp} disabled={loading}>
              {loading ? t("processing") : t("auth_send_code")}
            </button>
          </>
        )}

        {/* === STEP 2 === */}
        {step === 2 && (
          <>
            <h2>{t("auth_enter_code")}</h2>

            <input
              className="glass-input"
              placeholder="000000"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              style={{ textAlign: "center", letterSpacing: 4 }}
            />

            {error && <div style={errStyle}>{error}</div>}

            <button className="cta" onClick={handleVerifyOtp} disabled={loading}>
              {loading ? t("processing") : t("auth_verify_code")}
            </button>
          </>
        )}

        {/* === STEP 3 === */}
        {step === 3 && (
          <>
            <h2>{t("auth_new_password")}</h2>

            <input
              className="glass-input"
              type="password"
              placeholder={t("password")}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />

            {error && <div style={errStyle}>{error}</div>}

            <button className="cta" onClick={handleSetPassword} disabled={loading}>
              {loading ? t("processing") : t("auth_set_new_password")}
            </button>
          </>
        )}

        <div
          onClick={onClose}
          style={{ marginTop: 15, cursor: "pointer", color: "#b58fff" }}
        >
          {t("close")}
        </div>
      </div>
    </div>
  );
}

/* ============================
    STYLES
============================ */
const overlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.55)",
  backdropFilter: "blur(6px)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 2000,
};

const modal = {
  background: "rgba(30,0,60,0.7)",
  padding: "26px",
  borderRadius: "16px",
  border: "1px solid rgba(168,85,247,0.35)",
  width: "320px",
  color: "#fff",
};

const errStyle = {
  color: "#ff8f9f",
  margin: "10px 0",
  fontSize: "0.9rem",
};
