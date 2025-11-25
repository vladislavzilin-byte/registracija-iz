import React, { useState } from "react";
import { getUsers, saveCurrentUser } from "../utils/storage";
import ForgotPasswordModal from "./ForgotPasswordModal";

export default function Login({ onLogin }) {
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
      setError("Неверный логин или пароль");
      return;
    }

    setError(null);
    saveCurrentUser(user);
    onLogin && onLogin(user);
  };

  return (
    <div className="card">
      <h2>Вход</h2>

      <input
        type="text"
        placeholder="Email или телефон"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        type="password"
        placeholder="Пароль"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      {error && <p className="error">{error}</p>}

      <button onClick={handleLogin}>Войти</button>

      <p className="forgot" style={{marginTop:8, cursor:'pointer', opacity:.85}} onClick={() => setShowForgot(true)}>
        Забыли пароль?
      </p>

      {showForgot && <ForgotPasswordModal onClose={() => setShowForgot(false)} />}
    </div>
  );
}
