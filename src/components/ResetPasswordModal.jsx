import { useState } from "react";
import { useI18n } from "../lib/i18n";
import sha256 from "../lib/sha256";
import { getUsers, saveUsers, setCurrentUser } from "../lib/storage";

export default function ResetPasswordModal({ open, onClose }) {
  const { t } = useI18n();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  const api = async (url, data) => {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return { response: r, data: await r.json() };
  };

  const handleSendOtp = async () => {
    setError("");
    if (!email.trim()) return setError(t("auth_err_email"));
    setLoading(true);
    const { response } = await api("/api/reset/send-code", { email });
    setLoading(false);
    if (!response.ok) return setError("Не удалось отправить код");
    setStep(2);
  };

  const handleVerifyOtp = async () => {
    setError("");
    if (!code.trim()) return setError(t("auth_err_code_required"));
    setLoading(true);
    const { response, data } = await api("/api/reset/verify-code", { email, code });
    setLoading(false);
    if (!response.ok || !data.ok) {
      return setError(t("auth_err_code_wrong") || "Неверный или истёкший код");
    }
    setStep(3);
  };

  const handleSetPassword = async () => {
    setError("");
    if (newPassword.length < 6) return setError(t("auth_err_pwd_short"));
    if (newPassword !== confirmPassword) return setError("Пароли не совпадают");

    const passwordHash = await sha256(newPassword);
    const users = getUsers();
    const userIndex = users.findIndex(u => u.email?.toLowerCase() === email.toLowerCase());
    if (userIndex === -1) return setError("Пользователь не найден");

    users[userIndex].passwordHash = passwordHash;
    saveUsers(users);
    setCurrentUser(users[userIndex]);

    alert(t("auth_password_changed") || "Пароль успешно изменён!");
    onClose();
  };

  return (
    <div style={overlay}>
      <div style={modal}>
        {step === 1 && (
          <>
            <h2>{t("auth_reset_title") || "Восстановление пароля"}</h2>
            <input className="glass-input" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
            {error && <div style={errStyle}>{error}</div>}
            <button className="cta" onClick={handleSendOtp} disabled={loading}>
              {loading ? "Отправка..." : "Отправить код"}
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <h2>Введите код из письма</h2>
            <div style={{fontSize: "0.9rem", opacity: 0.8, marginBottom: 10}}>
              auth_code_sent_to {email}
            </div>
            <input
              className="glass-input"
              placeholder="000000"
              maxLength={10}
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0,6))}
              style={{ textAlign: "center", letterSpacing: 8, fontSize: "1.4rem" }}
            />
            {error && <div style={errStyle}>{error}</div>}
            <button className="cta" onClick={handleVerifyOtp} disabled={loading}>
              {loading ? "Проверка..." : "Продолжить"}
            </button>
          </>
        )}

        {step === 3 && (
          <>
            <h2>Новый пароль</h2>
            <input className="glass-input" type="password" placeholder="Новый пароль" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
            <input className="glass-input" type="password" placeholder="Повторите пароль" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} style={{ marginTop: 10 }} />
            {error && <div style={errStyle}>{error}</div>}
            <button className="cta" onClick={handleSetPassword} disabled={loading}>
              Изменить пароль
            </button>
          </>
        )}

        <div onClick={onClose} style={{ marginTop: 20, cursor: "pointer", color: "#b58fff" }}>
          Закрыть
        </div>
      </div>
    </div>
  );
}

const overlay = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 2000 };
const modal = { background: "rgba(30,0,60,0.85)", padding: "30px", borderRadius: "18px", border: "1px solid rgba(168,85,000,0.4)", width: "340px", color: "#管道" };
const errStyle = { color: "#ff6b6b", margin: "12px 0 0", fontSize: "0.95rem" };
