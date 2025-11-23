import { useState, useMemo, useEffect } from "react";
import {
  getSettings,
  saveSettings,
  getBookings,
  saveBookings,
  fmtDate,
  fmtTime,
  getCurrentUser,
} from "../lib/storage";
import { useI18n } from "../lib/i18n";
import FinancePanel from "./FinancePanel";

const ADMINS = ["irina.abramova7@gmail.com", "vladislavzilin@gmail.com"];

const DEFAULT_SERVICES = [
  { name: "Šukuosena", duration: 60, deposit: 50 },
  { name: "Tresų nuoma", duration: 15, deposit: 25 },
  { name: "Papuošalų nuoma", duration: 15, deposit: 10 },
  { name: "Atvykimas", duration: 180, deposit: 50 },
  { name: "Konsultacija", duration: 30, deposit: 10 },
];

const serviceStyles = {
  Šukuosena: {
    bg: "rgba(99,102,241,0.16)",
    border: "1px solid rgba(129,140,248,0.8)",
  },
  "Tresų nuoma": {
    bg: "rgba(56,189,248,0.16)",
    border: "1px solid rgba(56,189,248,0.8)",
  },
  "Papuošalų nuoma": {
    bg: "rgba(245,158,11,0.14)",
    border: "1px solid rgba(245,158,11,0.9)",
  },
  Atvykimas: {
    bg: "rgba(248,113,113,0.14)",
    border: "1px solid rgba(248,113,113,0.9)",
  },
  Konsultacija: {
    bg: "rgba(34,197,94,0.14)",
    border: "1px solid rgba(34,197,94,0.9)",
  },
};

const formatPrice = (value) => {
  if (value == null || value === "") return "0.00";
  const num = Number(value) || 0;
  return num.toFixed(2);
};

// оплачено — либо новое поле paid, либо старый статус approved_paid
const isPaid = (b) => !!(b?.paid || b?.status === "approved_paid");

const pad2 = (n) => String(n).padStart(2, "0");

const toInputDate = (dateLike) => {
  const d = new Date(dateLike);
  if (isNaN(d)) return "";
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};

const toInputTime = (dateLike) => {
  const d = new Date(dateLike);
  if (isNaN(d)) return "";
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
};

