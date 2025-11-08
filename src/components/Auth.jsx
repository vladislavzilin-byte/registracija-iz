import { useState, useEffect } from "react";
import {
  getUsers,
  saveUsers,
  setCurrentUser,
  getCurrentUser,
} from "../lib/storage";
import ForgotPasswordModal from "./ForgotPasswordModal";
import { useI18n } from "../lib/i18n";

export default function Auth({ onAuth }) {
  const { t } = useI18n();
  const [mode, setMode] = useState("login");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [instagram, setInstagram] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recoverOpen, setRecoverOpen] = useState(false);
  const [current, setCurrent] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const normalizePhone = (p) => (p || "").replace(/\D/g, "");
  const normalizeEmail = (e) => (e || "").trim().toLowerCase();

  useEffect(() => {
    const user = getCurrentUser();
    setCurrent(user);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    const users = getUsers() || [];

    if (mode === "register") {
      if (!name.trim() || !password || !phone) {
        setError(t("fill_all_fields") || "Заполните все поля");
        return;
      }

      const existing = users.find(
        (u) =>
          normalizePhone(u.phone) === normalizePhone(phone) ||
          (u.email && normalizeEmail(u.email) === normalizeEmail(email))
      );

      if (existing) {
        setError(t("user_exists") || "Такой пользователь уже существует");
        return;
      }

      const newUser = {
        name: name.trim(),
        instagram,
        phone,
        email,
        password,
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
    const normalizedIdPhone = normalizePhone(id);
    const normalizedIdEmail = normalizeEmail(id);

    const foundUser = users.find((u) => {
      const phoneMatch =
        normalizePhone(u.phone) === normalizedIdPhone && !!normalizedIdPhone;
      const emailMatch =
        normalizeEmail(u.email) === normalizedIdEmail && !!normalizedIdEmail;
      return (phoneMatch || emailMatch) && u.password === password;
    });

    if (!foundUser) {
      setError(t("invalid_credentials") || "Неверный логин или пароль");
      return;
    }

    setCurrentUser(foundUser);
    setCurrent(foundUser);
    onAuth?.(foundUser);
  };

  const logout = () => {
    setCurrentUser(null);
    setCurrent(null);
    onAuth?.(null);
  };

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
              <input
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="+3706... / email"
              />
              <label>{t("password")}</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                >
                  {showPassword ? t("hide") : t("show")}
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
              <label>{t("password")}</label>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
              />
            </>
          )}

          {error && (
            <div
              style={{
                color: "rgb(255,150,150)",
                fontSize: "0.9rem",
                marginTop: 6,
              }}
            >
              {error}
            </div>
          )}

          <div style={{ marginTop: 12 }}>
            <button type="submit" disabled={isSubmitting}>
              {mode === "login" ? t("login") : t("register")}
            </button>
          </div>
        </form>

        <div
          style={{
            marginTop: 8,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ opacity: 0.9, fontSize: "0.9rem" }}>{t("or")}</div>
          <button
            onClick={() => setRecoverOpen(true)}
            style={{ fontSize: "0.85rem" }}
          >
            {t("forgot_password")}
          </button>
        </div>
      </div>

      <ForgotPasswordModal
        open={recoverOpen}
        onClose={() => setRecoverOpen(false)}
      />
    </>
  );
}
