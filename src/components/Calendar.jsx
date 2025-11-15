import { useState, useEffect } from "react";
import { getUsers, getCurrentUser, saveUsers } from "../lib/storage";
import { useI18n } from "../lib/i18n";

export default function Calendar() {
  const { t } = useI18n();
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);

  const [showProfile, setShowProfile] = useState(false);
  const [showPrices, setShowPrices] = useState(false);
  const [showPriceList, setShowPriceList] = useState(false);

  const [current, setCurrent] = useState(getCurrentUser());

  // Загружаем бронь
  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("bookings") || "[]");
    setBookings(saved);
  }, []);

  const saveBookings = (list) => {
    localStorage.setItem("bookings", JSON.stringify(list));
    setBookings(list);
  };

  // Слоты
  const timeSlots = [
    "10:00",
    "11:00",
    "12:00",
    "13:00",
    "14:00",
    "15:00",
    "16:00",
    "17:00",
  ];

  // Бронирование
  const bookSlot = () => {
    if (!current) {
      alert("Пожалуйста, войдите в аккаунт");
      return;
    }
    if (!selectedDate || !selectedSlot) return;

    const newBooking = {
      date: selectedDate,
      time: selectedSlot,
      user: current.phone || current.email || current.name,
      confirmed: false,
    };

    const updated = [...bookings, newBooking];
    saveBookings(updated);

    alert("Jūsų laikas išsiųstas tvirtinimui 💜");
  };

  return (
    <div style={{ padding: "20px" }}>
      {/* ============== PROFILE / MENU BUTTON ============== */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          style={{
            background: "none",
            border: "1px solid rgba(150,80,255,0.35)",
            padding: "8px 14px",
            borderRadius: "10px",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          ☰
        </button>
      </div>

      {/* ============== MENU DROPDOWN ============== */}
      {menuOpen && (
        <div
          style={{
            marginTop: "10px",
            background: "rgba(20,10,40,0.6)",
            border: "1px solid rgba(150,80,255,0.35)",
            borderRadius: "12px",
            padding: "16px",
          }}
        >
          <div
            style={{ padding: "8px 0", cursor: "pointer", color: "#fff" }}
            onClick={() => {
              setShowProfile(true);
              setShowPrices(false);
              setMenuOpen(false);
            }}
          >
            Profilis
          </div>

          <div
            style={{
              padding: "8px 0",
              cursor: "pointer",
              color: "#fff",
              marginTop: "6px",
            }}
            onClick={() => {
              setShowPrices(true);
              setShowProfile(false);
              setMenuOpen(false);
            }}
          >
            Kainas
          </div>
        </div>
      )}

      {/* ============== PROFILE SECTION ============== */}
      {showProfile && current && (
        <div
          style={{
            marginTop: "20px",
            background: "rgba(20,10,40,0.6)",
            border: "1px solid rgba(150,80,255,0.35)",
            padding: "18px",
            borderRadius: "12px",
          }}
        >
          <h2 style={{ color: "white", marginBottom: "10px" }}>Jūsų profilis</h2>

          <div style={{ color: "white", opacity: 0.9 }}>
            <div>Vardas: {current.name}</div>
            <div>Tel: {current.phone}</div>
            <div>Email: {current.email}</div>
            <div>Instagram: {current.instagram}</div>
          </div>
        </div>
      )}

      {/* =====================  KAINAS SECTION  ===================== */}
      {showPrices && (
        <div style={{ width: "100%", marginTop: "20px" }}>
          <h2
            style={{
              color: "white",
              fontSize: "22px",
              fontWeight: "600",
              paddingLeft: "14px",
              marginBottom: "10px",
            }}
          >
            Kainas
          </h2>

          {/* Выпадашка */}
          <div
            style={{
              background: "rgb(20,15,35)",
              border: "1px solid rgba(150, 80, 255, 0.35)",
              padding: "16px 18px",
              borderRadius: "10px",
              width: "100%",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "14px",
            }}
            onClick={() => setShowPriceList(!showPriceList)}
          >
            <span
              style={{
                color: "#b37bff",
                fontSize: "20px",
                transform: showPriceList ? "rotate(180deg)" : "rotate(0deg)",
                transition: "0.25s",
              }}
            >
              ▾
            </span>

            <span style={{ color: "white", fontSize: "16px" }}>
              Žiūrėti kainas
            </span>
          </div>

          {/* Список цен */}
          {showPriceList && (
            <div
              style={{
                background: "rgba(20,10,40,0.8)",
                border: "1px solid rgba(160,80,255,0.3)",
                borderRadius: "14px",
                padding: "22px 26px",
                lineHeight: "1.55",
                fontSize: "17px",
                color: "white",
              }}
            >
              <div style={{ marginBottom: "16px" }}>
                <b>80–130 €</b><br />
                Šukuosenos kaina<br />
                <span style={{ opacity: 0.75 }}>Priklauso nuo darbo apimties</span>
              </div>

              <div style={{ marginBottom: "16px" }}>
                <b>25 €</b><br />
                Konsultacija<br />
                <span style={{ opacity: 0.75 }}>
                  Užtrunkame nuo 30 min. iki valandos
                </span>
              </div>

              <div style={{ marginBottom: "16px" }}>
                <b>50 € užstatas</b><br />
                <b>100 €</b><br />
                Plaukų Tresų nuoma<br />
                <span style={{ opacity: 0.75 }}>
                  Grąžinti reikia per 3/4 d. Grąžinate plaukus, grąžinu užstatą
                </span>
              </div>

              <div style={{ marginBottom: "16px" }}>
                <b>Iki 20 €</b><br />
                Papuošalų nuoma
              </div>

              <div>
                <b>130 €</b><br />
                Atvykimas Klaipėdoje<br />
                <span style={{ opacity: 0.75 }}>
                  Daiktų kraustymai, važinėjimai – per tą laiką galiu priimti kitą klientę.
                </span>
              </div>
            </div>
          )}
        </div>
      )}
      {/* ===================== END KAINAS SECTION ===================== */}

      {/* ============== CALENDAR ============== */}
      {!showPrices && !showProfile && (
        <>
          <h2 style={{ color: "white", marginTop: "20px" }}>
            {t("choose_date")}
          </h2>

          <input
            type="date"
            value={selectedDate || ""}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{
              marginTop: "10px",
              padding: "10px",
              borderRadius: "10px",
              border: "1px solid rgba(150,80,255,0.4)",
              background: "rgba(15,10,30,0.6)",
              color: "white",
            }}
          />

          {selectedDate && (
            <>
              <h3 style={{ color: "white", marginTop: "20px" }}>
                {t("choose_time")}
              </h3>

              <div style={{ marginTop: "10px", display: "flex", flexWrap: "wrap", gap: "10px" }}>
                {timeSlots.map((slot) => {
                  const isTaken = bookings.some(
                    (b) => b.date === selectedDate && b.time === slot
                  );
                  return (
                    <button
                      key={slot}
                      disabled={isTaken}
                      onClick={() => setSelectedSlot(slot)}
                      style={{
                        padding: "10px 18px",
                        borderRadius: "10px",
                        border:
                          selectedSlot === slot
                            ? "2px solid rgba(180,90,255,0.8)"
                            : "1px solid rgba(150,80,255,0.35)",
                        background: isTaken
                          ? "rgba(100,100,120,0.2)"
                          : "rgba(20,10,40,0.6)",
                        color: isTaken ? "gray" : "white",
                        cursor: isTaken ? "not-allowed" : "pointer",
                      }}
                    >
                      {slot}
                    </button>
                  );
                })}
              </div>

              {selectedSlot && (
                <button
                  onClick={bookSlot}
                  style={{
                    marginTop: "20px",
                    padding: "12px 22px",
                    borderRadius: "12px",
                    border: "1px solid rgba(150,80,255,0.45)",
                    background:
                      "linear-gradient(180deg, rgba(86,0,145,0.9), rgba(44,0,77,0.85))",
                    color: "white",
                    cursor: "pointer",
                  }}
                >
                  {t("confirm")}
                </button>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