function Admin() {
  const me = getCurrentUser();
  const isAdmin = me && (me.role === "admin" || ADMINS.includes(me.email));

  if (!isAdmin) {
    return (
      <div className="card">
        <h3>Доступ запрещён</h3>
        <p className="muted">Эта страница доступна только администраторам.</p>
      </div>
    );
  }

  const { t } = useI18n();

  // === НАСТРОЙКИ И СОСТОЯНИЯ ===
  const [settings, setSettings] = useState(() => {
    const s = getSettings();
    if (!Array.isArray(s.serviceList) || !s.serviceList.length) {
      s.serviceList = [...DEFAULT_SERVICES];
      saveSettings(s);
    }
    return s;
  });

  const [bookings, setBookings] = useState(getBookings());
  const [showSettings, setShowSettings] = useState(false);
  const [showFinance, setShowFinance] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // all | active | finished | canceled
  const [openId, setOpenId] = useState(null); // раскрытая запись
  const [toast, setToast] = useState(null);

  const updateSettings = (patch) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    saveSettings(next);
  };

  // синк записей при обновлении профиля
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === "bookings_v1") {
        setBookings(getBookings());
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const stats = useMemo(() => {
    const total = bookings.length;
    const active = bookings.filter(
      (b) =>
        ["pending", "approved", "approved_paid"].includes(b.status) &&
        new Date(b.end || b.start) >= new Date()
    ).length;
    const canceled = bookings.filter((b) =>
      String(b.status).includes("canceled")
    ).length;
    return { total, active, canceled };
  }, [bookings]);

  // === ФИЛЬТР СПИСКА ===
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    const now = new Date();

    return bookings
      .filter((b) => {
        const matchQ =
          !q ||
          b.userName?.toLowerCase().includes(q) ||
          b.userPhone?.toLowerCase().includes(q) ||
          b.userInstagram?.toLowerCase().includes(q);

        let matchStatus = true;

        if (statusFilter === "active") {
          matchStatus =
            ["pending", "approved", "approved_paid"].includes(b.status) &&
            new Date(b.start) >= now;
        } else if (statusFilter === "finished") {
          matchStatus =
            ["approved", "approved_paid"].includes(b.status) &&
            new Date(b.end || b.start) < now;
        } else if (statusFilter === "canceled") {
          matchStatus = String(b.status).includes("canceled");
        }

        return matchQ && matchStatus;
      })
      .sort((a, b) => new Date(a.start) - new Date(b.start));
  }, [bookings, search, statusFilter]);

  const updateBooking = (id, updater) => {
    setBookings((prev) => {
      const next = prev.map((b) => (b.id === id ? updater(b) : b));
      saveBookings(next);
      return next;
    });
  };

  const setStatus = (id, statusPatch) => {
    updateBooking(id, (b) => ({ ...b, ...statusPatch }));
  };

  const approveByAdmin = (id) => {
    updateBooking(id, (b) => ({
      ...b,
      status: isPaid(b) ? "approved_paid" : "approved",
    }));
    showToast("Запись подтверждена");
  };

  const cancelByAdmin = (id) => {
    if (!window.confirm("Точно отменить запись?")) return;
    updateBooking(id, (b) => ({
      ...b,
      status: `${b.status || "pending"}_canceled_by_admin`,
    }));
    showToast("Запись отменена");
  };

  const togglePaid = (id) => {
    updateBooking(id, (b) => {
      const nextPaid = !isPaid(b);
      let status = b.status;
      if (["approved", "approved_paid"].includes(b.status)) {
        status = nextPaid ? "approved_paid" : "approved";
      }
      return { ...b, paid: nextPaid, status };
    });
    showToast("Статус оплаты обновлён");
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const handleExport = () => {
    const data = JSON.stringify(bookings, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bookings-export.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!Array.isArray(data)) throw new Error("Invalid data");
        saveBookings(data);
        setBookings(data);
        showToast("Импортировано");
      } catch (err) {
        alert("Ошибка импорта");
      }
    };
    reader.readAsText(file);
  };

  const today = new Date();

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        padding: "16px 10px 32px",
      }}
    >
      <div style={{ width: "100%", maxWidth: 1180 }}>
        <div
          style={{
            marginBottom: 14,
            display: "flex",
            justifyContent: "space-between",
            gap: 10,
            alignItems: "center",
          }}
        >
          <button
            style={headerToggle}
            onClick={() => setShowSettings((v) => !v)}
          >
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: 13,
                  opacity: 0.8,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                Панель администратора
              </div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>
                {showSettings ? "Настройки сервиса" : "Все записи"}
              </div>
            </div>
            <div
              style={{
                padding: "4px 10px",
                borderRadius: 999,
                border: "1px solid rgba(148,163,184,0.65)",
                background: "rgba(15,23,42,0.9)",
                fontSize: 12,
              }}
            >
              {today.toLocaleDateString("lt-LT", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              })}
            </div>
            <div style={{ marginLeft: 6 }}>
              <Chevron open={showSettings} />
            </div>
          </button>

          <button
            style={headerToggleSmall}
            onClick={() => setShowFinance((v) => !v)}
          >
            <span style={{ fontSize: 13, fontWeight: 500 }}>Finansai</span>
            <div style={{ marginLeft: 6 }}>
              <Chevron open={showFinance} />
            </div>
          </button>
        </div>

        {showFinance && (
          <div style={{ marginBottom: 14 }}>
            <FinancePanel bookings={bookings} />
          </div>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: showSettings ? "minmax(0,1fr)" : "minmax(0,1.3fr) minmax(0,1.1fr)",
            gap: 16,
          }}
        >
          {/* ЛЕВАЯ ЧАСТЬ — СПИСОК */}
          <div style={cardAurora}>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 10,
                alignItems: "center",
              }}
            >
              <div style={{ flex: 1, minWidth: 220 }}>
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>
                  {t("all_records")}
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <div className="muted" style={{ fontSize: 12.5 }}>
                    Сегодня: {fmtDate(new Date())}
                  </div>
                  <div
                    style={{
                      padding: "3px 10px",
                      borderRadius: 999,
                      background: "rgba(15,23,42,0.9)",
                      border: "1px solid rgba(148,163,184,0.4)",
                      fontSize: 12,
                    }}
                  >
                    Всего: {stats.total}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <div
                  style={{
                    fontSize: 11.5,
                    padding: "3px 10px",
                    borderRadius: 999,
                    background: "rgba(22,101,52,0.35)",
                    border: "1px solid rgba(34,197,94,0.75)",
                  }}
                >
                  Активных: {stats.active}
                </div>
                <div
                  style={{
                    fontSize: 11.5,
                    padding: "3px 10px",
                    borderRadius: 999,
                    background: "rgba(127,29,29,0.50)",
                    border: "1px solid rgba(248,113,113,0.8)",
                  }}
                >
                  Отменённых: {stats.canceled}
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: 12,
                display: "flex",
                flexWrap: "wrap",
                gap: 10,
                alignItems: "center",
              }}
            >
              <input
                type="text"
                placeholder="Поиск по имени, телефону или Instagram"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setOpenId(null);
                }}
                style={{
                  ...inputGlass,
                  flex: 1,
                  minWidth: 220,
                  paddingLeft: 12,
                  paddingRight: 12,
                }}
              />

              <div style={segmented}>
                <button
                  style={{
                    ...segBtn,
                    ...(statusFilter === "all" ? segActive : segInactive),
                  }}
                  onClick={() => setStatusFilter("all")}
                >
                  Все
                </button>
                <button
                  style={{
                    ...segBtn,
                    ...(statusFilter === "active" ? segActive : segInactive),
                  }}
                  onClick={() => setStatusFilter("active")}
                >
                  Активные
                </button>
                <button
                  style={{
                    ...segBtn,
                    ...(statusFilter === "finished" ? segActive : segInactive),
                  }}
                  onClick={() => setStatusFilter("finished")}
                >
                  Завершённые
                </button>
                <button
                  style={{
                    ...segBtn,
                    ...(statusFilter === "canceled" ? segActive : segInactive),
                  }}
                  onClick={() => setStatusFilter("canceled")}
                >
                  Отменённые
                </button>
              </div>
            </div>

            <div
              style={{
                marginTop: 10,
                display: "flex",
                justifyContent: "space-between",
                gap: 8,
                flexWrap: "wrap",
                fontSize: 11.5,
              }}
            >
              <div>
                <span className="muted">{t("total_all")}: </span>
                {stats.total}
                <span className="muted"> · </span>
                <span className="muted">
                  {t("total_active")}: {stats.active}
                </span>
                <span className="muted"> · </span>
                <span className="muted">
                  {t("total_canceled")}: {stats.canceled}
                </span>
              </div>

              <div style={{ display: "flex", gap: 6 }}>
                <label style={exportLabel}>
                  <span>Import</span>
                  <input
                    type="file"
                    accept="application/json"
                    style={{ display: "none" }}
                    onChange={handleImport}
                  />
                </label>
                <button style={exportBtn} onClick={handleExport}>
                  Export
                </button>
              </div>
            </div>

          {/* СПИСОК ЗАПИСЕЙ — ГАРМОШКА */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
              marginTop: 12,
            }}
          >
            {filtered.map((b) => {
              const inFuture = new Date(b.start) > new Date();
              const startDate = new Date(b.start);
              const endDate = new Date(b.end || b.start);
              const servicesArr = Array.isArray(b.services) ? b.services : [];
              const paid = isPaid(b);
              const isOpen = openId === b.id;

              const serviceTagStyle = (name) => ({
                padding: "4px 12px",
                borderRadius: 999,
                fontSize: 13,
                ...(serviceStyles[name] || {
                  bg: "rgba(148,163,184,0.15)",
                  border: "1px solid rgba(148,163,184,0.7)",
                }),
                background: (serviceStyles[name] || {}).bg,
                border: (serviceStyles[name] || {}).border,
              });

              return (
                <div
                  key={b.id}
                  style={{
                    borderRadius: 16,
                    border: "1px solid rgba(88,28,135,0.7)",
                    background: "rgba(10,6,25,0.9)",
                    padding: 8,
                    boxShadow: "0 0 16px rgba(88,28,135,0.55)",
                  }}
                >
                  {/* ОДНА СТРОКА */}
                  <button
                    type="button"
                    onClick={() => setOpenId(isOpen ? null : b.id)}
                    style={accordionRow}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        flexWrap: "wrap",
                        width: "100%",
                      }}
                    >
                      <div>{statusDot(b)}</div>

                      {/* Дата */}
                      <span style={pillDate}>{fmtDate(b.start)}</span>

                      {/* Время диапазон */}
                      <span style={pillTime}>
                        {fmtTime(b.start)} – {fmtTime(b.end)}
                      </span>

                      {/* Телефон */}
                      {b.userPhone && (
                        <span style={pillPhone}>{b.userPhone}</span>
                      )}

                      {/* Услуги */}
                      {servicesArr.length > 0 && (
                        <span style={pillService}>
                          {servicesArr.join(", ")}
                        </span>
                      )}

                      {/* Цена */}
                      <span style={pillPrice}>
                        €{formatPrice(b.price)}
                      </span>

                      {/* ID */}
                      <span style={pillId}>#{b.id.slice(0, 6)}</span>

                      {/* Справа: статус оплаты + стрелка */}
                      <span
                        style={{
                          marginLeft: "auto",
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 11,
                            padding: "3px 8px",
                            borderRadius: 999,
                            border: paid
                              ? "1px solid rgba(34,197,94,0.85)"
                              : "1px solid rgba(248,113,113,0.9)",
                            background: paid
                              ? "rgba(22,163,74,0.25)"
                              : "rgba(127,29,29,0.6)",
                          }}
                        >
                          {paid ? "Оплачено" : "Не оплачено"}
                        </span>

                        <div
                          style={{
                            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                            transition: "transform .25s ease",
                          }}
                        >
                          <Chevron open={isOpen} />
                        </div>
                      </span>
                    </div>
                  </button>

                  {/* РАСКРЫТАЯ КАРТОЧКА */}
                  {isOpen && (
                    <div
                      style={{
                        marginTop: 10,
                        borderRadius: 14,
                        border: "1px solid rgba(168,85,247,0.35)",
                        background: "rgba(15,10,25,0.95)",
                        padding: "14px 16px",
                        display: "flex",
                        flexDirection: "column",
                        gap: 10,
                      }}
                    >
                      {/* ВЕРХНЯЯ СТРОКА */}
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 10,
                          alignItems: "center",
                        }}
                      >
                        <div>{statusDot(b)}</div>

                        {/* Дата */}
                        <div style={{ minWidth: 140 }}>
                          <div style={{ fontSize: 12, opacity: 0.8 }}>Дата</div>
                          <input
                            type="date"
                            value={toInputDate(startDate)}
                            style={{
                              ...inputGlass,
                              height: 32,
                              padding: "6px 10px",
                            }}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (!val) return;
                              const [y, m, d] = val.split("-").map(Number);
                              updateBooking(b.id, (orig) => {
                                const st = new Date(orig.start);
                                const en = new Date(orig.end || orig.start);
                                const duration = en - st;
                                const ns = new Date(orig.start);
                                ns.setFullYear(y, m - 1, d);
                                const ne = new Date(
                                  ns.getTime() + Math.max(duration, 15 * 60000)
                                );
                                return { ...orig, start: ns, end: ne };
                              });
                            }}
                          />
                        </div>

                        {/* Время от */}
                        <div style={{ minWidth: 110 }}>
                          <div style={{ fontSize: 12, opacity: 0.8 }}>
                            Время от
                          </div>
                          <input
                            type="time"
                            value={toInputTime(startDate)}
                            style={{
                              ...inputGlass,
                              height: 32,
                              padding: "6px 10px",
                            }}
                            onChange={(e) => {
                              const [hh, mm] = e.target.value
                                .split(":")
                                .map(Number);
                              updateBooking(b.id, (orig) => {
                                const ns = new Date(orig.start);
                                ns.setHours(hh, mm);
                                const ne = new Date(orig.end || orig.start);
                                if (ne <= ns) {
                                  ne.setTime(ns.getTime() + 15 * 60000);
                                }
                                return { ...orig, start: ns, end: ne };
                              });
                            }}
                          />
                        </div>

                        {/* Время до */}
                        <div style={{ minWidth: 110 }}>
                          <div style={{ fontSize: 12, opacity: 0.8 }}>
                            Время до
                          </div>
                          <input
                            type="time"
                            value={toInputTime(endDate)}
                            style={{
                              ...inputGlass,
                              height: 32,
                              padding: "6px 10px",
                            }}
                            onChange={(e) => {
                              const [hh, mm] = e.target.value
                                .split(":")
                                .map(Number);
                              updateBooking(b.id, (orig) => {
                                const st = new Date(orig.start);
                                let ne = new Date(st);
                                ne.setHours(hh, mm);
                                if (ne <= st)
                                  ne.setTime(st.getTime() + 15 * 60000);
                                return { ...orig, end: ne };
                              });
                            }}
                          />
                        </div>

                        {/* Правый блок: время + квитанция */}
                        <div
                          style={{
                            marginLeft: "auto",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "flex-end",
                          }}
                        >
                          <div style={{ opacity: 0.8, fontSize: 13 }}>
                            {fmtTime(b.start)} – {fmtTime(b.end)}
                          </div>

                          {paid && (
                            <button
                              type="button"
                              style={receiptBtn}
                              onClick={() => downloadReceipt(b)}
                            >
                              📄 Скачать квитанцию
                            </button>
                          )}

                          {/* Номер квитанции */}
                          <div
                            style={{
                              opacity: 0.7,
                              fontSize: 11,
                              marginTop: 4,
                            }}
                          >
                            Nr. kvitancii: <b>#{b.id.slice(0, 6)}</b>
                          </div>
                        </div>
                      </div>

                      {/* Бейджи услуг */}
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 8,
                          marginTop: 4,
                        }}
                      >
                        {servicesArr.map((s, i) => (
                          <span key={i} style={serviceTagStyle(s)}>
                            {s}
                          </span>
                        ))}
                      </div>

                      {/* Клиент */}
                      <div style={{ marginTop: 6 }}>
                        <b>{b.userName}</b>
                        <div style={{ opacity: 0.8 }}>{b.userPhone}</div>
                        {b.userInstagram && (
                          <div style={{ opacity: 0.8 }}>
                            @{b.userInstagram}
                          </div>
                        )}
                      </div>

                      {/* Блок оплаты */}
                      <div
                        style={{
                          marginTop: 6,
                          padding: "10px 12px",
                          borderRadius: 10,
                          border: "1px solid rgba(148,163,184,0.25)",
                          background: "rgba(30,20,40,0.55)",
                          display: "flex",
                          flexDirection: "column",
                          gap: 6,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            gap: 8,
                            alignItems: "center",
                          }}
                        >
                          <span
                            style={{
                              width: 10,
                              height: 10,
                              borderRadius: "50%",
                              background: b.paid ? "#22c55e" : "#ef4444",
                              boxShadow: b.paid
                                ? "0 0 8px rgba(34,197,94,0.9)"
                                : "0 0 8px rgba(248,113,113,0.9)",
                            }}
                          />
                          <span
                            style={{
                              color: b.paid ? "#bbf7d0" : "#fecaca",
                              fontWeight: 600,
                            }}
                          >
                            {b.paid ? "Apmokėta" : "Neapmokėta"}
                          </span>
                        </div>

                        {/* Цена / аванс */}
                        <div
                          style={{
                            display: "flex",
                            gap: 8,
                            alignItems: "center",
                          }}
                        >
                          <span style={{ minWidth: 90 }}>Avansas (€):</span>
                          <input
                            type="number"
                            value={b.price ?? ""}
                            style={{
                              ...inputGlass,
                              maxWidth: 120,
                              height: 32,
                            }}
                            onChange={(e) => {
                              const v = e.target.value;
                              updateBooking(b.id, (orig) => ({
                                ...orig,
                                price: v === "" ? null : Number(v),
                              }));
                            }}
                          />
                        </div>

                        <button
                          onClick={() => togglePaid(b.id)}
                          style={{
                            marginTop: 6,
                            width: "100%",
                            padding: 8,
                            borderRadius: 8,
                            border: "1px solid rgba(148,163,184,0.5)",
                            background: "rgba(0,0,0,0.25)",
                            color: "#fff",
                          }}
                        >
                          {b.paid ? "Снять оплату" : "Пометить оплаченной"}
                        </button>
                      </div>

                      {/* Статусы */}
                      <div style={{ marginTop: 6 }}>
                        <span
                          style={{
                            padding: "4px 10px",
                            borderRadius: 999,
                            fontSize: 12,
                            marginRight: 6,
                            background:
                              b.status === "pending"
                                ? "rgba(250,204,21,0.14)"
                                : b.status.includes("canceled")
                                ? "rgba(248,113,113,0.12)"
                                : "rgba(22,163,74,0.18)",
                            border:
                              b.status === "pending"
                                ? "1px solid rgba(234,179,8,0.9)"
                                : b.status.includes("canceled")
                                ? "1px solid rgba(248,113,113,0.9)"
                                : "1px solid rgba(34,197,94,0.9)",
                          }}
                        >
                          {b.status === "pending"
                            ? "Ожидает подтверждения"
                            : b.status.includes("canceled")
                            ? "Отменено"
                            : "Подтверждено"}
                        </span>

                        <span
                          style={{
                            padding: "4px 10px",
                            borderRadius: 999,
                            fontSize: 12,
                            background: b.paid
                              ? "rgba(22,163,74,0.18)"
                              : "rgba(127,29,29,0.45)",
                            border: b.paid
                              ? "1px solid rgba(34,197,94,0.9)"
                              : "1px solid rgba(248,113,113,0.9)",
                            marginLeft: 6,
                          }}
                        >
                          {b.paid ? "Оплачено" : "Не оплачено"}
                        </span>
                      </div>

                      {/* Кнопки действий */}
                      <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                        {b.status === "pending" && (
                          <button
                            onClick={() => approveByAdmin(b.id)}
                            style={btnPrimary}
                          >
                            {t("approve")}
                          </button>
                        )}

                        {!b.status.includes("canceled") && inFuture && (
                          <button
                            onClick={() => cancelByAdmin(b.id)}
                            style={{
                              ...btnBase,
                              background: "rgba(110,20,30,.35)",
                              border: "1px solid rgba(239,68,68,.6)",
                              color: "#fff",
                            }}
                          >
                            {t("rejected")}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {!filtered.length && (
              <small className="muted" style={{ marginTop: 20 }}>
                {t("no_records")}
              </small>
            )}
          </div>

          {toast && (
            <div className="toast" style={{ marginTop: 10 }}>
              {toast}
            </div>
          )}
        </div>

        {/* ПРАВАЯ ЧАСТЬ — НАСТРОЙКИ */}
        <div style={cardAurora}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h3 style={{ margin: 0 }}>Настройки</h3>
            <div
              style={{
                padding: "3px 10px",
                borderRadius: 999,
                border: "1px solid rgba(148,163,184,0.5)",
                fontSize: 11,
                background: "rgba(15,23,42,0.9)",
              }}
            >
              Admin
            </div>
          </div>

          {!showSettings && (
            <div style={{ marginTop: 12 }} className="muted">
              Разверните верхний переключатель, чтобы изменить список услуг,
              время до автоматической отмены и другие настройки.
            </div>
          )}

          {showSettings && (
            <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Список услуг */}
              <div>
                <div style={labelStyle}>Paslaugos</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {settings.serviceList.map((s, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        gap: 8,
                        alignItems: "center",
                        flexWrap: "wrap",
                      }}
                    >
                      <input
                        type="text"
                        value={s.name}
                        onChange={(e) => {
                          const val = e.target.value;
                          updateSettings({
                            serviceList: settings.serviceList.map((item, i) =>
                              i === idx ? { ...item, name: val } : item
                            ),
                          });
                        }}
                        style={{ ...inputGlass, flex: 2, minWidth: 120 }}
                      />
                      <input
                        type="number"
                        value={s.duration}
                        onChange={(e) => {
                          const val = Number(e.target.value) || 0;
                          updateSettings({
                            serviceList: settings.serviceList.map((item, i) =>
                              i === idx ? { ...item, duration: val } : item
                            ),
                          });
                        }}
                        style={{ ...inputGlass, width: 80 }}
                        placeholder="Min"
                      />
                      <input
                        type="number"
                        value={s.deposit}
                        onChange={(e) => {
                          const val = Number(e.target.value) || 0;
                          updateSettings({
                            serviceList: settings.serviceList.map((item, i) =>
                              i === idx ? { ...item, deposit: val } : item
                            ),
                          });
                        }}
                        style={{ ...inputGlass, width: 80 }}
                        placeholder="€"
                      />
                      <button
                        style={{
                          ...btnBase,
                          padding: "6px 10px",
                          borderColor: "rgba(239,68,68,0.7)",
                          background: "rgba(127,29,29,0.6)",
                        }}
                        onClick={() =>
                          updateSettings({
                            serviceList: settings.serviceList.filter(
                              (_, i) => i !== idx
                            ),
                          })
                        }
                      >
                        ×
                      </button>
                    </div>
                  ))}

                  <button
                    style={{
                      ...btnBase,
                      padding: "6px 10px",
                      alignSelf: "flex-start",
                    }}
                    onClick={() =>
                      updateSettings({
                        serviceList: [
                          ...settings.serviceList,
                          { name: "", duration: 60, deposit: 0 },
                        ],
                      })
                    }
                  >
                    + Pridėti paslaugą
                  </button>
                </div>
              </div>

              {/* Время до автотмены */}
              <div>
                <div style={labelStyle}>Auto-cancel laikas (valandomis)</div>
                <input
                  type="number"
                  value={settings.autoCancelHours ?? ""}
                  onChange={(e) =>
                    updateSettings({
                      autoCancelHours:
                        e.target.value === ""
                          ? null
                          : Math.max(1, Number(e.target.value) || 1),
                    })
                  }
                  style={{ ...inputGlass, width: 120 }}
                  placeholder="24"
                />
                <div className="muted" style={{ marginTop: 4, fontSize: 12 }}>
                  Po šio laiko nepatvirtintos rezervacijos gali būti
                  automatiškai atšauktos.
                </div>
              </div>

              {/* Дополнительные настройки позже */}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* === ИКОНКА CHEVRON === */
function Chevron({ open }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#cbb6ff"
      strokeWidth="2"
    >
      {open ? <path d="M6 15l6-6 6 6" /> : <path d="M6 9l6 6 6-6" />}
    </svg>
  );
}

