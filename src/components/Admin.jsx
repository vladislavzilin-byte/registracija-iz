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
userEmail: form.email || null,   // ←←←←← ЭТА СТРОКА
  userLang: localStorage.getItem("lang") || "lt", // ← и эта для правильного языка письма
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

const formatPrice = (value) => {
  if (value == null || value === "") return "0.00";
  const num = Number(value) || 0;
  return num.toFixed(2);
};

export default function Admin() {
  const me = getCurrentUser();
  const isAdmin = me && (me.role === "admin" || ADMINS.includes(me.email));
  const { t } = useI18n();

  if (!isAdmin) {
    return (
      <div className="card">
        <h3>{t("admin_access_denied_title")}</h3>
        <p className="muted">{t("admin_access_denied_text")}</p>
      </div>
    );
  }

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
  const [statusFilter, setStatusFilter] = useState("all");
  const [toast, setToast] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const updateSettings = (patch) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    saveSettings(next);
  };

  useEffect(() => {
    const handler = () => setBookings(getBookings());
    window.addEventListener("profileUpdated", handler);
    return () => window.removeEventListener("profileUpdated", handler);
  }, []);

  useEffect(() => {
    setPage(1);
    setOpenId(null);
  }, [search, statusFilter]);

  const stats = useMemo(() => {
    const total = bookings.length;
    const active = bookings.filter(
      (b) => b.status === "approved" || b.status === "pending"
    ).length;
    const canceled = bookings.filter(
      (b) => b.status === "canceled_client" || b.status === "canceled_admin"
    ).length;
    return { total, active, canceled };
  }, [bookings]);

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
          matchStatus = ["canceled_client", "canceled_admin"].includes(
            b.status
          );
        }

        return matchQ && matchStatus;
      })
      .sort((a, b) => new Date(a.start) - new Date(b.start));
  }, [bookings, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
      setOpenId(null);
    }
  }, [page, totalPages]);

  const paginated = useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    return filtered.slice(startIndex, startIndex + pageSize);
  }, [filtered, page]);

  const groupedByDate = useMemo(() => {
    const byKey = new Map();
    paginated.forEach((b) => {
      const key = toInputDate(b.start);
      if (!byKey.has(key)) byKey.set(key, []);
      byKey.get(key).push(b);
    });

    return Array.from(byKey.entries()).map(([key, items]) => ({
      key,
      label: fmtDate(items[0].start),
      items,
    }));
  }, [paginated]);

  const updateBooking = (id, updater) => {
    const all = getBookings();
    const next = all.map((b) => (b.id === id ? updater(b) : b));
    saveBookings(next);
    setBookings(next);
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  const cancelByAdmin = (id) => {
    if (!confirm(t("admin_confirm_cancel"))) return;
    updateBooking(id, (b) => ({
      ...b,
      status: "canceled_admin",
      canceledAt: new Date().toISOString(),
    }));
    showToast(t("admin_toast_canceled"));
  };

  // НОВАЯ ЛОГИКА — ВСЁ ОТПРАВЛЯЕТСЯ ВСЕГДА ПРИ ПОДТВЕРЖДЕНИИ
  const approveByAdmin = async (id) => {
    updateBooking(id, (b) => ({
      ...b,
      status: "approved",
      approvedAt: new Date().toISOString(),
    }));

    const fresh = getBookings().find((b) => b.id === id);

    showToast(t("admin_toast_approved"));

    // Всегда отправляем письмо + SMS о подтверждении (даже если ещё не оплачено)
    await fetch("/api/mail/booking-confirmed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ booking: fresh }),
    }).catch(console.error);
  };

  // НОВАЯ ЛОГИКА — ОТДЕЛЬНОЕ ПИСЬМО ТОЛЬКО ПРИ СТАНОВЛЕНИИ ОПЛАЧЕННЫМ
  const togglePaid = async (id) => {
    updateBooking(id, (b) => ({ ...b, paid: !b.paid }));

    const fresh = getBookings().find((b) => b.id === id);

    showToast(t("admin_toast_payment_updated"));

    // Отправляем отдельное письмо + SMS только когда стало оплачено
    if (fresh.paid) {
      await fetch("/api/mail/booking-paid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking: fresh }),
      }).catch(console.error);
    }
  };

  const services = settings.serviceList || [];

  const updateServiceField = (index, field, value) => {
    const next = [...services];
    next[index] = {
      ...next[index],
      [field]:
        field === "duration" || field === "deposit"
          ? Number(value) || 0
          : value,
    };
    updateSettings({ serviceList: next });
  };

  const addService = () => {
    updateSettings({
      serviceList: [
        ...services,
        { name: t("admin_services_new_service"), duration: 60, deposit: 0 },
      ],
    });
  };

  const removeService = (index) => {
    if (services.length <= 1) return;
    updateSettings({
      serviceList: services.filter((_, i) => i !== index),
    });
  };

  const handleDownloadReceipt = (booking) => {
    downloadReceipt(booking, t);
  };

  return (
    <div className="col" style={{ gap: 16 }}>
      {/* === НАСТРОЙКИ (ГАРМОШКА) === */}
      <div style={{ width: "100%" }}>
        <div style={cardAurora}>
          <button
            onClick={() => setShowSettings(!showSettings)}
            style={headerToggle}
          >
            <span style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <Chevron open={showSettings} />
              <span style={{ fontWeight: 700 }}>
                {t("admin_settings_title")}
              </span>
            </span>
          </button>
          <div
            style={{
              maxHeight: showSettings ? 1200 : 0,
              overflow: "hidden",
              transition: "max-height .35s ease",
            }}
          >
            <div style={{ paddingTop: 10 }}>
              {/* ОСНОВНЫЕ НАСТРОЙКИ */}
              <div className="row" style={{ gap: 12 }}>
                <div className="col">
                  <label style={labelStyle}>{t("master_name")}</label>
                  <input
                    style={inputGlass}
                    value={settings.masterName}
                    onChange={(e) =>
                      updateSettings({ masterName: e.target.value })
                    }
                  />
                </div>
                <div className="col">
                  <label style={labelStyle}>{t("admin_phone")}</label>
                  <input
                    style={inputGlass}
                    value={settings.adminPhone}
                    onChange={(e) =>
                      updateSettings({ adminPhone: e.target.value })
                    }
                  />
                </div>
                <div className="col">
                  <label style={labelStyle}>IBAN (EUR)</label>
                  <input
                    style={inputGlass}
                    value={settings.adminIban || ""}
                    onChange={(e) =>
                      updateSettings({ adminIban: e.target.value })
                    }
                    placeholder="LT00 0000 0000 0000 0000"
                  />
                </div>
              </div>
              {/* РАБОЧЕЕ ВРЕМЯ */}
              <div
                className="row"
                style={{ gap: 12, marginTop: 12, marginBottom: 8 }}
              >
                <div className="col">
                  <label style={labelStyle}>{t("day_start")}</label>
                  <select
                    style={inputGlass}
                    value={settings.workStart}
                    onChange={(e) =>
                      updateSettings({ workStart: e.target.value })
                    }
                  >
                    {generateTimes(0, 12).map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div className="col">
                  <label style={labelStyle}>{t("day_end")}</label>
                  <select
                    style={inputGlass}
                    value={settings.workEnd}
                    onChange={(e) =>
                      updateSettings({ workEnd: e.target.value })
                    }
                  >
                    {generateTimes(12, 24).map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div className="col">
                  <label style={labelStyle}>{t("slot_minutes")}</label>
                  <select
                    style={inputGlass}
                    value={settings.slotMinutes}
                    onChange={(e) =>
                      updateSettings({
                        slotMinutes: parseInt(e.target.value, 10),
                      })
                    }
                  >
                    {[15, 30, 45, 60].map((m) => (
                      <option key={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>
              {/* УСЛУГИ */}
              <div
                style={{
                  marginTop: 18,
                  paddingTop: 14,
                  borderTop: "1px solid rgba(148,85,247,0.35)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 8,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>
                      {t("admin_services_title")}
                    </div>
                    <div style={{ opacity: 0.75, fontSize: 12 }}>
                      {t("admin_services_subtitle")}
                    </div>
                  </div>
                  <button style={btnPrimary} onClick={addService}>
                    + {t("admin_services_add_button")}
                  </button>
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    marginTop: 6,
                  }}
                >
                  {services.map((s, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1.4fr .7fr .7fr auto",
                        gap: 8,
                        alignItems: "center",
                      }}
                    >
                      <input
                        style={inputGlass}
                        value={s.name}
                        onChange={(e) =>
                          updateServiceField(idx, "name", e.target.value)
                        }
                      />
                      <div style={{ position: "relative" }}>
                        <input
                          style={{ ...inputGlass, paddingRight: 34 }}
                          type="number"
                          value={s.duration}
                          onChange={(e) =>
                            updateServiceField(idx, "duration", e.target.value)
                          }
                        />
                        <span
                          style={{
                            position: "absolute",
                            right: 10,
                            top: "50%",
                            transform: "translateY(-50%)",
                            fontSize: 12,
                            opacity: 0.75,
                            pointerEvents: "none",
                          }}
                        >
                          min
                        </span>
                      </div>
                      <div style={{ position: "relative" }}>
                        <input
                          style={{ ...inputGlass, paddingRight: 34 }}
                          type="number"
                          value={s.deposit}
                          onChange={(e) =>
                            updateServiceField(idx, "deposit", e.target.value)
                          }
                        />
                        <span
                          style={{
                            position: "absolute",
                            right: 10,
                            top: "50%",
                            transform: "translateY(-50%)",
                            fontSize: 12,
                            opacity: 0.75,
                            pointerEvents: "none",
                          }}
                        >
                          €
                        </span>
                      </div>
                      <button
                        onClick={() => removeService(idx)}
                        style={{
                          padding: "8px 10px",
                          borderRadius: 10,
                          background: "rgba(110,20,30,.35)",
                          border: "1px solid rgba(239,68,68,.7)",
                          color: "#fff",
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* === FINANSAI (ГАРМОШКА) === */}
      <div style={{ width: "100%" }}>
        <div style={cardAurora}>
          <button
            onClick={() => setShowFinance(!showFinance)}
            style={headerToggle}
          >
            <span style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <Chevron open={showFinance} />
              <span style={{ fontWeight: 700 }}>{t("finance_title")}</span>
            </span>
          </button>
          <div
            style={{
              maxHeight: showFinance ? 2000 : 0,
              overflow: "hidden",
              transition: "max-height .4s ease",
            }}
          >
            <div style={{ paddingTop: 10 }}>
              <FinancePanel
                bookings={bookings}
                serviceStyles={serviceStyles}
                onDownloadReceipt={handleDownloadReceipt}
              />
            </div>
          </div>
        </div>
      </div>

      {/* === ВСЕ ЗАПИСИ === */}
      <div style={{ width: "100%" }}>
        <div style={cardAurora}>
          <div style={topBar}>
            <div style={{ fontWeight: 700, fontSize: "1.05rem" }}>
              {t("admin_bookings_title")}
            </div>
          </div>

          {/* ПОИСК И ФИЛЬТРЫ */}
          <div
            style={{
              display: "flex",
              gap: 10,
              margin: "8px 0 12px",
              flexWrap: "wrap",
            }}
          >
            <input
              style={{ ...inputGlass, flex: "1 1 260px" }}
              placeholder={t("search_placeholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div style={segmented}>
              {[
                { v: "all", label: t("all") },
                { v: "active", label: t("active") },
                { v: "finished", label: t("finished") },
                { v: "canceled", label: t("canceled") },
              ].map((it) => (
                <button
                  key={it.v}
                  onClick={() => setStatusFilter(it.v)}
                  style={{
                    ...segBtn,
                    ...(statusFilter === it.v ? segActive : {}),
                  }}
                >
                  {it.label}
                </button>
              ))}
            </div>
          </div>

          {/* СТАТИСТИКА + ПАГИНАЦИЯ */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 8,
              fontSize: 11.5,
              marginBottom: 8,
            }}
          >
            <div>
              <span className="muted">{t("total")}: </span>
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
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 6,
                alignItems: "center",
              }}
            >
              <button
                style={{
                  ...btnBase,
                  padding: "4px 10px",
                  opacity: page <= 1 ? 0.4 : 1,
                  cursor: page <= 1 ? "default" : "pointer",
                }}
                disabled={page <= 1}
                onClick={() => page > 1 && setPage(page - 1)}
              >
                {t("admin_prev_page")}
              </button>
              <button
                style={{
                  ...btnBase,
                  padding: "4px 10px",
                  opacity: page >= totalPages ? 0.4 : 1,
                  cursor: page >= totalPages ? "default" : "pointer",
                }}
                disabled={page >= totalPages}
                onClick={() => page < totalPages && setPage(page + 1)}
              >
                {t("admin_next_page")}
              </button>
              <span className="muted">
                {t("admin_page_info", {
                  page,
                  totalPages,
                  count: filtered.length,
                })}
              </span>
            </div>
          </div>

          {/* СПИСОК ЗАПИСЕЙ */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
              marginTop: 8,
            }}
          >
            {groupedByDate.map(({ key, label, items }) => (
              <div
                key={key}
                style={{ display: "flex", flexDirection: "column", gap: 6 }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    padding: "4px 10px",
                    borderRadius: 999,
                    background:
                      "linear-gradient(90deg, rgba(15,23,42,0.98), rgba(24,24,27,0.95))",
                    fontSize: 12.5,
                  }}
                >
                  <span style={{ fontWeight: 600 }}>{label}</span>
                  <span className="muted">
                    {t("admin_day_count", { n: items.length })}
                  </span>
                </div>

                {items.map((b) => {
                  const inFuture = new Date(b.start) > new Date();
                  const servicesArr = Array.isArray(b.services)
                    ? b.services
                    : [];
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
                      {/* Заголовок записи (гармошка) */}
                      <button
                        type="button"
                        onClick={() => setOpenId(isOpen ? null : b.id)}
                        style={accordionRow}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            flexWrap: "wrap",
                            width: "100%",
                          }}
                        >
                          <div>{statusDot(b)}</div>
                          <span style={pillDate}>{fmtDate(b.start)}</span>
                          <span style={pillTime}>
                            {fmtTime(b.start)} – {fmtTime(b.end)}
                          </span>
                          {servicesArr.length > 0 && (
                            <span style={pillService}>
                              {servicesArr.join(", ")}
                            </span>
                          )}
                          <span style={pillPrice}>
                            €{formatPrice(b.price)}
                          </span>
                          <span style={pillId}>#{b.id.slice(0, 6)}</span>

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
                                border:
                                  b.status === "approved" ||
                                  b.status === "approved_paid"
                                    ? "1px solid rgba(34,197,94,0.85)"
                                    : "1px solid rgba(248,113,113,0.9)",
                                background:
                                  b.status === "approved" ||
                                  b.status === "approved_paid"
                                    ? "rgba(22,163,74,0.25)"
                                    : "rgba(127,29,29,0.6)",
                              }}
                            >
                              {b.status === "approved" ||
                              b.status === "approved_paid"
                                ? t("admin_status_confirmed")
                                : t("admin_status_unconfirmed")}
                            </span>

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
                              {paid
                                ? t("receipt_status_paid")
                                : t("receipt_status_unpaid")}
                            </span>

                            <div
                              style={{
                                transform: isOpen
                                  ? "rotate(180deg)"
                                  : "rotate(0deg)",
                                transition: "transform .25s ease",
                              }}
                            >
                              <Chevron open={isOpen} />
                            </div>
                          </span>
                        </div>
                      </button>

                      {/* Раскрытая часть */}
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
                          {/* Дата/время + квитанция */}
                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: 10,
                              alignItems: "center",
                            }}
                          >
                            <div>{statusDot(b)}</div>

                            <div style={{ minWidth: 140 }}>
                              <div style={{ fontSize: 12, opacity: 0.8 }}>
                                {t("date")}
                              </div>
                              <input
                                type="date"
                                value={toInputDate(b.start)}
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
                                    const ne = new Date(ns.getTime() + Math.max(duration, 15 * 60000));
                                    return { ...orig, start: ns, end: ne };
                                  });
                                }}
                              />
                            </div>

                            <div style={{ minWidth: 110 }}>
                              <div style={{ fontSize: 12, opacity: 0.8 }}>
                                {t("admin_time_from")}
                              </div>
                              <input
                                type="time"
                                value={toInputTime(b.start)}
                                style={{
                                  ...inputGlass,
                                  height: 32,
                                  padding: "6px 10px",
                                }}
                                onChange={(e) => {
                                  const [hh, mm] = e.target.value.split(":").map(Number);
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

                            <div style={{ minWidth: 110 }}>
                              <div style={{ fontSize: 12, opacity: 0.8 }}>
                                {t("admin_time_to")}
                              </div>
                              <input
                                type="time"
                                value={toInputTime(b.end)}
                                style={{
                                  ...inputGlass,
                                  height: 32,
                                  padding: "6px 10px",
                                }}
                                onChange={(e) => {
                                  const [hh, mm] = e.target.value.split(":").map(Number);
                                  updateBooking(b.id, (orig) => {
                                    const st = new Date(orig.start);
                                    let ne = new Date(st);
                                    ne.setHours(hh, mm);
                                    if (ne <= st) ne.setTime(st.getTime() + 15 * 60000);
                                    return { ...orig, end: ne };
                                  });
                                }}
                              />
                            </div>

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
                                  onClick={() => handleDownloadReceipt(b)}
                                >
                                  📄 {t("admin_download_receipt")}
                                </button>
                              )}
                              <div
                                style={{
                                  opacity: 0.7,
                                  fontSize: 11,
                                  marginTop: 4,
                                }}
                              >
                                {t("admin_receipt_number_short")}{" "}
                                <b>#{b.id.slice(0, 6)}</b>
                              </div>
                            </div>
                          </div>

                          {/* Услуги */}
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
                                {b.paid
                                  ? t("receipt_status_paid")
                                  : t("receipt_status_unpaid")}
                              </span>
                            </div>

                            <div
                              style={{
                                display: "flex",
                                gap: 8,
                                alignItems: "center",
                              }}
                            >
                              <span style={{ minWidth: 90 }}>
                                {t("receipt_advance_label")} (€):
                              </span>
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
                              {b.paid
                                ? t("admin_mark_unpaid_button")
                                : t("admin_mark_paid_button")}
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
                                ? t("pending")
                                : b.status.includes("canceled")
                                ? t("canceled")
                                : t("approved")}
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
                              {b.paid
                                ? t("receipt_status_paid")
                                : t("receipt_status_unpaid")}
                            </span>
                          </div>

                          {/* Кнопки действий */}
                          <div
                            style={{
                              display: "flex",
                              gap: 10,
                              marginTop: 8,
                              flexWrap: "wrap",
                            }}
                          >
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
                                {t("cancel")}
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}

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
      </div>
    </div>
  );
}

