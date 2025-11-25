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

// Default services (names remain user–editable, not translated)
const DEFAULT_SERVICES = [
  { name: "Šukuosena", duration: 60, deposit: 50 },
  { name: "Tresų nuoma", duration: 15, deposit: 25 },
  { name: "Papuošalų nuoma", duration: 15, deposit: 10 },
  { name: "Atvykimas", duration: 180, deposit: 50 },
  { name: "Konsultacija", duration: 30, deposit: 10 },
];

// Styles by service name (visual only)
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

// Payment check
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
  const { t } = useI18n();

  const me = getCurrentUser();
  const isAdmin = me && (me.role === "admin" || ADMINS.includes(me.email));

  if (!isAdmin) {
    return (
      <div className="card">
        <h3>{t("admin_access_denied")}</h3>
        <p className="muted">{t("admin_access_only_admin")}</p>
      </div>
    );
  }

  // === SETTINGS & STATE ===
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

  // Accordion open row
  const [openId, setOpenId] = useState(null);
  // Pagination
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

  // === STATISTICS ===
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

  // === FILTERED LIST ===
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
        } else {
          matchStatus = true;
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

  // Group records by date
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

  // === ACTIONS: CANCEL / APPROVE / PAYMENT ===
  const cancelByAdmin = (id) => {
    if (!confirm(t("admin_cancel_record_confirm"))) return;
    updateBooking(id, (b) => ({
      ...b,
      status: "canceled_admin",
      canceledAt: new Date().toISOString(),
    }));
    showToast(t("admin_record_canceled"));
  };

  const approveByAdmin = (id) => {
    updateBooking(id, (b) => ({
      ...b,
      status: "approved",
      approvedAt: new Date().toISOString(),
    }));
    showToast(t("admin_record_confirmed"));
  };

  const togglePaid = (id) => {
    updateBooking(id, (b) => ({ ...b, paid: !b.paid }));
    showToast(t("admin_payment_status_updated"));
  };

  // === SERVICE SETTINGS ===
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
        { name: t("admin_new_service"), duration: 60, deposit: 0 },
      ],
    });
  };

  const removeService = (index) => {
    if (services.length <= 1) return;
    updateSettings({
      serviceList: services.filter((_, i) => i !== index),
    });
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };
  return (
    <div className="col" style={{ gap: 16 }}>
      
      {/* === SETTINGS ACCORDION === */}
      <div style={{ width: "100%" }}>
        <div style={cardAurora}>
          <button
            onClick={() => setShowSettings(!showSettings)}
            style={headerToggle}
          >
            <span style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <Chevron open={showSettings} />
              <span style={{ fontWeight: 700 }}>{t("admin_edit_settings")}</span>
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
              
              {/* BASIC SETTINGS */}
              <div className="row" style={{ gap: 12 }}>
                
                {/* Master name */}
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

                {/* Admin phone */}
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

                {/* Admin IBAN */}
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

              {/* WORK TIME */}
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

              {/* SERVICES */}
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
                    <div style={{ fontWeight: 600 }}>{t("admin_services")}</div>
                    <div style={{ opacity: 0.75, fontSize: 12 }}>
                      {t("admin_services_sub")}
                    </div>
                  </div>

                  <button style={btnPrimary} onClick={addService}>
                    {t("admin_add_service")}
                  </button>
                </div>

                {/* SERVICES EDITOR */}
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
                      {/* NAME */}
                      <input
                        style={inputGlass}
                        value={s.name}
                        onChange={(e) =>
                          updateServiceField(idx, "name", e.target.value)
                        }
                      />

                      {/* DURATION + min */}
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

                      {/* DEPOSIT + € */}
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

                      {/* REMOVE BUTTON */}
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
      {/* === FINANCE PANEL === */}
      <div style={{ width: "100%" }}>
        <div style={cardAurora}>
          <button
            onClick={() => setShowFinance(!showFinance)}
            style={headerToggle}
          >
            <span style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <Chevron open={showFinance} />
              <span style={{ fontWeight: 700 }}>{t("admin_finance")}</span>
            </span>
          </button>

          <div
            style={{
              maxHeight: showFinance ? 1400 : 0,
              overflow: "hidden",
              transition: "max-height .35s ease",
            }}
          >
            <div style={{ paddingTop: 10 }}>
              <FinancePanel />
            </div>
          </div>
        </div>
      </div>

      {/* === BOOKINGS LIST HEADER === */}
      <div style={cardAurora}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 10,
          }}
        >
          <h2 style={{ margin: 0 }}>{t("admin_all_records")}</h2>

          {/* SEARCH */}
          <input
            style={{
              ...inputGlass,
              width: 260,
              height: 36,
            }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("search_placeholder")}
          />
        </div>

        {/* FILTER BUTTONS */}
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <button
            onClick={() => setStatusFilter("all")}
            style={
              statusFilter === "all" ? btnSegmentActive : btnSegmentInactive
            }
          >
            {t("admin_filters_all")}
          </button>

          <button
            onClick={() => setStatusFilter("active")}
            style={
              statusFilter === "active" ? btnSegmentActive : btnSegmentInactive
            }
          >
            {t("admin_filters_active")}
          </button>

          <button
            onClick={() => setStatusFilter("finished")}
            style={
              statusFilter === "finished"
                ? btnSegmentActive
                : btnSegmentInactive
            }
          >
            {t("admin_filters_finished")}
          </button>

          <button
            onClick={() => setStatusFilter("canceled")}
            style={
              statusFilter === "canceled"
                ? btnSegmentActive
                : btnSegmentInactive
            }
          >
            {t("admin_filters_canceled")}
          </button>
        </div>
        {/* === GROUPED RECORDS === */}
        {groupedByDate.map((group) => (
          <div
            key={group.key}
            style={{
              marginTop: 22,
              marginBottom: 12,
              paddingBottom: 4,
              borderBottom: "1px solid rgba(148,85,247,0.25)",
            }}
          >
            {/* DATE LABEL */}
            <div
              style={{
                fontSize: 17,
                fontWeight: 600,
                marginBottom: 10,
                opacity: 0.9,
              }}
            >
              {group.label}
            </div>

            {/* RECORDS ON THIS DATE */}
            <div className="col" style={{ gap: 10 }}>
              {group.items.map((b) => {
                const id = b.id;
                const open = openId === id;

                const start = new Date(b.start);
                const end = new Date(b.end || b.start);

                const userName = b.userName || "—";
                const userPhone = b.userPhone || "—";
                const userInstagram = b.userInstagram || "—";

                const service = b.serviceName || "—";

                const paid = isPaid(b);
                const status = b.status;

                return (
                  <div key={id} style={cardAurora}>
                    {/* === HEADER ROW (collapsed view) === */}
                    <div
                      style={recordHeader}
                      onClick={() => setOpenId(open ? null : id)}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, marginBottom: 4 }}>
                          {userName}
                        </div>

                        <div
                          style={{
                            display: "flex",
                            gap: 12,
                            opacity: 0.8,
                            fontSize: 13,
                          }}
                        >
                          <span>{fmtTime(start)}</span>
                          <span>—</span>
                          <span>{fmtTime(end)}</span>
                          <span>•</span>
                          <span>{service}</span>
                        </div>
                      </div>

                      {/* STATUS BADGES */}
                      <div className="row" style={{ gap: 6 }}>
                        {/* STATUS */}
                        <span
                          style={{
                            ...badge,
                            background:
                              status === "approved" || status === "approved_paid"
                                ? "rgba(34,197,94,0.2)"
                                : status === "pending"
                                ? "rgba(234,179,8,0.2)"
                                : "rgba(239,68,68,0.2)",
                            borderColor:
                              status === "approved" || status === "approved_paid"
                                ? "rgba(34,197,94,0.7)"
                                : status === "pending"
                                ? "rgba(234,179,8,0.7)"
                                : "rgba(239,68,68,0.7)",
                          }}
                        >
                          {status === "approved" || status === "approved_paid"
                            ? t("admin_confirmed")
                            : status === "pending"
                            ? t("admin_unconfirmed")
                            : t("admin_canceled")}
                        </span>

                        {/* PAID / UNPAID */}
                        <span
                          style={{
                            ...badge,
                            background: paid
                              ? "rgba(34,197,94,0.2)"
                              : "rgba(239,68,68,0.2)",
                            borderColor: paid
                              ? "rgba(34,197,94,0.7)"
                              : "rgba(239,68,68,0.7)",
                          }}
                        >
                          {paid ? t("admin_paid") : t("admin_unpaid")}
                        </span>
                      </div>

                      <Chevron open={open} />
                    </div>
                    {/* === EXPANDED BLOCK === */}
                    {open && (
                      <div
                        style={{
                          marginTop: 12,
                          paddingTop: 12,
                          borderTop: "1px solid rgba(148,85,247,0.25)",
                        }}
                      >
                        {/* USER INFO */}
                        <div className="col" style={{ gap: 6, marginBottom: 12 }}>
                          <div style={{ fontSize: 15 }}>
                            <b>{userName}</b>
                          </div>
                          <div style={{ opacity: 0.9 }}>
                            {t("receipt_phone")} {userPhone}
                          </div>
                          <div style={{ opacity: 0.9 }}>
                            Instagram: {userInstagram}
                          </div>
                        </div>

                        {/* DATE TIME */}
                        <div className="col" style={{ gap: 4, marginBottom: 12 }}>
                          <div>
                            {t("admin_date")}: {fmtDate(start)}
                          </div>
                          <div>
                            {t("admin_time_from")}: {fmtTime(start)}
                          </div>
                          <div>
                            {t("admin_time_to")}: {fmtTime(end)}
                          </div>
                        </div>

                        {/* SERVICE */}
                        <div
                          className="col"
                          style={{
                            gap: 4,
                            marginBottom: 12,
                            opacity: 0.95,
                          }}
                        >
                          <div>
                            {t("receipt_services")} {service}
                          </div>
                          <div>
                            {t("admin_advance")} {formatPrice(b.deposit)}€
                          </div>
                        </div>

                        {/* ACTION BUTTONS */}
                        <div
                          className="row"
                          style={{
                            gap: 10,
                            marginTop: 10,
                            marginBottom: 14,
                            flexWrap: "wrap",
                          }}
                        >
                          {/* APPROVE */}
                          {status === "pending" && (
                            <button
                              style={btnSuccess}
                              onClick={(e) => {
                                e.stopPropagation();
                                approveByAdmin(id);
                              }}
                            >
                              {t("approve")}
                            </button>
                          )}

                          {/* CANCEL */}
                          {status !== "canceled_client" &&
                            status !== "canceled_admin" && (
                              <button
                                style={btnDanger}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  cancelByAdmin(id);
                                }}
                              >
                                {t("cancel")}
                              </button>
                            )}

                          {/* TOGGLE PAID */}
                          <button
                            style={
                              paid
                                ? btnWarning
                                : {
                                    ...btnSuccess,
                                    background: "rgba(34,197,94,0.25)",
                                  }
                            }
                            onClick={(e) => {
                              e.stopPropagation();
                              togglePaid(id);
                            }}
                          >
                            {paid ? t("admin_remove_paid") : t("admin_mark_paid")}
                          </button>
                        </div>

                        {/* RECEIPT BLOCK */}
                        <div
                          style={{
                            marginTop: 16,
                            padding: 14,
                            borderRadius: 12,
                            background: "rgba(255,255,255,0.05)",
                            border: "1px solid rgba(255,255,255,0.15)",
                          }}
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadReceipt(b);
                            }}
                            style={{
                              ...btnPrimary,
                              width: "100%",
                              marginBottom: 12,
                            }}
                          >
                            {t("admin_download_receipt")}
                          </button>

                          {/* RECEIPT DETAILS PREVIEW */}
                          <div style={{ fontSize: 13, opacity: 0.8 }}>
                            <div>
                              {t("receipt_number_short")} {b.id.slice(0, 8)}
                            </div>
                            <div>
                              {t("receipt_created")} {fmtDate(b.createdAt)}
                            </div>
                            <div>
                              {t("receipt_client")} {userName}
                            </div>
                            <div>
                              {t("receipt_phone")} {userPhone}
                            </div>
                            {userInstagram && (
                              <div>Instagram: {userInstagram}</div>
                            )}
                            <div>
                              {t("admin_date")}: {fmtDate(start)}
                            </div>
                            <div>
                              {t("admin_time_from")}: {fmtTime(start)}
                            </div>
                            <div>
                              {t("admin_time_to")}: {fmtTime(end)}
                            </div>
                            <div>
                              {t("receipt_services")} {service}
                            </div>
                            <div>
                              {t("admin_advance")} {formatPrice(b.deposit)}€
                            </div>
                            <div>
                              {t("receipt_payment_status")}{" "}
                              {paid ? t("admin_paid") : t("admin_unpaid")}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        {/* === PAGINATION === */}
        <div
          className="row"
          style={{
            justifyContent: "center",
            alignItems: "center",
            gap: 12,
            marginTop: 18,
            marginBottom: 10,
          }}
        >
          <button
            disabled={page <= 1}
            onClick={() => {
              setPage((p) => Math.max(1, p - 1));
              setOpenId(null);
            }}
            style={page <= 1 ? btnPageDisabled : btnPage}
          >
            {t("admin_pagination_prev")}
          </button>

          <div style={{ opacity: 0.85 }}>
            {t("admin_page")} {page} {t("admin_of")} {totalPages}{" "}
            {t("admin_records_short")}
          </div>

          <button
            disabled={page >= totalPages}
            onClick={() => {
              setPage((p) => Math.min(totalPages, p + 1));
              setOpenId(null);
            }}
            style={page >= totalPages ? btnPageDisabled : btnPage}
          >
            {t("admin_pagination_next")}
          </button>
        </div>
      </div>

      {/* === TOAST === */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 20,
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(0,0,0,0.75)",
            color: "#fff",
            padding: "10px 18px",
            borderRadius: 10,
            zIndex: 3000,
            fontSize: 15,
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}

/* === UI HELPERS === */

const Chevron = ({ open }) => (
  <span
    style={{
      display: "inline-block",
      transition: "transform .2s",
      transform: open ? "rotate(90deg)" : "rotate(0deg)",
      fontSize: 16,
      opacity: 0.7,
    }}
  >
    ▶
  </span>
);

const generateTimes = (from, to) => {
  const list = [];
  for (let h = from; h < to; h++) {
    list.push(`${String(h).padStart(2, "0")}:00`);
  }
  return list;
};

/* === UI STYLES === */

const cardAurora = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.15)",
  boxShadow: "0 4px 14px rgba(0,0,0,0.25)",
  backdropFilter: "blur(18px)",
  borderRadius: 16,
  padding: 16,
};

const headerToggle = {
  width: "100%",
  textAlign: "left",
  padding: "8px 10px",
  background: "transparent",
  border: "none",
  color: "#fff",
  fontSize: 17,
  cursor: "pointer",
};

const labelStyle = {
  fontSize: 13,
  marginBottom: 4,
  opacity: 0.85,
};

const inputGlass = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.25)",
  background: "rgba(255,255,255,0.08)",
  color: "#fff",
  outline: "none",
};

