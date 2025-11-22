import { useState, useEffect, useMemo } from "react";
import { fmtDate, fmtTime, uid } from "../lib/storage";

/* === Функции статусов, как и раньше === */
const isPaid = (b) => !!(b?.paid || b?.status === "approved_paid");
const isCanceled = (b) =>
  b.status === "canceled_client" || b.status === "canceled_admin";

const btnGreen = {
  padding: "6px 10px",
  borderRadius: 10,
  background: "rgba(34,197,94,0.25)",
  border: "1px solid rgba(34,197,94,0.6)",
  color: "#bbf7d0",
  cursor: "pointer",
  fontSize: 12,
};

const btnBlue = {
  padding: "6px 10px",
  borderRadius: 10,
  background: "rgba(59,130,246,0.25)",
  border: "1px solid rgba(59,130,246,0.6)",
  color: "#dbeafe",
  cursor: "pointer",
  fontSize: 12,
};

const btnRed = {
  padding: "6px 10px",
  borderRadius: 10,
  background: "rgba(220,38,38,0.25)",
  border: "1px solid rgba(220,38,38,0.6)",
  color: "#fecaca",
  cursor: "pointer",
  fontSize: 12,
};


/* === Основной компонент === */
export default function AdminPanel({
  bookings = [],
  settings = {},
  serviceStyles = {},
  onSaveSettings,
  onDeleteBooking,
  onApprovePayment,
  onDownloadReceipt,
}) {
  /* === S2 режим отображения бронирований ===
     full — карточки (как сейчас)
     compact — сокращённый список
  */
  const [viewMode, setViewMode] = useState("compact");

  /* === локальные копии настроек мастера для редактирования === */
  const [localName, setLocalName] = useState(settings.masterName || "");
  const [localPhone, setLocalPhone] = useState(settings.masterPhone || "");
  const [localAddress, setLocalAddress] = useState(settings.masterAddress || "");
  const [localNote, setLocalNote] = useState(settings.masterNote || "");
  const [localIban, setLocalIban] = useState(settings.masterIban || "");
  const [localHours, setLocalHours] = useState(settings.masterHours || "");

  /* === Гармошка настроек === */
  const [settingsOpen, setSettingsOpen] = useState(false);

  /* === Список отфильтрованных записей — исключаем отменённые === */
  const filtered = useMemo(() => {
    return bookings
      .filter((b) => !isCanceled(b))
      .sort((a, b) => new Date(b.start) - new Date(a.start));
  }, [bookings]);

  /* === Сохранение новых настроек === */
  const saveSettings = () => {
    if (!onSaveSettings) return;

    onSaveSettings({
      masterName: localName.trim(),
      masterPhone: localPhone.trim(),
      masterAddress: localAddress.trim(),
      masterNote: localNote.trim(),
      masterIban: localIban.trim(),
      masterHours: localHours.trim(),
    });
  };

  /* === Обновление настроек при загрузке === */
  useEffect(() => {
    setLocalName(settings.masterName || "");
    setLocalPhone(settings.masterPhone || "");
    setLocalAddress(settings.masterAddress || "");
    setLocalNote(settings.masterNote || "");
    setLocalIban(settings.masterIban || "");
    setLocalHours(settings.masterHours || "");
  }, [settings]);
  /* === UI стили для блока настроек === */
  const settingsBlock = {
    borderRadius: 16,
    border: "1px solid rgba(148,163,184,0.25)",
    background: "rgba(15,23,42,0.65)",
    padding: 16,
    marginBottom: 20,
  };

  const settingsHeader = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    cursor: "pointer",
    paddingBottom: 8,
  };

  const settingsTitle = {
    fontSize: 18,
    fontWeight: 600,
    color: "#f3f4f6",
  };

  const settingsArrow = {
    fontSize: 18,
    transform: settingsOpen ? "rotate(180deg)" : "rotate(0deg)",
    transition: "0.25s",
  };

  const inputRow = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
    marginBottom: 10,
  };

  const labelStyle = {
    fontSize: 12,
    color: "#e5e7eb",
    marginBottom: 4,
    display: "block",
  };

  const inputStyle = {
    width: "100%",
    padding: "8px 10px",
    borderRadius: 10,
    border: "1px solid rgba(148,163,184,0.45)",
    background: "rgba(17,24,39,0.85)",
    color: "#f3f4f6",
    outline: "none",
    fontSize: 13,
  };

  const saveBtn = {
    width: "100%",
    marginTop: 10,
    padding: "10px 0",
    borderRadius: 12,
    border: "1px solid rgba(139,92,246,0.8)",
    background:
      "linear-gradient(135deg, rgba(88,28,135,0.95), rgba(124,58,237,0.95))",
    color: "#f9fafb",
    fontWeight: 600,
    cursor: "pointer",
    fontSize: 14,
  };

  /* === Рендер блока настроек === */
  const renderSettings = () => (
    <div style={settingsBlock}>
      {/* Заголовок-гармошка */}
      <div
        style={settingsHeader}
        onClick={() => setSettingsOpen((s) => !s)}
      >
        <div style={settingsTitle}>🔧 Redaguoti nustatymus</div>
        <div style={settingsArrow}>▼</div>
      </div>

      {/* Контейнер с полями */}
      {settingsOpen && (
        <div style={{ marginTop: 12 }}>
          <div style={inputRow}>
            <div>
              <label style={labelStyle}>Meistro vardas</label>
              <input
                style={inputStyle}
                value={localName}
                onChange={(e) => setLocalName(e.target.value)}
                placeholder="pvz. Izabella"
              />
            </div>

            <div>
              <label style={labelStyle}>Telefonas</label>
              <input
                style={inputStyle}
                value={localPhone}
                onChange={(e) => setLocalPhone(e.target.value)}
                placeholder="+370..."
              />
            </div>
          </div>

          <div style={inputRow}>
            <div>
              <label style={labelStyle}>Adresas</label>
              <input
                style={inputStyle}
                value={localAddress}
                onChange={(e) => setLocalAddress(e.target.value)}
                placeholder="pvz. Klaipėda"
              />
            </div>

            <div>
              <label style={labelStyle}>Darbo valandos</label>
              <input
                style={inputStyle}
                value={localHours}
                onChange={(e) => setLocalHours(e.target.value)}
                placeholder="pvz. 10:00–18:00"
              />
            </div>
          </div>

          <div style={{ marginBottom: 10 }}>
            <label style={labelStyle}>Papildoma informacija</label>
            <input
              style={inputStyle}
              value={localNote}
              onChange={(e) => setLocalNote(e.target.value)}
              placeholder="pvz. Pastabos klientui"
            />
          </div>

          <div style={{ marginBottom: 10 }}>
            <label style={labelStyle}>IBAN sąskaita</label>
            <input
              style={inputStyle}
              value={localIban}
              onChange={(e) => setLocalIban(e.target.value)}
              placeholder="LTxx xxxx xxxx xxxx"
            />
          </div>

          <button style={saveBtn} onClick={saveSettings}>
            💾 Išsaugoti nustatymus
          </button>
        </div>
      )}
    </div>
  );
  /* === Основной render компонента === */
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Блок настроек */}
      {renderSettings()}

      {/* Переключатель Full / Compact */}
      <div style={{
        display: "flex",
        justifyContent: "flex-end",
        marginBottom: 10,
      }}>
        <button
          onClick={() => setViewMode("compact")}
          style={{
            padding: "6px 14px",
            borderRadius: 10,
            marginRight: 6,
            background:
              viewMode === "compact"
                ? "rgba(167,139,250,0.25)"
                : "rgba(15,23,42,0.7)",
            border: "1px solid rgba(167,139,250,0.55)",
            color: "#f3f4f6",
            cursor: "pointer",
          }}
        >
          Trumpas sąrašas
        </button>

        <button
          onClick={() => setViewMode("full")}
          style={{
            padding: "6px 14px",
            borderRadius: 10,
            background:
              viewMode === "full"
                ? "rgba(167,139,250,0.25)"
                : "rgba(15,23,42,0.7)",
            border: "1px solid rgba(167,139,250,0.55)",
            color: "#f3f4f6",
            cursor: "pointer",
          }}
        >
          Kortelės
        </button>
      </div>

      {/* === FULL VIEW (старый интерфейс карточек) === */}
      {viewMode === "full" && (
        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}>
          {filtered.map((b) => (
            <div
              key={b.id}
              style={{
                borderRadius: 18,
                padding: 14,
                background: "rgba(15,23,42,0.8)",
                border: "1px solid rgba(139,92,246,0.55)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>
                    {fmtDate(b.start)}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>
                    {fmtTime(b.start)} – {fmtTime(b.end)}
                  </div>
                </div>

                <div style={{ fontSize: 15, fontWeight: 600 }}>
                  €{b.price}
                </div>
              </div>

              <div style={{ marginTop: 6, opacity: 0.8 }}>
                {(b.services || []).join(", ")}
              </div>

              {/* Кнопки */}
              <div style={{
                display: "flex",
                gap: 6,
                marginTop: 10,
              }}>
                {onApprovePayment && !isPaid(b) && (
                  <button
                    onClick={() => onApprovePayment(b)}
                    style={btnGreen}
                  >
                    Patvirtinti apmokėjimą
                  </button>
                )}

                {onDownloadReceipt && (
                  <button
                    onClick={() => onDownloadReceipt(b)}
                    style={btnBlue}
                  >
                    Kvitas
                  </button>
                )}

                <button
                  onClick={() => onDeleteBooking(b)}
                  style={btnRed}
                >
                  Ištrinti
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* === COMPACT VIEW (S2) === */}
      {viewMode === "compact" && (
        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}>
          {filtered.map((b) => {
            const [open, setOpen] = useState(false);

            return (
              <div
                key={b.id}
                style={{
                  borderRadius: 14,
                  padding: 10,
                  background: "rgba(15,23,42,0.75)",
                  border: "1px solid rgba(129,140,248,0.45)",
                }}
              >
                {/* Верхняя полоса */}
                <div
                  onClick={() => setOpen(!open)}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    cursor: "pointer",
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>
                      {fmtDate(b.start)}
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.7 }}>
                      {fmtTime(b.start)} – {fmtTime(b.end)}
                    </div>
                  </div>

                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}>
                    <div style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: "#4ade80",
                    }}>
                      €{b.price}
                    </div>

                    <div
                      style={{
                        fontSize: 18,
                        transform: open ? "rotate(180deg)" : "rotate(0deg)",
                        transition: "0.25s",
                      }}
                    >
                      ▼
                    </div>
                  </div>
                </div>

                {/* Раскрывающаяся карточка */}
                {open && (
                  <div style={{ marginTop: 10 }}>
                    <div style={{ opacity: 0.8, marginBottom: 6 }}>
                      {(b.services || []).join(", ")}
                    </div>

                    {/* Кнопки */}
                    <div style={{
                      display: "flex",
                      gap: 6,
                      flexWrap: "wrap",
                    }}>
                      {onApprovePayment && !isPaid(b) && (
                        <button
                          onClick={() => onApprovePayment(b)}
                          style={btnGreen}
                        >
                          Patvirtinti apmokėjimą
                        </button>
                      )}

                      {onDownloadReceipt && (
                        <button
                          onClick={() => onDownloadReceipt(b)}
                          style={btnBlue}
                        >
                          Kvitas
                        </button>
                      )}

                      <button
                        onClick={() => onDeleteBooking(b)}
                        style={btnRed}
                      >
                        Ištrinti
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