const cardAurora = {
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.035), rgba(255,255,255,0.02))",
  border: "1px solid rgba(168,85,247,0.18)",
  borderRadius: 16,
  padding: 14,
  boxShadow:
    "0 8px 30px rgba(0,0,0,0.35), inset 0 0 0 1px rgba(255,255,255,0.03)",
};

const headerToggle = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  gap: 10,
  borderRadius: 12,
  padding: "10px 14px",
  border: "1px solid rgba(168,85,247,0.4)",
  background:
    "radial-gradient(circle at top left, rgba(168,85,247,0.35), transparent 55%), rgba(15,23,42,0.96)",
  cursor: "pointer",
  color: "#fff",
};

const headerToggleSmall = {
  ...headerToggle,
  maxWidth: 180,
  padding: "8px 12px",
};

const inputGlass = {
  background: "rgba(15,23,42,0.96)",
  borderRadius: 10,
  border: "1px solid rgba(148,163,184,0.6)",
  padding: "7px 10px",
  color: "#fff",
  fontSize: 13,
};

const exportLabel = {
  ...inputGlass,
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  cursor: "pointer",
  fontSize: 11.5,
};

const exportBtn = {
  ...inputGlass,
  cursor: "pointer",
  fontSize: 11.5,
};

const labelStyle = { fontSize: 12, opacity: 0.8, marginBottom: 6 };