const btnPrimary = {
  padding: "8px 14px",
  borderRadius: 12,
  background: "rgba(147,51,234,0.4)",
  border: "1px solid rgba(168,85,247,0.9)",
  color: "#fff",
  cursor: "pointer",
};

const btnSuccess = {
  padding: "8px 14px",
  borderRadius: 12,
  background: "rgba(34,197,94,0.3)",
  border: "1px solid rgba(34,197,94,0.85)",
  color: "#fff",
  cursor: "pointer",
};

const btnDanger = {
  padding: "8px 14px",
  borderRadius: 12,
  background: "rgba(239,68,68,0.35)",
  border: "1px solid rgba(239,68,68,0.85)",
  color: "#fff",
  cursor: "pointer",
};

const btnWarning = {
  padding: "8px 14px",
  borderRadius: 12,
  background: "rgba(234,179,8,0.25)",
  border: "1px solid rgba(234,179,8,0.7)",
  color: "#fff",
  cursor: "pointer",
};

const btnSegmentActive = {
  padding: "6px 12px",
  borderRadius: 10,
  background: "rgba(147,51,234,0.4)",
  border: "1px solid rgba(168,85,247,0.9)",
  color: "#fff",
  cursor: "pointer",
};

const btnSegmentInactive = {
  padding: "6px 12px",
  borderRadius: 10,
  background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.25)",
  color: "#aaa",
  cursor: "pointer",
};

const pageCommon = {
  padding: "6px 12px",
  borderRadius: 10,
  minWidth: 80,
};

const btnPage = {
  ...pageCommon,
  background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.25)",
  color: "#fff",
  cursor: "pointer",
};

const btnPageDisabled = {
  ...pageCommon,
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.15)",
  color: "#666",
  cursor: "default",
};

const recordHeader = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  cursor: "pointer",
};

const badge = {
  padding: "2px 6px",
  borderRadius: 8,
  border: "1px solid",
  fontSize: 12,
};

