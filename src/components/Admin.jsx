import { useState, useMemo } from "react";
import {
  getBookings,
  saveBookings,
  fmtDate,
  fmtTime
} from "../lib/storage";

// === Цветные лампочки ===
const lamp = (color) => ({
  width: 12,
  height: 12,
  borderRadius: "50%",
  background: color,
  boxShadow: `0 0 6px ${color}`,
  display: "inline-block"
});

// === Проверка оплаты ===
const isPaid = (b) => !!(b?.paid || b?.status === "approved_paid");

// === Отображение лампы ===
const statusDot = (b) => {
  const paid = isPaid(b);

  if (b.status === "approved" || b.status === "approved_paid") {
    return <span style={lamp(paid ? "#22c55e" : "#f97316")} />;
  }
  if (b.status === "pending") {
    return <span style={lamp("#facc15")} />;
  }
  return <span style={lamp("#ef4444")} />; // отменено
};

// === Текст статуса ===
const statusText = (b) => {
  const paid = isPaid(b);

  if (b.status === "approved" || b.status === "approved_paid") {
    return paid
      ? "Бронирование подтверждено • Оплачено"
      : "Бронирование подтверждено • Ожидает оплаты";
  }

  if (b.status === "pending") {
    return paid
      ? "Ожидает подтверждения • Оплачено"
      : "Ожидает подтверждения • Не оплачено";
  }

  if (b.status === "canceled_client" || b.status === "canceled_admin") {
    return "Отменено";
  }

  return b.status;
};

// === Генерация квитанции ===
const downloadReceipt = (b) => {
  try {
    const win = window.open("", "_blank", "width=700,height=900");
    if (!win) return;

    const dateStr = fmtDate(b.start);
    const timeStr = `${fmtTime(b.start)} – ${fmtTime(b.end)}`;
    const servicesStr = (b.services || []).join(", ");
    const paidLabel = isPaid(b) ? "Оплачено" : "Не оплачено";

    const html = `
      <html><body style="background:#0b0217;color:white;padding:20px">
        <h2>Квитанция #${b.id.slice(0, 6)}</h2>

        <img src="/logo2.svg" style="height:90px;margin-bottom:20px"/>

        <div>Дата: <b>${dateStr}</b></div>
        <div>Время: <b>${timeStr}</b></div>
        <div>Услуги: <b>${servicesStr}</b></div>
        <div>Оплата: <b>${paidLabel}</b></div>

        <br><br>
        <script>window.print()</script>
      </body></html>
    `;

    win.document.write(html);
    win.document.close();
  } catch (e) {
    console.error("Receipt error:", e);
  }
};

export default function Admin() {
  const [filter, setFilter] = useState("all");

  // Загружаем брони
  const bookings = getBookings().sort(
    (a, b) => new Date(a.start) - new Date(b.start)
  );

  // === Фильтрация ===
  const list = useMemo(() => {
    if (filter === "pending") {
      return bookings.filter((b) => b.status === "pending");
    }

    if (filter === "approved") {
      return bookings.filter(
        (b) =>
          b.status === "approved" ||
          b.status === "approved_paid"
      );
    }

    if (filter === "canceled") {
      return bookings.filter(
        (b) =>
          b.status === "canceled_client" ||
          b.status === "canceled_admin"
      );
    }

    return bookings; // all
  }, [filter, bookings]);

  // === Кнопки фильтров ===
  const btn = (name, label) => (
    <button
      onClick={() => setFilter(name)}
      style={{
        padding: "10px 18px",
        borderRadius: 10,
        cursor: "pointer",
        border:
          filter === name
            ? "1.5px solid rgba(168,85,247,0.9)"
            : "1px solid rgba(168,85,247,0.3)",
        background:
          filter === name
            ? "rgba(150,80,255,0.25)"
            : "rgba(30,20,50,0.35)",
        color: "#fff",
        boxShadow:
          filter === name
            ? "0 0 12px rgba(150,80,255,0.3)"
            : "none",
        transition: "0.25s"
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{ padding: 20 }}>
      <h2 style={{ marginBottom: 20 }}>Все записи</h2>

      {/* === ФИЛЬТРЫ === */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        {btn("all", "Все")}
        {btn("pending", "Ожидают подтверждения")}
        {btn("approved", "Подтверждённые")}
        {btn("canceled", "Отменённые")}
      </div>

      {/* === СПИСОК БРОНЕЙ === */}
      {list.map((b) => (
        <div
          key={b.id}
          style={{
            marginBottom: 25,
            padding: 18,
            borderRadius: 14,
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(168,85,247,0.2)"
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 8
            }}
          >
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {statusDot(b)}
              <b>{fmtDate(b.start)}</b>
            </div>

            {isPaid(b) && (
              <button
                onClick={() => downloadReceipt(b)}
                style={{
                  padding: "6px 12px",
                  borderRadius: 8,
                  fontSize: 13,
                  cursor: "pointer",
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(168,85,247,0.4)",
                  color: "#fff"
                }}
              >
                📄 Скачать квитанцию
              </button>
            )}
          </div>

          <div style={{ opacity: 0.8, marginBottom: 6 }}>
            {fmtTime(b.start)} – {fmtTime(b.end)}
          </div>

          <b>{b.userName}</b>
          <br />
          {b.userPhone}

          {/* Статус */}
          <div style={{ marginTop: 10 }}>
            <span style={{ opacity: 0.8 }}>Статус: </span>

            <span
              style={{
                padding: "4px 10px",
                borderRadius: 8,
                border: "1px solid rgba(168,85,247,0.5)",
                background: "rgba(255,255,255,0.06)"
              }}
            >
              {statusText(b)}
            </span>
          </div>

          {/* Оплата */}
          <div style={{ marginTop: 8 }}>
            Avansas: <b>{b.price} €</b>
          </div>
        </div>
      ))}

      {list.length === 0 && (
        <div style={{ opacity: 0.6, marginTop: 30 }}>
          Нет записей по выбранному фильтру.
        </div>
      )}
    </div>
  );
}