const btnBase = {
  borderRadius: 10,
  padding: "8px 14px",
  fontWeight: 600,
  cursor: "pointer",
  border: "1px solid rgba(168,85,247,0.45)",
  background: "rgba(25,10,45,0.35)",
  color: "#fff",
};

const accordionRow = {
  width: "100%",
  borderRadius: 999,
  padding: "6px 10px",
  border: "1px solid rgba(129,140,248,0.55)",
  background:
    "radial-gradient(circle at top left, rgba(79,70,229,0.35), transparent 55%), rgba(15,23,42,0.96)",
  color: "#fff",
  cursor: "pointer",
};

const pillBase = {
  padding: "3px 10px",
  borderRadius: 999,
  border: "1px solid rgba(148,163,184,0.6)",
  background: "rgba(15,23,42,0.95)",
  fontSize: 12,
  whiteSpace: "nowrap",
};

const pillDate = {
  ...pillBase,
  border: "1px solid rgba(129,140,248,0.85)",
};

const pillTime = {
  ...pillBase,
  border: "1px solid rgba(94,234,212,0.8)",
};

const pillPhone = {
  ...pillBase,
  border: "1px solid rgba(96,165,250,0.85)",
};

const pillService = {
  ...pillBase,
  border: "1px solid rgba(244,114,182,0.85)",
};

