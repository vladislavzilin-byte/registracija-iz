import { useEffect, useState } from "react";
import { getBookings, getCurrentUser, fmtDate, fmtTime } from "../lib/storage";
import { useI18n } from "../lib/i18n";

/* --------------------------------------------
   Мобильные FIX'ы: отключение zoom + модалка
---------------------------------------------*/

const globalMobileStyles = `
  /* Отключаем zoom на iOS */
  @media (max-width: 768px) {
    input, select, textarea, button {
      font-size: 16px !important;
    }
  }

  /* Обёртка для модалок — фиксируется к экрану */
  .mobile-modal-wrapper {
    position: fixed !important;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    z-index: 99999;
    background: rgba(0,0,0,0.55);
    backdrop-filter: blur(12px);
  }

  /* Сама модалка — центрируется */
  .mobile-modal {
    width: 92%;
    max-width: 420px;
    background: rgba(17,0,40,0.9);
    border: 1px solid rgba(168,85,247,0.35);
    border-radius: 18px;
    padding: 20px;
    color: #fff;
    animation: fadeIn .25s ease;
  }

  @keyframes fadeIn {
    from { opacity:0; transform:scale(0.95); }
    to   { opacity:1; transform:scale(1); }
  }
`;

export default function MyBookings() {

  /* Вставляем мобильные глобальные стили один раз */
  useEffect(() => {
    const tag = document.createElement("style");
    tag.innerHTML = globalMobileStyles;
    document.head.appendChild(tag);
    return () => tag.remove();
  }, []);

  const me = getCurrentUser();
  const { t } = useI18n();

  const [bookings, setBookings] = useState([]);
  const [selected, setSelected] = useState(null);   // выбранная запись
  const [confirmCancel, setConfirmCancel] = useState(null);

  useEffect(() => {
    setBookings(getBookings().filter((b) => b.userId === me?.id));
  }, [me]);
  // Открыть модалку записи
  const openModal = (b) => {
    setSelected(b);
  };

  // Закрыть модалку
  const closeModal = () => {
    setSelected(null);
  };

  // Подтверждение отмены
  const requestCancel = (b) => {
    setConfirmCancel(b);
  };

  const closeConfirm = () => {
    setConfirmCancel(null);
  };

  const doCancel = () => {
    if (!confirmCancel) return;
    const id = confirmCancel.id;
    const all = getBookings();
    const next = all.map((b) =>
      b.id === id ? { ...b, status: "canceled_client" } : b
    );
    localStorage.setItem("bookings", JSON.stringify(next));
    setBookings(next.filter((b) => b.userId === me?.id));
    setConfirmCancel(null);
  };

  return (
    <div className="col" style={{ gap: 14 }}>

      <h2 style={{ marginBottom: 4 }}>{t("my_bookings")}</h2>

      {!bookings.length && (
        <div className="card" style={{ textAlign: "center", opacity: 0.8 }}>
          {t("no_records")}
        </div>
      )}

      <div className="col" style={{ gap: 12 }}>
        {bookings
          .sort((a, b) => new Date(a.start) - new Date(b.start))
          .map((b) => {
            const d = new Date(b.start);

            return (
              <div
                key={b.id}
                className="card"
                style={{
                  padding: 14,
                  borderRadius: 16,
                  border: "1px solid rgba(148,85,247,0.35)",
                  background:
                    "radial-gradient(circle at top left, rgba(79,70,229,0.25), transparent 55%), rgba(15,23,42,0.9)",
                  cursor: "pointer",
                }}
                onClick={() => openModal(b)}
              >
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>
                    {fmtDate(b.start)}
                  </div>
                  <div style={{ fontSize: 13, opacity: 0.8 }}>
                    {fmtTime(b.start)} – {fmtTime(b.end)}
                  </div>
                </div>

                <div style={{ marginTop: 6, color: "#d9e2ff" }}>
                  {(b.services || []).join(", ")}
                </div>

                <div style={{ marginTop: 6, display: "flex", gap: 8 }}>
                  {/* Статус подтверждения */}
                  <span
                    style={{
                      padding: "4px 10px",
                      borderRadius: 999,
                      fontSize: 12,
                      background:
                        b.status === "approved"
                          ? "rgba(34,197,94,0.18)"
                          : "rgba(127,29,29,0.45)",
                      border:
                        b.status === "approved"
                          ? "1px solid rgba(34,197,94,0.9)"
                          : "1px solid rgba(248,113,113,0.9)",
                      color:
                        b.status === "approved" ? "#86efac" : "#fecaca",
                    }}
                  >
                    {b.status === "approved" ? "Подтверждено" : "Неподтверждено"}
                  </span>

                  {/* Статус оплаты */}
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
                      color: b.paid ? "#86efac" : "#fecaca",
                    }}
                  >
                    {b.paid ? "Оплачено" : "Не оплачено"}
                  </span>
                </div>
              </div>
            );
          })}
      </div>

      {/* ======================== */}
      {/*      МОДАЛКА ЗАПИСИ      */}
      {/* ======================== */}
      {selected && (
        <div className="mobile-modal-wrapper" onClick={closeModal}>
          <div className="mobile-modal" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>{fmtDate(selected.start)}</h3>

            <div style={{ opacity: 0.9, marginBottom: 12 }}>
              {fmtTime(selected.start)} – {fmtTime(selected.end)}
            </div>

            <div style={{ marginBottom: 12 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Услуги:</div>
              <div>{(selected.services || []).join(", ")}</div>
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <span
                style={{
                  padding: "6px 12px",
                  borderRadius: 999,
                  fontSize: 13,
                  background:
                    selected.status === "approved"
                      ? "rgba(34,197,94,0.18)"
                      : "rgba(127,29,29,0.45)",
                  border:
                    selected.status === "approved"
                      ? "1px solid rgba(34,197,94,0.9)"
                      : "1px solid rgba(248,113,113,0.9)",
                }}
              >
                {selected.status === "approved"
                  ? "Подтверждено"
                  : "Неподтверждено"}
              </span>

              <span
                style={{
                  padding: "6px 12px",
                  borderRadius: 999,
                  fontSize: 13,
                  background: selected.paid
                    ? "rgba(22,163,74,0.18)"
                    : "rgba(127,29,29,0.45)",
                  border: selected.paid
                    ? "1px solid rgba(34,197,94,0.9)"
                    : "1px solid rgba(248,113,113,0.9)",
                }}
              >
                {selected.paid ? "Оплачено" : "Не оплачено"}
              </span>
            </div>

            {selected.status !== "canceled_client" && (
              <button
                style={{
                  marginTop: 20,
                  width: "100%",
                  padding: 10,
                  borderRadius: 12,
                  background: "rgba(110,20,30,.35)",
                  border: "1px solid rgba(239,68,68,.7)",
                  color: "#fff",
                  fontWeight: 600,
                }}
                onClick={() => requestCancel(selected)}
              >
                Отменить запись
              </button>
            )}

            <button
              onClick={closeModal}
              style={{
                marginTop: 12,
                width: "100%",
                padding: 10,
                borderRadius: 12,
                border: "1px solid rgba(148,163,184,0.35)",
                background: "rgba(255,255,255,0.05)",
                color: "#fff",
              }}
            >
              Закрыть
            </button>
          </div>
        </div>
      )}
      {/* ======================== */}
      {/*     CONFIRM CANCEL       */}
      {/* ======================== */}
      {confirmCancel && (
        <div className="mobile-modal-wrapper" onClick={closeConfirm}>
          <div className="mobile-modal" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Отменить запись?</h3>

            <p style={{ opacity: 0.9 }}>
              {fmtDate(confirmCancel.start)} • {fmtTime(confirmCancel.start)} –{" "}
              {fmtTime(confirmCancel.end)}
            </p>

            <button
              style={{
                marginTop: 20,
                width: "100%",
                padding: 10,
                borderRadius: 12,
                background: "rgba(110,20,30,.35)",
                border: "1px solid rgba(239,68,68,.7)",
                color: "#fff",
                fontWeight: 600,
              }}
              onClick={doCancel}
            >
              Да, отменить
            </button>

            <button
              onClick={closeConfirm}
              style={{
                marginTop: 12,
                width: "100%",
                padding: 10,
                borderRadius: 12,
                border: "1px solid rgba(148,163,184,0.35)",
                background: "rgba(255,255,255,0.05)",
                color: "#fff",
              }}
            >
              Закрыть
            </button>
          </div>
        </div>
      )}

      {/* ======================== */}
      {/*        MOBILE STYLE      */}
      {/* ======================== */}
      <style>{`
        /* ОТКЛЮЧАЕМ iOS ZOOM НА INPUT */
        @supports (-webkit-touch-callout: none) {
          input, button {
            font-size: 16px !important;
          }
        }

        /* ОБЩИЙ МОБИЛЬНЫЙ BACKDROP */
        .mobile-modal-wrapper {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(0,0,0,0.55);
          backdrop-filter: blur(12px);
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 20px;
          z-index: 9999;
        }

        /* МОДАЛКА */
        .mobile-modal {
          width: 100%;
          max-width: 420px;
          background: rgba(15, 10, 30, 0.95);
          border-radius: 18px;
          padding: 22px;
          border: 1px solid rgba(168,85,247,0.35);
          box-shadow: 0 6px 28px rgba(0,0,0,0.35);
          animation: modalFadeIn .25s ease;
        }

        @keyframes modalFadeIn {
          0% { opacity: 0; transform: scale(0.94); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