/* === ВСПОМОГАТЕЛЬНЫЕ КОМПОНЕНТЫ И СТИЛИ === */
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

function generateTimes(start, end) {
  const res = [];
  for (let h = start; h < end; h++) {
    for (let m = 0; m < 60; m += 30) {
      res.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return res;
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
  padding: "14px 18px",
  border: "1px solid rgba(168,85,247,0.25)",
  background: "rgba(25,10,45,0.55)",
  color: "#fff",
  cursor: "pointer",
};

const labelStyle = { fontSize: 12, opacity: 0.8, marginBottom: 6 };

const inputGlass = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  color: "#fff",
  border: "1px solid rgba(168,85,247,0.35)",
  background: "rgba(17,0,40,0.45)",
};

const topBar = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "4px 2px 10px 2px",
};

const btnBase = {
  borderRadius: 10,
  padding: "8px 14px",
  fontWeight: 600,
  cursor: "pointer",
  border: "1px solid rgba(168,85,247,0.45)",
  background: "rgba(25,10,45,0.35)",
  color: "#fff",
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
    "linear-gradient(180deg, rgba(110,60,190,0.9), rgba(60,20,110,0.9))",
  border: "1px solid rgba(180,95,255,0.7)",
  boxShadow: "0 0 12px rgba(150,90,255,0.3)",
};