const pillPrice = {
  ...pillBase,
  border: "1px solid rgba(34,197,94,0.9)",
};

const pillId = {
  ...pillBase,
  border: "1px solid rgba(251,146,60,0.9)",
};

const btnPrimary = {
  ...btnBase,
  background:
    "linear-gradient(180deg, rgba(110,60,190,0.9), rgba(60,20,110,0.9))",
  border: "1px solid rgba(168,85,247,0.45)",
  boxShadow: "0 0 14px rgba(150,85,247,0.35)",
};

const segmented = {
  display: "flex",
  gap: 8,
  background: "rgba(17,0,40,0.45)",
  borderRadius: 12,
  padding: 6,
  border: "1px solid rgba(168,85,247,0.25)",
};

const segBtn = {
  ...btnBase,
  padding: "8px 12px",
};

const segActive = {
  background:
    "linear-gradient(135deg, rgba(129,140,248,0.95), rgba(236,72,153,0.95))",
  boxShadow: "0 0 14px rgba(168,85,247,0.6)",
};

const segInactive = {
  background: "rgba(15,23,42,0.9)",
  border: "1px solid rgba(148,163,184,0.45)",
  opacity: 0.85,
};

const receiptBtn = {
  padding: "6px 10px",
  borderRadius: 8,
  background: "rgba(15,23,42,0.9)",
  border: "1px solid rgba(148,163,184,0.7)",
  color: "#e5e7eb",
  fontSize: 12,
};

