// src/components/MyBookings.jsx
import { useEffect, useMemo, useState } from "react";
import { getUsers, saveUsers, setCurrentUser, getCurrentUser } from "../lib/storage";
import { useI18n } from "../lib/i18n";

/**
 * Пометки:
 * - Профиль по умолчанию свёрнут. Клик по заголовку раскрывает/сворачивает.
 * - При сохранении показываем модалку "Профиль обновлён".
 * - Кнопки — матовые, без переливов, soft-glow в стиле хедера.
 * - Кнопка "Обновить" удалена (по просьбе).
 */

export default function MyBookings() {
  const { t } = useI18n();
  const [current, setCurrent] = useState(getCurrentUser());
  const [expanded, setExpanded] = useState(false);
  const [showSavedModal, setShowSavedModal] = useState(false);

  // Поля формы профиля
  const [name, setName] = useState(current?.name || "");
  const [instagram, setInstagram] = useState(current?.instagram || "");
  const [phone, setPhone] = useState(current?.phone || "");
  const [email, setEmail] = useState(current?.email || "");
  const [password, setPassword] = useState("");

  // Фильтр записей
  const [filter, setFilter] = useState("all"); // all | active | cancelled
  const bookings = useMemo(() => Array.isArray(current?.bookings) ? current.bookings : [], [current]);
  const filteredBookings = useMemo(() => {
    if (filter === "active") return bookings.filter(b => !b.cancelled);
    if (filter === "cancelled") return bookings.filter(b => b.cancelled);
    return bookings;
  }, [bookings, filter]);

  // Синхронизируемся с текущим пользователем если он меняется извне
  useEffect(() => {
    const u = getCurrentUser();
    setCurrent(u);
    if (u) {
      setName(u.name || "");
      setInstagram(u.instagram || "");
      setPhone(u.phone || "");
      setEmail(u.email || "");
      // пароль не подставляем обратно в инпут
    }
  }, []);

  const handleSave = () => {
    const users = getUsers() || [];
    let updatedUser = { ...(current || {}) };

    updatedUser.name = name.trim();
    updatedUser.instagram = instagram.trim();
    updatedUser.phone = phone.trim();
    updatedUser.email = email.trim();

    // Если пользователь хранил незахешированный пароль ранее — перезапишем plain (совместимость)
    if (password.trim()) {
      updatedUser.password = password;
    }

    // Обновим запись в массиве
    const idx = users.findIndex(
      u =>
        (u.email && updatedUser.email && u.email.toLowerCase() === updatedUser.email.toLowerCase()) ||
        (u.phone && updatedUser.phone && `${u.phone}` === `${updatedUser.phone}`)
    );
    if (idx >= 0) {
      users[idx] = { ...users[idx], ...updatedUser };
    } else {
      users.push(updatedUser);
    }

    saveUsers(users);
    setCurrentUser(updatedUser);
    setCurrent(updatedUser);

    // Поп-ап "сохранено"
    setShowSavedModal(true);
  };

  // ——— Стили ———
  const styles = {
    sectionCard: {
      background: "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 16,
      padding: 14,
      boxShadow: "0 8px 30px rgba(0,0,0,0.35)",
      backdropFilter: "blur(6px)",
    },
    headerRow: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
      cursor: "pointer",
      userSelect: "none",
      padding: "4px 4px 8px",
    },
    hTitle: { fontWeight: 700, fontSize: "1.05rem" },
    chevronBtn: {
      minWidth: 36,
      height: 32,
      borderRadius: 10,
      border: "1px solid rgba(168,85,247,0.35)",
      background: "rgba(25,10,45,0.6)",
      color: "#fff",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: "0 0 10px rgba(150,90,255,0.15)",
      transition: ".25s",
    },
    collapseWrap: {
      overflow: "hidden",
      transition: "max-height .4s ease, opacity .35s ease, filter .35s ease",
      maxHeight: expanded ? 1200 : 0,
      opacity: expanded ? 1 : 0,
      filter: expanded ? "blur(0)" : "blur(1px)",
    },
    row: { display: "grid", gap: 10, gridTemplateColumns: "1fr", marginTop: 10 },
    input: {
      width: "100%",
      height: 40,
      borderRadius: 12,
      padding: "10px 12px",
      color: "#fff",
      border: "1px solid rgba(168,85,247,0.35)",
      background: "rgba(17,0,40,0.45)",
      outline: "none",
      transition: ".2s",
    },
    saveBtn: {
      width: "100%",
      height: 44,
      marginTop: 8,
      borderRadius: 12,
      border: "1px solid rgba(168,85,247,0.45)",
      background: "rgba(31,0,63,0.55)",
      color: "#fff",
      fontWeight: 600,
      letterSpacing: "0.2px",
      boxShadow: "0 0 14px rgba(168,85,247,0.25)",
      cursor: "pointer",
      transition: ".25s",
    },
    // Чипы фильтров
    chipRow: { display: "flex", gap: 10, margin: "14px 0" },
    chip: (active) => ({
      borderRadius: 12,
      padding: "10px 16px",
      border: `1px solid rgba(168,85,247,${active ? 0.9 : 0.35})`,
      background: active ? "rgba(31,0,63,0.6)" : "rgba(25,10,45,0.5)",
      color: "#fff",
      cursor: "pointer",
      fontWeight: 600,
      boxShadow: active ? "0 0 18px rgba(150,90,255,0.4)" : "none",
      transition: ".2s",
    }),
    table: {
      width: "100%",
      borderCollapse: "collapse",
      borderRadius: 12,
      overflow: "hidden",
    },
    th: {
      textAlign: "left",
      padding: "12px 10px",
      color: "rgba(255,255,255,0.7)",
      fontWeight: 600,
      borderBottom: "1px solid rgba(255,255,255,0.08)",
      background: "rgba(255,255,255,0.02)",
    },
    td: {
      padding: "12px 10px",
      borderBottom: "1px solid rgba(255,255,255,0.06)",
    },
    statusDot: (ok) => ({
      display: "inline-block",
      width: 9,
      height: 9,
      borderRadius: "50%",
      marginRight: 8,
      background: ok ? "#22c55e" : "#ef4444",
      boxShadow: ok ? "0 0 10px rgba(34,197,94,0.6)" : "0 0 10px rgba(239,68,68,0.5)",
    }),
    // Модальное окно
    backdrop: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.6)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 3000,
      animation: "fadeIn .18s ease",
    },
    modal: {
      width: 360,
      maxWidth: "90vw",
      padding: "18px 18px 14px",
      borderRadius: 16,
      background: "linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))",
      border: "1px solid rgba(168,85,247,0.26)",
      boxShadow: "0 12px 40px rgba(168,85,247,0.2)",
      textAlign: "center",
      color: "#fff",
      backdropFilter: "blur(10px)",
      animation: "popIn .16s ease",
    },
    modalBtn: {
      marginTop: 12,
      height: 38,
      borderRadius: 10,
      border: "1px solid rgba(168,85,247,0.45)",
      background: "rgba(31,0,63,0.6)",
      color: "#fff",
      fontWeight: 600,
      padding: "6px 14px",
      cursor: "pointer",
      width: "100%",
    },
    sectionTitle: { fontSize: "1.05rem", fontWeight: 700, marginBottom: 8 },
  };

  // Анимации (1 раз)
  useEffect(() => {
    const s = document.createElement("style");
    s.innerHTML = `
      @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
      @keyframes popIn { from { opacity: .0; transform: translateY(-6px) } to { opacity: 1; transform: translateY(0) } }
    `;
    document.head.appendChild(s);
    return () => { try { document.head.removeChild(s); } catch(e){} };
  }, []);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* ——— Профиль ——— */}
      <div style={styles.sectionCard}>
        <div
          style={styles.headerRow}
          onClick={() => setExpanded((v) => !v)}
          aria-label="Toggle profile"
        >
          <div style={styles.hTitle}>{t?.("my_profile") || "Мой профиль"}</div>
          <button style={styles.chevronBtn}>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#b78cff"
              strokeWidth="1.8"
              style={{ transform: `rotate(${expanded ? 180 : 0}deg)`, transition: ".25s" }}
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
        </div>

        <div style={styles.collapseWrap} aria-hidden={!expanded}>
          <div style={styles.row}>
            <label>
              {t?.("name") || "Имя"}
              <input style={styles.input} value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label>
              Instagram
              <input
                style={styles.input}
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                placeholder="@handle"
              />
            </label>
            <label>
              {t?.("phone") || "Телефон"}
              <input style={styles.input} value={phone} onChange={(e) => setPhone(e.target.value)} />
            </label>
            <label>
              Email
              <input style={styles.input} value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label>
              {t?.("password") || "Пароль"}
              <input
                style={styles.input}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="•••••••"
              />
            </label>

            <button style={styles.saveBtn} onClick={handleSave}>
              {t?.("save") || "Сохранить"}
            </button>
          </div>
        </div>
      </div>

      {/* ——— Мои записи ——— */}
      <div style={styles.sectionCard}>
        <div style={styles.sectionTitle}>{t?.("my_bookings") || "Мои записи"}</div>

        {/* Chips */}
        <div style={styles.chipRow}>
          <button style={styles.chip(filter === "all")} onClick={() => setFilter("all")}>
            {t?.("all") || "Все"}
          </button>
          <button style={styles.chip(filter === "active")} onClick={() => setFilter("active")}>
            {t?.("active") || "Активные"}
          </button>
          <button style={styles.chip(filter === "cancelled")} onClick={() => setFilter("cancelled")}>
            {t?.("cancelled") || "Отменённые"}
          </button>
        </div>

        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>{t?.("date") || "Дата"}</th>
              <th style={styles.th}>{t?.("time") || "Время"}</th>
              <th style={styles.th}>{t?.("status") || "Статус"}</th>
            </tr>
          </thead>
          <tbody>
            {filteredBookings.length === 0 && (
              <tr>
                <td style={styles.td} colSpan={3}>&nbsp;{t?.("no_bookings") || "Нет записей"}</td>
              </tr>
            )}
            {filteredBookings.map((b, i) => (
              <tr key={i}>
                <td style={styles.td}>{b.date || "-"}</td>
                <td style={styles.td}>{b.time || "-"}</td>
                <td style={styles.td}>
                  <span style={styles.statusDot(!b.cancelled)} />
                  {b.cancelled ? (t?.("cancelled") || "Отменённая") : (t?.("confirmed") || "Подтверждена")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ——— Модалка "Сохранено" ——— */}
      {showSavedModal && (
        <div style={styles.backdrop} onClick={() => setShowSavedModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>✅ {t?.("saved") || "Профиль обновлён"}</div>
            <div style={{ opacity: 0.8 }}>
              {t?.("saved_desc") || "Ваши изменения сохранены успешно."}
            </div>
            <button style={styles.modalBtn} onClick={() => setShowSavedModal(false)}>
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
