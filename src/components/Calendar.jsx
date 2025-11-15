import { useState, useMemo } from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  isSameMonth,
  isSameDay,
  format,
} from "date-fns";
import {
  getBookings,
  saveBookings,
  getSettings,
  getCurrentUser,
  id,
  isSameMinute,
} from "../lib/storage";
import { useI18n } from "../lib/i18n";

export default function Calendar() {
  const { t } = useI18n();

  const settings = getSettings();
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState(null);
  const [processingISO, setProcessingISO] = useState(null);
  const [bookedISO, setBookedISO] = useState([]);

  // --- PRICE DROPDOWN ---
  const [showPriceList, setShowPriceList] = useState(false);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = useMemo(() => {
    const arr = [];
    let d = new Date(gridStart);
    while (d <= gridEnd) {
      arr.push(new Date(d));
      d = addDays(d, 1);
    }
    return arr;
  }, [currentMonth]);

  const bookings = getBookings();

  const slotsForDay = (d) => {
    const [sh, sm] = settings.workStart.split(":").map(Number);
    const [eh, em] = settings.workEnd.split(":").map(Number);

    const start = new Date(d);
    start.setHours(sh, sm, 0, 0);

    const end = new Date(d);
    end.setHours(eh, em, 0, 0);

    const slots = [];
    let cur = new Date(start);

    while (cur <= end) {
      slots.push(new Date(cur));
      cur = new Date(cur.getTime() + settings.slotMinutes * 60000);
    }

    return slots;
  };

  const isTaken = (t) => {
    const stored = bookings.some(
      (b) =>
        (b.status === "approved" || b.status === "pending") &&
        isSameMinute(b.start, t)
    );

    const processing = processingISO && isSameMinute(processingISO, t);
    const local = bookedISO.some((x) => isSameMinute(x, t));

    return stored || processing || local;
  };

  const book = (time) => {
    const user = getCurrentUser();
    if (!user) {
      alert(t("login_or_register"));
      return;
    }
    if (isTaken(time)) {
      alert(t("already_booked"));
      return;
    }

    setBusy(true);
    setProcessingISO(new Date(time));

    const end = new Date(time);
    end.setMinutes(end.getMinutes() + settings.slotMinutes);

    const newBooking = {
      id: id(),
      userPhone: user.phone,
      userName: user.name,
      userInstagram: user.instagram || "",
      start: time,
      end,
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    setTimeout(() => {
      saveBookings([...bookings, newBooking]);
      setBookedISO((prev) => [...prev, new Date(time)]);
      setBusy(false);
      setProcessingISO(null);

      setModal({
        title: t("booked_success"),
        dateStr: format(time, "dd.MM.yyyy"),
        timeStr: format(time, "HH:mm") + " – " + format(end, "HH:mm"),
        caption: t("wait_confirmation") + " " + t("details_in_my"),
      });
    }, 800);
  };

  return (
    <div className="card">

      {/* =====================  KAINAS SECTION  ===================== */}
      <div style={{ width: "100%", marginBottom: "20px" }}>
        <h2
          style={{
            color: "white",
            fontSize: "24px",
            fontWeight: 700,
            marginBottom: "16px",
          }}
        >
          Kainas
        </h2>

        {/* DROPDOWN HEADER */}
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

          <span style={{ color: "white", fontSize: "17px" }}>Žiūrėti kainas</span>
        </div>

        {/* PRICE LIST */}
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
              <b>80–130 €</b>
              <br />
              Šukuosenos kaina
              <br />
              <span style={{ opacity: 0.75 }}>Priklauso nuo darbo apimties</span>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <b>25 €</b>
              <br />
              Konsultacija
              <br />
              <span style={{ opacity: 0.75 }}>
                Užtrunkame nuo 30 min. iki valandos
              </span>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <b>50 € užstatas</b>
              <br />
              <b>100 €</b>
              <br />
              Plaukų Tresų nuoma
              <br />
              <span style={{ opacity: 0.75 }}>
                Grąžinti reikia per 3/4 d. Grąžinate plaukus, grąžinu užstatą
              </span>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <b>Iki 20 €</b>
              <br />
              Papuošalų nuoma
            </div>

            <div>
              <b>130 €</b>
              <br />
              Atvykimas Klaipėdoje
              <br />
              <span style={{ opacity: 0.75 }}>
                Daiktų kraustymai, važinėjimai – per tą laiką galiu priimti kitą
                klientę.
              </span>
            </div>
          </div>
        )}
      </div>
      {/* ===================== END KAINAS ===================== */}

      {/* ------------------- OLD CALENDAR DESIGN BELOW ------------------- */}

      <div className="calendar-controls">
        <button onClick={() => setCurrentMonth(addMonths(currentMonth, -1))}>
          ←
        </button>

        <div className="month-title">
          {format(currentMonth, "MMMM yyyy")}
        </div>

        <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
          →
        </button>
      </div>

      {/* DAYS GRID */}
      <div className="days-grid">
        {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((w, i) => (
          <div key={i} className="weekday">
            {w}
          </div>
        ))}

        {days.map((d, idx) => {
          const inMonth = isSameMonth(d, currentMonth);
          const active = isSameDay(d, selectedDate);
          return (
            <div
              key={idx}
              onClick={() => setSelectedDate(d)}
              className="day-cell"
              style={{
                opacity: inMonth ? 1 : 0.35,
                background: active
                  ? "rgba(130,60,255,0.25)"
                  : "rgba(255,255,255,0.03)",
                border:
                  active && "1px solid rgba(168,85,247,0.7)",
              }}
            >
              {format(d, "d")}
            </div>
          );
        })}
      </div>

      {/* SLOTS */}
      <div className="slots-header">
        Слоты на {format(selectedDate, "dd.MM.yyyy")}
      </div>

      <div className="slots-list">
        {slotsForDay(selectedDate).map((ti) => {
          const taken = isTaken(ti);
          return (
            <button
              key={ti.toISOString()}
              disabled={taken}
              className="slot-btn"
              onClick={() => book(ti)}
            >
              {format(ti, "HH:mm")}
            </button>
          );
        })}
      </div>

      {/* MODAL */}
      {modal && (
        <div className="modal-bg" onClick={() => setModal(null)}>
          <div className="modal-window" onClick={(e) => e.stopPropagation()}>
            <h3>{modal.title}</h3>
            <p>{modal.dateStr}</p>
            <p>{modal.timeStr}</p>
            <p>{modal.caption}</p>

            <button className="ok-btn" onClick={() => setModal(null)}>
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
