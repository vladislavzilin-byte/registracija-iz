import React, { useState } from "react";
import { getUsers, saveCurrentUser } from "../utils/storage";
import ForgotPasswordModal from "./ForgotPasswordModal";
import { useI18n } from "../lib/i18n"; // <— добавлено

export default function Login({ onLogin }) {
  const { t } = useI18n(); // <— i18n hook

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [showForgot, setShowForgot] = useState(false);

  const handleLogin = () => {
    const users = getUsers();
    const user = users.find(
      (u) => (u.email === email || u.phone === email) && u.password === password
    );

    if (!user) {
      setError(t("login_error_invalid")); 
      return;
    }

    setError(null);
    saveCurrentUser(user);
    onLogin && onLogin(user);
  };

  return (
    <div className="card">

      <h2>{t("login")}</h2>

      <input
        type="text"
        placeholder={t("phone_or_email")}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        type="password"
        placeholder={t("password")}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      {error && <p className="error">{error}</p>}

      <button onClick={handleLogin}>{t("login")}</button>

      <p
        className="forgot"
        style={{ marginTop: 8, cursor: "pointer", opacity: 0.85 }}
        onClick={() => setShowForgot(true)}
      >
        {t("forgot_password")}
      </p>

      {showForgot && <ForgotPasswordModal onClose={() => setShowForgot(false)} />}
    </div>
  );
}
