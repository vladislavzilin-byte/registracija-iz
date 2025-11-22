import { useState, useEffect, useMemo } from "react";
import { fmtDate, fmtTime } from "../lib/storage";

export default function Admin({
  bookings = [],
  services = {},
  onChangeBooking,
  onDownloadReceipt,
  settings = {},
}) {
  const [viewMode, setViewMode] = useState("compact"); 
  // "compact" → сокращённый список
  // "cards" → полный вид как раньше

  const [expandedId, setExpandedId] = useState(null); 
  // id записи, которая открыта гармошкой

  const toggleExpand = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const sortedBookings = useMemo(() => {
    return [...bookings].sort((a, b) => {
      const ad = new Date(a.start);
      const bd = new Date(b.start);
      return ad - bd;
    });
  }, [bookings]);

  // ===== UI STYLES =====

  const tabButton = (active) => ({
    flex: 1,
    padding: "10px 0",
    borderRadius: 10,
    border: "1px solid rgba(139,92,246,0.6)",
    background: active
      ? "linear-gradient(90deg,rgba(139,92,246,0.9),rgba(168,85,247,0.9))"
      : "rgba(15,23,42,0.9)",
    color: active ? "#fff" : "#cbd5e1",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    textAlign: "center",
  });

  const compactRow = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    background: "rgba(15,23,42,0.95)",
    border: "1px solid rgba(139,92,246,0.6)",
    padding: "10px 14px",
    borderRadius: 14,
    marginBottom: 6,
    gap: 10,
  };

  const tagStyle = {
    padding: "4px 10px",
    background: "rgba(51,65,85,0.8)",
    borderRadius: 12,
    fontSize: 11,
    whiteSpace: "nowrap",
    color: "#e2e8f0",
  };

  const priceStyle = {
    padding: "4px 8px",
    borderRadius: 12,
    background: "rgba(22,163,74,0.25)",
    border: "1px solid rgba(34,197,94,0.9)",
    color: "#bbf7d0",
    fontSize: 12,
    fontWeight: 600,
    whiteSpace: "nowrap",
  };

  const iconBtn = {
    width: 28,
    height: 28,
    borderRadius: 10,
    background: "rgba(15,23,42,0.9)",
    border: "1px solid rgba(148,163,184,0.7)",
    color: "#e5e7eb",
    fontSize: 14,
    cursor: "pointer",
  };

  // ======================================================
  // =============   UI: Переключатель режимов ===========
  // ======================================================

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* --- Переключатель вкладок --- */}
      <div style={{ display: "flex", gap: 10 }}>
        <button
          style={tabButton(viewMode === "compact")}
          onClick={() => setViewMode("compact")}
        >
          Trumpas sąrašas
        </button>

        <button
          style={tabButton(viewMode === "cards")}
          onClick={() => setViewMode("cards")}
        >
          Kortelės
        </button>
      </div>

      {/* ======================================================
             MODE 1 — КОМПАКТНЫЙ СПИСОК
         ====================================================== */}
      {viewMode === "compact" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {sortedBookings.map((b) => {
            const start = new Date(b.start);
            const end = new Date(b.end);

            return (
              <div key={b.id}>
                {/* ===== КОРОТКАЯ СТРОКА ===== */}
                <div style={compactRow}>
                  {/* Дата + время */}
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ fontSize: 12, color: "#e2e8f0" }}>
                      {fmtDate(b.start)}
                    </span>
                    <span style={{ fontSize: 12, opacity: 0.8 }}>
                      {fmtTime(start)} – {fmtTime(end)}
                    </span>
                  </div>

                  {/* Теги услуг */}
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {Array.isArray(b.services) &&
                      b.services.map((s) => (
                        <span key={s} style={tagStyle}>
                          {s}
                        </span>
                      ))}
                  </div>

                  {/* Цена */}
                  <span style={priceStyle}>€{b.price}</span>

                  {/* Кнопки */}
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      style={iconBtn}
                      title="Kvitas"
                      onClick={() => onDownloadReceipt(b)}
                    >
                      🧾
                    </button>

                    <button
                      style={{ ...iconBtn, border: "1px solid #a855f7" }}
                      title="Redaguoti"
                      onClick={() => toggleExpand(b.id)}
                    >
                      ✎
                    </button>

                    <button
                      style={{ ...iconBtn, border: "1px solid #ef4444" }}
                      title="Pašalinti"
                      onClick={() => onChangeBooking(b, "delete")}
                    >
                      ✕
                    </button>

                    {/* Стрелка для гармошки */}
                    <button
                      style={iconBtn}
                      onClick={() => toggleExpand(b.id)}
                    >
                      {expandedId === b.id ? "▲" : "▼"}
                    </button>
                  </div>
                </div>

                {/* ==== РАЗВОРОТ ГАРМОШКИ — ПОЛНАЯ КАРТОЧКА ==== */}
                {expandedId === b.id && (
                  <div
                    style={{
                      padding: 14,
                      border: "1px solid rgba(139,92,246,0.6)",
                      borderRadius: 14,
                      marginBottom: 8,
                      background: "rgba(2,6,23,0.6)",
                    }}
                  >
                    {/* 👉 Здесь во 2-й части будет вставлена твоя ПОЛНАЯ КАРТОЧКА
                        без изменений! */}
                    {/* ==== PILNA KORTELE (NEPAKEISTA LOGIKA) ==== */}
                    <div style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                      color: "#f3f4f6",
                      fontSize: 14,
                    }}>
                      
                      {/* Vardas */}
                      <div>
                        <div style={{ opacity: 0.7, fontSize: 12 }}>Klientas</div>
                        <div style={{
                          padding: "6px 10px",
                          background: "rgba(15,23,42,0.9)",
                          borderRadius: 10,
                          border: "1px solid rgba(148,163,184,0.5)"
                        }}>
                          {b.clientName || "—"}
                        </div>
                      </div>

                      {/* Telefonas */}
                      <div>
                        <div style={{ opacity: 0.7, fontSize: 12 }}>Telefonas</div>
                        <div style={{
                          padding: "6px 10px",
                          background: "rgba(15,23,42,0.9)",
                          borderRadius: 10,
                          border: "1px solid rgba(148,163,184,0.5)"
                        }}>
                          {b.phone || "—"}
                        </div>
                      </div>

                      {/* Data */}
                      <div style={{ display: "flex", gap: 10 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ opacity: 0.7, fontSize: 12 }}>Data</div>
                          <div style={{
                            padding: "6px 10px",
                            background: "rgba(15,23,42,0.9)",
                            borderRadius: 10,
                            border: "1px solid rgba(148,163,184,0.5)"
                          }}>
                            {fmtDate(b.start)}
                          </div>
                        </div>

                        <div style={{ flex: 1 }}>
                          <div style={{ opacity: 0.7, fontSize: 12 }}>Laikas</div>
                          <div style={{
                            padding: "6px 10px",
                            background: "rgba(15,23,42,0.9)",
                            borderRadius: 10,
                            border: "1px solid rgba(148,163,184,0.5)"
                          }}>
                            {fmtTime(b.start)} – {fmtTime(b.end)}
                          </div>
                        </div>
                      </div>

                      {/* Paslaugos */}
                      <div>
                        <div style={{ opacity: 0.7, fontSize: 12 }}>Paslaugos</div>
                        <div style={{
                          display: "flex",
                          gap: 6,
                          flexWrap: "wrap",
                          paddingTop: 6,
                        }}>
                          {Array.isArray(b.services) &&
                            b.services.map((s) => (
                              <span key={s} style={{
                                padding: "4px 10px",
                                borderRadius: 10,
                                background: "rgba(139,92,246,0.25)",
                                border: "1px solid rgba(168,85,247,0.6)",
                                fontSize: 12,
                                whiteSpace: "nowrap"
                              }}>
                                {s}
                              </span>
                            ))}
                        </div>
                      </div>

                      {/* Suma */}
                      <div>
                        <div style={{ opacity: 0.7, fontSize: 12 }}>Kaina</div>
                        <div style={{
                          padding: "6px 10px",
                          background: "rgba(15,23,42,0.9)",
                          borderRadius: 10,
                          border: "1px solid rgba(148,163,184,0.5)",
                          fontWeight: 600
                        }}>
                          €{b.price}
                        </div>
                      </div>

                      {/* STATUSAI */}
                      <div style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 8,
                        marginTop: 6
                      }}>
                        <button
                          style={{
                            padding: "6px 12px",
                            borderRadius: 10,
                            background: "rgba(22,163,74,0.25)",
                            border: "1px solid rgba(34,197,94,0.8)",
                            color: "#bbf7d0",
                            cursor: "pointer"
                          }}
                          onClick={() => onChangeBooking(b, "approve")}
                        >
                          Patvirtinti
                        </button>

                        <button
                          style={{
                            padding: "6px 12px",
                            borderRadius: 10,
                            background: "rgba(59,130,246,0.25)",
                            border: "1px solid rgba(59,130,246,0.8)",
                            color: "#dbeafe",
                            cursor: "pointer"
                          }}
                          onClick={() => onChangeBooking(b, "paid")}
                        >
                          Apmokėta
                        </button>

                        <button
                          style={{
                            padding: "6px 12px",
                            borderRadius: 10,
                            background: "rgba(220,38,38,0.25)",
                            border: "1px solid rgba(220,38,38,0.9)",
                            color: "#fecaca",
                            cursor: "pointer"
                          }}
                          onClick={() => onChangeBooking(b, "cancel")}
                        >
                          Atšaukti
                        </button>

                        <button
                          style={{
                            padding: "6px 12px",
                            borderRadius: 10,
                            background: "rgba(139,92,246,0.2)",
                            border: "1px solid rgba(168,85,247,0.8)",
                            color: "#f5d0fe",
                            cursor: "pointer"
                          }}
                          onClick={() => onDownloadReceipt(b)}
                        >
                          📄 Kvitas
                        </button>
                      </div>
                    </div>

                          {/* ======================================================
             MODE 2 — PILNAS KORTELES SĄRAŠAS
         ====================================================== */}
      {viewMode === "cards" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {sortedBookings.map((b) => {
            const start = new Date(b.start);
            const end = new Date(b.end);

            return (
              <div
                key={b.id}
                style={{
                  borderRadius: 18,
                  border: "1px solid rgba(139,92,246,0.7)",
                  padding: 16,
                  background: "rgba(15,10,25,0.96)",
                  boxShadow: "0 0 18px rgba(15,23,42,0.95)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                {/* --- Header: Date + Time + Price --- */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: 12,
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span
                      style={{
                        fontSize: 12,
                        color: "#e2e8f0",
                      }}
                    >
                      {fmtDate(b.start)}
                    </span>
                    <span style={{ fontSize: 12, opacity: 0.8 }}>
                      {fmtTime(start)} – {fmtTime(end)}
                    </span>
                  </div>

                  <span
                    style={{
                      padding: "6px 10px",
                      background: "rgba(22,163,74,0.25)",
                      border: "1px solid rgba(34,197,94,0.8)",
                      borderRadius: 12,
                      fontWeight: 700,
                      color: "#bbf7d0",
                      height: "fit-content",
                    }}
                  >
                    €{b.price}
                  </span>
                </div>

                {/* --- Client information --- */}
                <div>
                  <div style={{ opacity: 0.7, fontSize: 12 }}>Klientas</div>
                  <div
                    style={{
                      padding: "6px 10px",
                      background: "rgba(15,23,42,0.95)",
                      borderRadius: 10,
                      border: "1px solid rgba(148,163,184,0.5)",
                      marginTop: 3,
                    }}
                  >
                    {b.clientName || "—"}
                  </div>
                </div>

                <div>
                  <div style={{ opacity: 0.7, fontSize: 12 }}>Telefonas</div>
                  <div
                    style={{
                      padding: "6px 10px",
                      background: "rgba(15,23,42,0.95)",
                      borderRadius: 10,
                      border: "1px solid rgba(148,163,184,0.5)",
                      marginTop: 3,
                    }}
                  >
                    {b.phone || "—"}
                  </div>
                </div>

                {/* --- Services --- */}
                <div>
                  <div style={{ opacity: 0.7, fontSize: 12 }}>Paslaugos</div>
                  <div
                    style={{
                      display: "flex",
                      gap: 6,
                      flexWrap: "wrap",
                      paddingTop: 6,
                    }}
                  >
                    {Array.isArray(b.services) &&
                      b.services.map((s) => (
                        <span
                          key={s}
                          style={{
                            padding: "4px 10px",
                            borderRadius: 10,
                            background: "rgba(139,92,246,0.25)",
                            border: "1px solid rgba(168,85,247,0.6)",
                            fontSize: 12,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {s}
                        </span>
                      ))}
                  </div>
                </div>

                {/* --- ACTION BUTTONS --- */}
                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    flexWrap: "wrap",
                    marginTop: 8,
                  }}
                >
                  <button
                    style={{
                      padding: "8px 14px",
                      borderRadius: 12,
                      background: "rgba(22,163,74,0.25)",
                      border: "1px solid rgba(34,197,94,0.8)",
                      color: "#bbf7d0",
                      cursor: "pointer",
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                    onClick={() => onChangeBooking(b, "approve")}
                  >
                    Patvirtinti
                  </button>

                  <button
                    style={{
                      padding: "8px 14px",
                      borderRadius: 12,
                      background: "rgba(59,130,246,0.25)",
                      border: "1px solid rgba(59,130,246,0.8)",
                      color: "#dbeafe",
                      cursor: "pointer",
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                    onClick={() => onChangeBooking(b, "paid")}
                  >
                    Apmokėta
                  </button>

                  <button
                    style={{
                      padding: "8px 14px",
                      borderRadius: 12,
                      background: "rgba(220,38,38,0.25)",
                      border: "1px solid rgba(220,38,38,0.9)",
                      color: "#fecaca",
                      cursor: "pointer",
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                    onClick={() => onChangeBooking(b, "cancel")}
                  >
                    Atšaukti
                  </button>

                  <button
                    style={{
                      padding: "8px 14px",
                      borderRadius: 12,
                      background: "rgba(139,92,246,0.25)",
                      border: "1px solid rgba(168,85,247,0.8)",
                      color: "#f5d0fe",
                      cursor: "pointer",
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                    onClick={() => onDownloadReceipt(b)}
                  >
                    📄 Kvitas
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div> // ← закрывает основной wrapper Admin.jsx
  );
}

/* ======================================================
      PAPILDOMI STILIAI IR FUNKCIJOS (jei reikia)
   ====================================================== */

const pill = {
  padding: "4px 12px",
  borderRadius: 999,
  fontSize: 11,
  whiteSpace: "nowrap",
  background: "rgba(15,23,42,0.95)",
  border: "1px solid rgba(148,163,184,0.7)",
  color: "#e5e7eb",
};

/* Tag rendering (naudojama tiek kortelėse, tiek compact view) */
function renderServiceTags(tags = [], serviceStyles = {}) {
  return tags.map((name) => {
    const base = serviceStyles[name] || {};
    const bg = base.bg || "rgba(148,163,184,0.18)";
    const border = base.border || "1px solid rgba(148,163,184,0.85)";

    return (
      <span
        key={name}
        style={{
          padding: "4px 12px",
          borderRadius: 999,
          fontSize: 11,
          background: bg,
          border,
          whiteSpace: "nowrap",
        }}
      >
        {name}
      </span>
    );
  });
}

export default Admin;

