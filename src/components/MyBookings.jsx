import { useState, useMemo } from "react";
import { getCurrentUser, getBookings, saveBookings, fmtDate, fmtTime } from "../lib/storage";
import { useI18n } from "../lib/i18n";

export default function MyBookings() {
  const { t } = useI18n();
  const me = getCurrentUser();
  const all = getBookings();

  // мои записи
  const my = useMemo(() => {
    if (!me?.email) return [];
    return all
      .filter((b) => b.userEmail === me.email)
      .sort((a, b) => new Date(a.start) - new Date(b.start));
  }, [all, me]);

  // фильтр: все / активные / архив
  const [filter, setFilter] = useState("all");

  const filtered = useMemo(() => {
    const now = new Date();
    return my.filter((b) => {
      if (filter === "active") {
        return (
          (b.status === "approved" ||
            b.status === "approved_paid" ||
            b.status === "pending") &&
          new Date(b.end || b.start) >= now
        );
      }
      if (filter === "history") {
        return (
          b.status.includes("canceled") ||
          new Date(b.end || b.start) < now
        );
      }
      return true;
    });
  }, [my, filter]);

  const cancel = (id) => {
    if (!confirm(t("cancel_confirm"))) return;
    const updated = all.map((b) =>
      b.id === id
        ? { ...b, status: "canceled_client", canceledAt: new Date().toISOString() }
        : b
    );
    saveBookings(updated);
    location.reload();
  };

  return (
    <div style={container}>

      {/* ========================  
          🔥 АНТИ-ZOOM ПАТЧ ДЛЯ МОБИЛОК
          ======================== */}
      <style>
        {`
          @media (max-width: 768px) {
            input, select, textarea, button {
              font-size: 16px !important;
            }
          }
        `}
      </style>

      <h2 style={{ marginBottom: 16 }}>{t("my_bookings")}</h2>

      {/* ФИЛЬТРЫ */}
      <div style={filters}>
        <button
          style={filter === "all" ? fActive : fBtn}
          onClick={() => setFilter("all")}
        >
          {t("all")}
        </button>

        <button
          style={filter === "active" ? fActive : fBtn}
          onClick={() => setFilter("active")}
        >
          {t("active")}
        </button>

        <button
          style={filter === "history" ? fActive : fBtn}
          onClick={() => setFilter("history")}
        >
          {t("history")}
        </button>
      </div>

      {/* СПИСОК */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 10 }}>
        {filtered.map((b) => {
          const canceled = b.status.includes("canceled");
          const paid = b.paid || b.status === "approved_paid";
          const confirmed = b.status === "approved" || b.status === "approved_paid";

          return (
            <div key={b.id} style={card}>
              {/* ДАТА + ВРЕМЯ */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 6,
                }}
              >
                <div style={{ fontWeight: 600, opacity: 0.9 }}>
                  {fmtDate(b.start)}
                </div>

                <div style={{ fontSize: 13, opacity: 0.8 }}>
                  {fmtTime(b.start)} – {fmtTime(b.end)}
                </div>
              </div>

              {/* УСЛУГИ */}
              <div style={{ fontSize: 14, marginBottom: 8 }}>
                {Array.isArray(b.services) ? b.services.join(", ") : ""}
              </div>

              {/* СТАТУСЫ */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {/* подтверждение */}
                <span
                  style={{
                    ...tag,
                    background: confirmed
                      ? "rgba(22,163,74,0.25)"
                      : "rgba(127,29,29,0.45)",
                    border: confirmed
                      ? "1px solid rgba(34,197,94,0.9)"
                      : "1px solid rgba(248,113,113,0.9)",
                  }}
                >
                  {confirmed ? "Подтверждено" : "Неподтверждено"}
                </span>

                {/* оплата */}
                <span
                  style={{
                    ...tag,
                    background: paid
                      ? "rgba(22,163,74,0.25)"
                      : "rgba(127,29,29,0.45)",
                    border: paid
                      ? "1px solid rgba(34,197,94,0.9)"
                      : "1px solid rgba(248,113,113,0.9)",
                  }}
                >
                  {paid ? t("paid") : t("not_paid")}
                </span>
              </div>

              {/* КНОПКА ОТМЕНЫ */}
              {!canceled && (
                <button style={cancelBtn} onClick={() => cancel(b.id)}>
                  {t("cancel")}
                </button>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div style={{ opacity: 0.6, fontSize: 14, marginTop: 20 }}>
            {t("no_records")}
          </div>
        )}
      </div>

      <div style={{ marginTop: 30, textAlign: "center", opacity: 0.4 }}>
        © IZ HAIR TREND
      </div>
    </div>
  );
}

/* ===== С Т И Л И ===== */

const container = {
  width: "100%",
  maxWidth: 1000,
  margin: "0 auto",
  padding: "16px",
  color: "#fff",
};

const filters = {
  display: "flex",
  gap: 10,
  marginBottom: 14,
};

const fBtn = {
  padding: "8px 16px",
  borderRadius: 10,
  background: "rgba(17,0,40,0.45)",
  border: "1px solid rgba(168,85,247,0.25)",
  color: "#fff",
  cursor: "pointer",
};

const fActive = {
  ...fBtn,
  background: "linear-gradient(180deg, rgba(110,60,190,0.9), rgba(60,20,110,0.9))",
  border: "1px solid rgba(180,95,255,0.7)",
  boxShadow: "0 0 12px rgba(150,90,255,0.30)",
};

const card = {
  borderRadius: 16,
  border: "1px solid rgba(88,28,135,0.7)",
  background: "rgba(10,6,25,0.9)",
  padding: 14,
  boxShadow: "0 0 16px rgba(88,28,135,0.55)",
};

const tag = {
  padding: "4px 10px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 500,
};

const cancelBtn = {
  marginTop: 12,
  width: "100%",
  padding: 10,
  borderRadius: 10,
  border: "1px solid rgba(239,68,68,0.6)",
  background: "rgba(110,20,30,.35)",
  color: "#fff",
  cursor: "pointer",
};