const receiptBtn = {
  padding: "6px 10px",
  borderRadius: 8,
  background: "rgba(15,23,42,0.9)",
  border: "1px solid rgba(148,163,184,0.7)",
  color: "#e5e7eb",
  fontSize: 12,
};

const accordionRow = {
  width: "100%",
  borderRadius: 999,
  padding: "2px 4px",
  border: "none",
  background: "transparent",
  color: "#fff",
  cursor: "pointer",
};

const pillBase = {
  padding: "4px 8px",
  borderRadius: 999,
  border: "1px solid rgba(148,163,184,0.6)",
  background: "rgba(15,23,42,0.95)",
  fontSize: 12,
  whiteSpace: "nowrap",
};

const pillDate = { ...pillBase, border: "1px solid rgba(129,140,248,0.85)" };
const pillTime = { ...pillBase, border: "1px solid rgba(94,234,212,0.8)" };
const pillService = { ...pillBase, border: "1px solid rgba(244,114,182,0.85)" };
const pillPrice = { ...pillBase, border: "1px solid rgba(34,197,94,0.9)" };
const pillId = { ...pillBase, border: "1px solid rgba(251,146,60,0.9)" };

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

const downloadReceipt = (b, t) => {
  try {
    const win = window.open("", "_blank", "width=700,height=900");
    if (!win) return;

    const shortId = b.id.slice(0, 6);
    const dateStr = fmtDate(b.start);
    const timeStr = `${fmtTime(b.start)} – ${fmtTime(b.end)}`;
    const createdStr = b.createdAt
      ? new Date(b.createdAt).toLocaleString("lt-LT")
      : new Date(b.start).toLocaleString("lt-LT");
    const servicesStr = (b.services || []).join(", ") || "—";
    const paidLabel = isPaid(b)
      ? t("receipt_status_paid")
      : t("receipt_status_unpaid");

    const vcard = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      "N:Žilina;Irina;;;",
      "FN:Irina Žilina",
      "ORG:IZ HAIR TREND",
      "TEL;TYPE=CELL,VOICE:+37060128458",
      "EMAIL;TYPE=WORK:info@izhairtrend.lt",
      "URL:https://izhairtrend.lt",
      "ADR;TYPE=WORK:;;Sodo g. 2a;Klaipeda;;;LT",
      "NOTE:Šukuosenų meistrė",
      "END:VCARD",
    ].join("\n");

    const qrUrl =
      "https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=" +
      encodeURIComponent(vcard);

    const html = `<!doctype html>
<html>
<head>
  <meta charSet="utf-8" />
  <title>${t("receipt_title")} #${shortId}</title>
  <style>
    body {font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;background: #0b0217;color: #f9fafb;margin: 0;padding: 24px;}
    .wrap {max-width: 640px;margin: 0 auto;border-radius: 16px;border: 1px solid rgba(168,85,247,0.5);background: radial-gradient(circle at top left, rgba(168,85,247,0.2), transparent 55%), radial-gradient(circle at bottom right, rgba(56,189,248,0.15), transparent 60%), rgba(15,23,42,0.95);padding: 24px 28px 28px;}
    .sub {font-size: 13px;opacity: 0.75;}
    .title {margin-top: 16px;font-size: 20px;font-weight: 700;}
    .top-row {display: flex;justify-content: space-between;align-items: flex-start;gap: 16px;}
    .top-left {text-align: left;}
    .top-right {text-align: right;font-size: 12px;opacity: 0.9;}
    .section {margin-top: 16px;padding-top: 10px;border-top: 1px dashed rgba(148,163,184,0.5);font-size: 14px;}
    .row {display: flex;justify-content: space-between;gap: 12px;margin: 4px 0;}
    .label {opacity: 0.8;}
    .value {font-weight: 500;text-align: right;}
    .services {margin-top: 8px;display: flex;flex-wrap: wrap;gap: 6px;}
    .tag {padding: 4px 10px;border-radius: 999px;border: 1px solid rgba(168,85,247,0.7);background: rgba(30,64,175,0.35);font-size: 12px;}
    .footer {margin-top: 18px;font-size: 11px;opacity: 0.75;line-height: 1.5;}
    .qr-label {font-size: 11px;margin-top: 4px;opacity: 0.8;}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="top-row">
      <div class="top-left">
        <img src="/logo2.svg" style="height:100px; margin-bottom:6px;" />
        <div class="sub">${t("receipt_subtitle")}</div>
      </div>
      <div class="top-right">
        ${t("receipt_number_label")} <b>#${shortId}</b><br/>
        ${t("receipt_created_label")} ${createdStr}<br/>
        <img src="${qrUrl}" alt="IZ HAIR TREND vCard" style="margin-top:10px;border-radius:10px;border:1px solid rgba(148,163,184,0.6);padding:6px;background:rgba(15,23,42,0.9);width:90px;height:90px;"/>
        <div class="qr-label">${t("receipt_qr_hint")}</div>
      </div>
    </div>
    <div class="title">${t("receipt_title")}</div>
    <div class="section">
      <div class="row"><div class="label">${t("receipt_client_label")}</div><div class="value">${b.userName || "-"}</div></div>
      <div class="row"><div class="label">${t("receipt_phone_label")}</div><div class="value">${b.userPhone || "-"}</div></div>
      <div class="row"><div class="label">${t("receipt_email_label")}</div><div class="value">${b.userEmail || "-"}</div></div>
    </div>
    <div class="section">
      <div class="row"><div class="label">${t("receipt_date_label")}</div><div class="value">${dateStr}</div></div>
      <div class="row"><div class="label">${t("receipt_time_label")}</div><div class="value">${timeStr}</div></div>
      <div class="row"><div class="label">${t("receipt_services_label")}</div><div class="value">${servicesStr}</div></div>
      <div class="services">
        ${(b.services || []).map((s) => `<span class="tag">${s}</span>`).join("")}
      </div>
    </div>
    <div class="section">
      <div class="row"><div class="label">${t("receipt_advance_label")}</div><div class="value">${b.price ? `${b.price} €` : "—"}</div></div>
      <div class="row"><div class="label">${t("receipt_payment_status_label")}</div><div class="value">${paidLabel}</div></div>
    </div>
    <div class="footer">${t("receipt_footer_text")}</div>
  </div>
  <script>
    window.focus();
    setTimeout(function(){ window.print(); }, 400);
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