const lamp = (color) => ({
  width: 12,
  height: 12,
  borderRadius: "50%",
  background: color,
  boxShadow: `0 0 8px ${color}`,
});

const statusDot = (b) => {
  const paid = isPaid(b);
  if (["approved", "approved_paid"].includes(b.status))
    return <span style={lamp(paid ? "#22c55e" : "#f97316")} />;
  if (b.status === "pending") return <span style={lamp("#facc15")} />;
  return <span style={lamp("#ef4444")} />;
};

/* === ГЕНЕРАЦИЯ КВИТАНЦИИ === */
const downloadReceipt = (b) => {
  try {
    const win = window.open("", "_blank", "width=700,height=900");
    if (!win) return;

    const date = new Date(b.start);
    const dateStr = `${pad2(date.getDate())}.${pad2(
      date.getMonth() + 1
    )}.${date.getFullYear()}`;
    const timeStr = `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;

    const html = `<!DOCTYPE html>
<html lang="lt">
<head>
  <meta charset="UTF-8" />
  <title>Kvitancija</title>
  <style>
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Text",
        sans-serif;
      margin: 0;
      padding: 0;
      background: #0b1020;
      color: #e5e7eb;
    }

    .page {
      width: 100%;
      max-width: 720px;
      margin: 0 auto;
      padding: 24px 24px 40px;
      box-sizing: border-box;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }

    .logo {
      font-weight: 700;
      font-size: 20px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .logo span {
      background: linear-gradient(135deg, #c4b5fd, #f9a8d4);
      -webkit-background-clip: text;
      color: transparent;
    }

    .meta {
      text-align: right;
      font-size: 13px;
      opacity: 0.9;
    }

    .card {
      border-radius: 18px;
      border: 1px solid rgba(129, 140, 248, 0.45);
      background: radial-gradient(
          circle at top left,
          rgba(129, 140, 248, 0.24),
          transparent 55%
        ),
        #020617;
      padding: 18px 18px 20px;
      margin-bottom: 16px;
    }

    .row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 6px;
      font-size: 14px;
    }

    .label {
      opacity: 0.75;
    }

    .value {
      font-weight: 500;
    }

    .title {
      font-size: 16px;
      font-weight: 600;
      margin: 22px 0 12px;
    }

    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 4px;
    }

    .chip {
      border-radius: 999px;
      padding: 4px 10px;
      font-size: 12px;
      border: 1px solid rgba(148, 163, 184, 0.6);
      background: rgba(15, 23, 42, 0.9);
    }

    .footer {
      margin-top: 24px;
      font-size: 12px;
      opacity: 0.8;
      text-align: center;
    }

    .qr {
      margin-top: 18px;
      display: flex;
      justify-content: flex-end;
    }

    .qr-placeholder {
      width: 84px;
      height: 84px;
      border-radius: 16px;
      border: 1px dashed rgba(148, 163, 184, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      opacity: 0.75;
    }

    .qr-label {
      margin-top: 6px;
      font-size: 11px;
      opacity: 0.7;
      text-align: right;
    }

    .strong {
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div class="logo"><span>IZ HAIR TREND</span></div>
      <div class="meta">
        <div>Kvitancijos Nr.: <span class="strong">#${String(
          b.id
        ).slice(0, 6)}</span></div>
        <div>Data: ${dateStr}</div>
        <div>Laikas: ${timeStr}</div>
      </div>
    </div>

    <div class="card">
      <div class="row">
        <div class="label">Klientas:</div>
        <div class="value">${b.userName || "-"}</div>
      </div>
      <div class="row">
        <div class="label">Telefonas:</div>
        <div class="value">${b.userPhone || "-"}</div>
      </div>
      <div class="row">
        <div class="label">Instagram:</div>
        <div class="value">${b.userInstagram || "-"}</div>
      </div>
      <div class="row">
        <div class="label">Rezervacijos data:</div>
        <div class="value">${fmtDate(b.start)}</div>
      </div>
      <div class="row">
        <div class="label">Laikas:</div>
        <div class="value">${fmtTime(b.start)} – ${fmtTime(b.end)}</div>
      </div>
    </div>

    <div class="title">Paslaugos</div>
    <div class="card">
      <div class="row">
        <div class="label">Paslaugos tipas:</div>
        <div class="value">${
          Array.isArray(b.services) && b.services.length
            ? b.services.join(", ")
            : "Šukuosena"
        }</div>
      </div>
      <div class="row">
        <div class="label">Apmokėjimo statusas:</div>
        <div class="value">${
          b.paid || b.status === "approved_paid" ? "Apmokėta" : "Neapmokėta"
        }</div>
      </div>
      <div class="row">
        <div class="label">Avansas:</div>
        <div class="value">${b.price ? b.price.toFixed(2) : "0.00"} €</div>
      </div>
    </div>

    <div class="qr">
      <div>
        <div class="qr-placeholder">
          QR
        </div>

        <div class="qr-label">
          Skenuokite ir išsaugokite kontaktą
        </div>
      </div>
    </div>

    <div class="title">Kvitancija</div>

    <div class="section">
      <div class="row">
        <div class="label">Klientas:</div>
        <div class="value">${b.userName || "-"}</div>
      </div>
      <div class="row">
        <div class="label">Paslaugos:</div>
        <div class="value">${
          Array.isArray(b.services) && b.services.length
            ? b.services.join(", ")
            : "Šukuosena"
        }</div>
      </div>
      <div class="row">
        <div class="label">Bendra suma:</div>
        <div class="value">${b.price ? b.price.toFixed(2) : "0.00"} €</div>
      </div>
    </div>

    <div class="footer">
      Ši kvitancija sugeneruota elektroniniu būdu ir galioja be parašo.
    </div>
  </div>

  <script>
    window.addEventListener("load", function(){
      setTimeout(function(){
        window.print();
      }, 400);
    });
  </script>
</body>
</html>`;

    win.document.open();
    win.document.write(html);
    win.document.close();
  } catch (e) {
    console.error("Receipt error", e);
  }
};

export default Admin;
