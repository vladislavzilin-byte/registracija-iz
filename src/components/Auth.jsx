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

// корректная логика LT телефона
const formatLithuanianPhone = (value) => {
  let digits = value.replace(/\D/g, "");
  if (!digits.startsWith("370")) {
    digits = "370" + digits.replace(/^0+/, "");
  }
  if (digits.length > 11) digits = digits.slice(0, 11);
  return "+" + digits;
};

/* ===== simple login rate-limit (per browser) ===== */
const RATE_KEY = "auth_rate_limit_iz";
const MAX_ATTEMPTS = 5;
const BLOCK_MS = 5 * 60 * 1000; // 5 минут

function loadRateState() {
  if (typeof window === "undefined") return { attempts: 0, blockedUntil: 0 };
  try {
    const raw = localStorage.getItem(RATE_KEY);
    if (!raw) return { attempts: 0, blockedUntil: 0 };
    const obj = JSON.parse(raw);
    return {
      attempts: obj.attempts || 0,
      blockedUntil: obj.blockedUntil || 0,
    };
  } catch {
    return { attempts: 0, blockedUntil: 0 };
  }
}

function saveRateState(state) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(RATE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

/* ===================== Reset / Forgot Password Modal ===================== */
function ForgotPasswordModal({ open, onClose, onPasswordChanged }) {
  const { t, lang } = useI18n(); // ← t + lang

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

  /* =====================================================
     STEP 1 — SEND CODE
  ===================================================== */
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
          lang, // ← язык отправляем на сервер
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

  /* =====================================================
     STEP 2 — VERIFY CODE & CHANGE PASSWORD
  ===================================================== */
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

      const users = getUsers() || [];
      const hash = await sha256(newPwd);

      let updatedUser = null;
      const updatedUsers = users.map((u) => {
        if (
          u.email &&
          u.email.toLowerCase() === String(emailForReset).toLowerCase()
        ) {
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
      setTimeout(() => {
        handleClose();
      }, 1200);
    } catch (e) {
      console.error(e);
      setError(t("auth_invalid_or_expired_code"));
    } finally {
      setLoading(false);
    }
  };

  /* =====================================================
     UI
  ===================================================== */
  return (
    <div style={overlayStyle} onClick={handleClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ color: "#fff", marginBottom: 12 }}>
          {t("auth_recover_title")}
        </h3>

        {step === "identify" && (
          <>
            <p
              style={{
                margin: "0 0 10px 0",
                fontSize: 14,
                color: "#cbd5f5",
                opacity: 0.9,
              }}
            >
              {t("auth_reset_step1_text")}
            </p>

            <input
              type="text"
              placeholder={t("phone_or_email")}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              style={inputStyle}
            />

            {error && (
              <div style={{ color: "#ff9bbb", marginTop: 10 }}>{error}</div>
            )}
            {msg && (
              <div style={{ color: "#a5f3fc", marginTop: 8 }}>{msg}</div>
            )}

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
            <p
              style={{
                margin: "0 0 8px 0",
                fontSize: 14,
                color: "#cbd5f5",
                opacity: 0.9,
              }}
            >
              {t("auth_reset_step2_text")}
            </p>
            <p
              style={{
                margin: "0 0 10px 0",
                fontSize: 13,
                color: "#9ca3af",
              }}
            >
              {t("auth_code_sent_to")}{" "}
              <span style={{ color: "#e5e7eb", fontWeight: 500 }}>
                {emailForReset}
              </span>
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

            {error && (
              <div style={{ color: "#ff9bbb", marginTop: 10 }}>{error}</div>
            )}
            {msg && (
              <div style={{ color: "#a5f3fc", marginTop: 8 }}>{msg}</div>
            )}

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

function Auth({ onAuth }) {
  const { t } = useI18n();

  const [mode, setMode] = useState("login");

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  const [name, setName] = useState("");
  const [instagram, setInstagram] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [error, setError] = useState("");
  const [errorFields, setErrorFields] = useState({});

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [current, setCurrent] = useState(null);

  const [toast, setToast] = useState("");
  const [recoverOpen, setRecoverOpen] = useState(false);

  const [rateState, setRateState] = useState({
    attempts: 0,
    blockedUntil: 0,
  });

  useEffect(() => {
    const cu = getCurrentUser();
    if (cu) setCurrent(cu);
  }, []);

  useEffect(() => {
    const s = loadRateState();
    setRateState(s);
  }, []);

  const isBlocked =
    rateState.blockedUntil && Date.now() < Number(rateState.blockedUntil);

  const updateRateState = (updater) => {
    setRateState((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      saveRateState(next);
      return next;
    });
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2200);
  };

  const resetErrors = () => {
    setError("");
    setErrorFields({});
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrent(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    resetErrors();

    if (mode === "login") {
      const fields = {};
      if (!identifier.trim()) fields.identifier = true;
      if (!password) fields.password = true;

      if (Object.keys(fields).length) {
        setErrorFields(fields);
        setError(t("auth_err_identifier") || "Введите логин и пароль");
        return;
      }

      if (isBlocked) {
        const msLeft = rateState.blockedUntil - Date.now();
        const minutesLeft = Math.ceil(msLeft / 60000);
        setError(
          t("auth_rate_limited") ||
            `Слишком много попыток. Попробуйте через ~${minutesLeft} мин.`
        );
        return;
      }

      const users = getUsers() || [];
      const id = identifier.trim();
      const phoneNorm = normalizePhone(id);
      const emailNorm = id.toLowerCase();

      const user = users.find((u) => {
        const phoneMatch =
          u.phone && normalizePhone(u.phone) === phoneNorm && !!phoneNorm;
        const emailMatch = u.email && u.email.toLowerCase() === emailNorm;
        return phoneMatch || emailMatch;
      });

      if (!user) {
        setError(t("auth_user_not_found") || "Пользователь не найден");
        setErrorFields({ identifier: true });
        updateRateState((prev) => {
          const attempts = prev.attempts + 1;
          const blockedUntil =
            attempts >= MAX_ATTEMPTS ? Date.now() + BLOCK_MS : prev.blockedUntil;
          return { attempts, blockedUntil };
        });
        return;
      }

      try {
        let loggedUser = user;
        const usersAll = [...users];

        if (user.passwordHash) {
          const hash = await sha256(password);
          if (hash !== user.passwordHash) {
            setError(t("auth_wrong_password") || "Неверный пароль");
            setErrorFields({ password: true });
            updateRateState((prev) => {
              const attempts = prev.attempts + 1;
              const blockedUntil =
                attempts >= MAX_ATTEMPTS
                  ? Date.now() + BLOCK_MS
                  : prev.blockedUntil;
              return { attempts, blockedUntil };
            });
            return;
          }
        } else if (user.password) {
          // старый аккаунт с plaintext паролем
          if (user.password !== password) {
            setError(t("auth_wrong_password") || "Неверный пароль");
            setErrorFields({ password: true });
            updateRateState((prev) => {
              const attempts = prev.attempts + 1;
              const blockedUntil =
                attempts >= MAX_ATTEMPTS
                  ? Date.now() + BLOCK_MS
                  : prev.blockedUntil;
              return { attempts, blockedUntil };
            });
            return;
          }
          // конвертируем в hash
          const newHash = await sha256(password);
          const updatedUsers = usersAll.map((u) => {
            if (u === user) {
              const nu = { ...u, passwordHash: newHash };
              delete nu.password;
              loggedUser = nu;
              return nu;
            }
            return u;
          });
          saveUsers(updatedUsers);
        } else {
          setError(t("auth_wrong_password") || "Неверный пароль");
          setErrorFields({ password: true });
          updateRateState((prev) => {
            const attempts = prev.attempts + 1;
            const blockedUntil =
              attempts >= MAX_ATTEMPTS
                ? Date.now() + BLOCK_MS
                : prev.blockedUntil;
            return { attempts, blockedUntil };
          });
          return;
        }

        // success
        updateRateState({ attempts: 0, blockedUntil: 0 });
        setCurrentUser(loggedUser);
        setCurrent(loggedUser);
        onAuth?.(loggedUser);
        setIdentifier("");
        setPassword("");
        showToast(t("auth_login_success") || t("login"));
      } catch (err) {
        console.error(err);
        setError(t("auth_generic_error") || "Ошибка входа");
      }

      return;
    }

    // ================= REGISTER =================
    const fields = {};
    if (!name.trim()) fields.name = true;
    if (!email.trim() || !validateEmail(email.trim())) fields.email = true;
    if (!normalizePhone(phone)) fields.phone = true;
    if (password.length < 6) fields.password = true;
    if (password !== passwordConfirm) fields.passwordConfirm = true;

    if (Object.keys(fields).length) {
      setErrorFields(fields);
      setError(
        t("auth_err_form") || "Проверьте корректность заполнения полей."
      );
      return;
    }

    const users = getUsers() || [];
    const emailNorm = email.trim().toLowerCase();
    const phoneNorm = normalizePhone(phone);

    if (
      users.some(
        (u) => u.email && u.email.toLowerCase() === emailNorm
      )
    ) {
      setErrorFields((prev) => ({ ...prev, email: true }));
      setError(t("auth_email_exists") || "Такой email уже зарегистрирован.");
      return;
    }

    if (
      users.some(
        (u) => u.phone && normalizePhone(u.phone) === phoneNorm
      )
    ) {
      setErrorFields((prev) => ({ ...prev, phone: true }));
      setError(t("auth_phone_exists") || "Этот телефон уже используется.");
      return;
    }

    try {
      const hash = await sha256(password);
      const newUser = {
        id: Date.now(),
        name: name.trim(),
        instagram: instagram.trim(),
        email: email.trim(),
        phone,
        passwordHash: hash,
      };

      const updatedUsers = [...users, newUser];
      saveUsers(updatedUsers);
      setCurrentUser(newUser);
      setCurrent(newUser);
      onAuth?.(newUser);

      setName("");
      setInstagram("");
      setEmail("");
      setPhone("");
      setPassword("");
      setPasswordConfirm("");
      setError("");
      setErrorFields({});

      showToast(t("auth_register_success") || t("register"));
    } catch (err) {
      console.error(err);
      setError(t("auth_generic_error") || "Ошибка регистрации");
    }
  };

  /* ================= AUTH UI ================= */

  // Если пользователь уже авторизован — показываем профиль
  if (current) {
    return (
      <>
        {toast && <div style={toastStyle}>{toast}</div>}

        <div style={profileCard}>
          <div style={auroraBg} />
          <div style={borderGlow} />

          <div
            style={{
              position: "relative",
              zIndex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 18,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={avatarStyle}>
                {(current.name || "?").charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={nameStyle}>{current.name || t("name")}</div>
                {current.phone && (
                  <div style={contactStyle}>{current.phone}</div>
                )}
                {current.email && (
                  <div style={contactStyle}>{current.email}</div>
                )}
                {current.instagram && (
                  <div style={contactStyle}>{current.instagram}</div>
                )}
              </div>
            </div>

            <button style={logoutButton} onClick={handleLogout}>
              {t("logout") || "Выйти"}
            </button>
          </div>
        </div>
      </>
    };
  }

  // Форма логина / регистрации
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
          setCurrent(user);
          setCurrentUser(user);
          onAuth?.(user);
          showToast(t("auth_reset_success"));
        }}
      />
    </>
  );
}

export default Auth;

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
  background:
    "linear-gradient(180deg, rgba(32,18,45,1) 0%, rgba(22,10,33,1) 100%)",
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
  right: 10,
  top: "50%",
  transform: "translateY(-50%)",
  cursor: "pointer",
  fontSize: 18,
  opacity: 0.85,
};

const eyeOpen = "👁";
const eyeClosed = "🙈";
