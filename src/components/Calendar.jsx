import { useState, useEffect } from "react";
import { getCurrentUser } from "../lib/storage";
import { useI18n } from "../lib/i18n";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  isSameDay,
  isSameMonth,
} from "date-fns";

export default function Calendar() {
  const user = getCurrentUser();
  const { t } = useI18n();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [availableSlots, setAvailableSlots] = useState([]);
  const [modalInfo, setModalInfo] = useState(null);

  const [showPrices, setShowPrices] = useState(true);
  const [showPriceList, setShowPriceList] = useState(true);

  useEffect(() => {
    generateSlotsForDay(selectedDate);
  }, [selectedDate]);

  const generateSlotsForDay = (date) => {
    const slots = [];
    for (let i = 4; i <= 22; i++) {
      const hour = i.toString().padStart(2, "0") + ":00";
      slots.push(hour);
    }
    setAvailableSlots(slots);
  };

  const handleSlotClick = (slot) => {
    setModalInfo({
      date: format(selectedDate, "dd.MM.yyyy"),
      time: slot,
    });
  };

  const daysOfWeek = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

  const renderCalendar = () => {
    const monthStart = startOfMonth(selectedDate);
    const monthEnd = endOfMonth(selectedDate);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const rows = [];
    let days = [];
    let day = startDate;

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const cloneDay = day;
        days.push(
          <div
            key={day}
            onClick={() => setSelectedDate(cloneDay)}
            style={{
              padding: "18px 0",
              borderRadius: "10px",
              margin: "4px",
              background: isSameDay(day, selectedDate)
                ? "rgba(150, 80, 255, 0.25)"
                : "rgba(20, 15, 35, 0.55)",
              border: isSameDay(day, selectedDate)
                ? "2px solid rgba(180, 90, 255, 0.9)"
                : "1px solid rgba(120, 80, 200, 0.35)",
              opacity: isSameMonth(day, monthStart) ? 1 : 0.35,
              cursor: "pointer",
              textAlign: "center",
              color: "#fff",
              fontSize: "15px",
            }}
          >
            {format(day, "d")}
          </div>
        );
        day = addDays(day, 1);
      }

      rows.push(
        <div
          key={day}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            width: "100%",
          }}
        >
          {days}
        </div>
      );
      days = [];
    }

    return <div>{rows}</div>;
  };

  return (
    <div style={{ width: "100%", marginTop: "20px" }}>
      {/* ===================== PROFILE (если залогинен) ===================== */}
      {user && (
        <div
          style={{
            background: "rgba(18,10,30,0.75)",
            borderRadius: "18px",
            padding: "18px 26px",
            marginBottom: "20px",
            border: "1px solid rgba(150,80,255,0.3)",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ fontSize: "20px", fontWeight: 600 }}>
              {user.name}
            </div>
            <div style={{ opacity: 0.8 }}>{user.phone}</div>
            <div style={{ opacity: 0.8 }}>{user.email}</div>
            {user.instagram && (
              <div style={{ opacity: 0.8 }}>{user.instagram}</div>
            )}
          </div>

          <button
            style={{
              padding: "12px 34px",
              borderRadius: "14px",
              fontSize: "0.95rem",
              fontWeight: 500,
              background: "rgba(80,0,160,0.55)",
              border: "1px solid rgba(170,90,255,0.85)",
              color: "#fff",
              cursor: "pointer",
              whiteSpace: "nowrap",
              alignSelf: "center",
            }}
            onClick={() => {
              localStorage.removeItem("currentUser");
              window.location.reload();
            }}
          >
            Выйти
          </button>
        </div>
      )}

      {/* ===================== KAINAS SECTION ===================== */}
      <div style={{ width: "100%", marginBottom: "22px" }}>
        <h2
          style={{
            color: "white",
            fontSize: "22px",
            fontWeight: 600,
            paddingLeft: "6px",
            marginBottom: "10px",
          }}
        >
          Kainas
        </h2>

        {/* Кнопка раскрытия */}
        <div
          style={{
            background: "rgb(20,15,35)",
            border: "1px solid rgba(150,80,255,0.35)",
            padding: "16px 18px",
            borderRadius: "10px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            marginBottom: "16px",
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

        {showPriceList && (
          <div
            style={{
              background: "rgba(20,10,40,0.9)",
              border: "1px solid rgba(160,80,255,0.3)",
              borderRadius: "14px",
              padding: "22px 26px",
              color: "white",
              lineHeight: "1.55",
              fontSize: "17px",
            }}
          >
            <div style={{ marginBottom: "16px" }}>
              <b>80–130 €</b><br />
              Šukuosenos kaina<br />
              <span style={{ opacity: 0.75 }}>
                Priklauso nuo darbo apimties
              </span>
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
                Daiktų kraustymai, važinėjimai — per tą laiką galiu priimti kitą klientę.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ===================== CALENDAR NAVIGATION ===================== */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "16px",
          marginBottom: "14px",
        }}
      >
        <button
          onClick={() => setSelectedDate(subMonths(selectedDate, 1))}
          style={navBtn}
        >
          ←
        </button>

        <div style={{ fontSize: "18px", color: "#fff" }}>
          {format(selectedDate, "MMMM yyyy")}
        </div>

        <button
          onClick={() => setSelectedDate(addMonths(selectedDate, 1))}
          style={navBtn}
        >
          →
        </button>
      </div>

      {/* ===================== CALENDAR GRID ===================== */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          textAlign: "center",
          marginBottom: "10px",
        }}
      >
        {daysOfWeek.map((d) => (
          <div key={d} style={{ color: "#fff", opacity: 0.8, paddingBottom: 8 }}>
            {d}
          </div>
        ))}
      </div>

      {renderCalendar()}

      {/* ===================== SLOTS ===================== */}
      <h3
        style={{
          color: "#fff",
          marginTop: "20px",
          marginBottom: "6px",
          paddingLeft: "6px",
        }}
      >
        Слоты на {format(selectedDate, "dd.MM.yyyy")}
      </h3>

      {availableSlots.map((slot) => (
        <div
          key={slot}
          onClick={() => handleSlotClick(slot)}
          style={slotStyle}
        >
          {slot}
        </div>
      ))}

      {/* ===================== MODAL ===================== */}
      {modalInfo && (
        <div style={modalBack}>
          <div style={modalWindow}>
            <h2 style={{ marginBottom: "10px" }}>Запись создана!</h2>
            <div>{modalInfo.date}</div>
            <div style={{ marginBottom: "10px" }}>{modalInfo.time}</div>
            <button
              onClick={() => setModalInfo(null)}
              style={modalBtn}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ===================== STYLES ===================== */

const navBtn = {
  background: "rgba(60,20,100,0.6)",
  border: "1px solid rgba(160, 80, 255, 0.4)",
  borderRadius: "10px",
  padding: "6px 12px",
  color: "#fff",
  cursor: "pointer",
};

const slotStyle = {
  background: "rgba(20,15,40,0.6)",
  border: "1px solid rgba(150,80,255,0.3)",
  borderRadius: "10px",
  padding: "12px",
  marginBottom: "6px",
  color: "#fff",
  cursor: "pointer",
  textAlign: "center",
  fontSize: "15px",
};

const modalBack = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  background: "rgba(0,0,0,0.6)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 999,
};

const modalWindow = {
  background: "rgb(30,20,50)",
  padding: "28px",
  borderRadius: "12px",
  border: "1px solid rgba(180,90,255,0.4)",
  color: "#fff",
  textAlign: "center",
  width: "320px",
};

const modalBtn = {
  marginTop: "14px",
  padding: "10px 24px",
  background: "rgba(120,60,200,0.9)",
  border: "1px solid rgba(180,90,255,0.5)",
  borderRadius: "10px",
  color: "#fff",
  cursor: "pointer",
};
