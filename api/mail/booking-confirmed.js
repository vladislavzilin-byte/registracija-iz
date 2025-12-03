// /pages/api/mail/booking-confirmed.js
import nodemailer from "nodemailer";

const translations = {
  lt: {
    subject: "Jūsų rezervacija patvirtinta! ✓",
    title: "Rezervacija patvirtinta! 🎉",
    greeting: "Sveiki",
    text: "Jūsų rezervacija buvo <b>patvirtinta{paid}</b>.",
    paidText: " ir apmokėta",
    info: "Pridedame kvito PDF.",
  },
  ru: {
    subject: "Ваша запись подтверждена! ✓",
    title: "Запись подтверждена! 🎉",
    greeting: "Здравствуйте",
    text: "Ваша запись была <b>подтверждена{paid}</b>.",
    paidText: " и оплачена",
    info: "Прикрепляем PDF-квитанцию.",
  },
  en: {
    subject: "Your booking is confirmed! ✓",
    title: "Booking confirmed! 🎉",
    greeting: "Hello",
    text: "Your booking has been <b>confirmed{paid}</b>.",
    paidText: " and paid",
    info: "PDF receipt attached.",
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { booking } = req.body;
  if (!booking?.userEmail || !booking?.id) {
    return res.status(400).json({ ok: false, error: "No booking data" });
  }

  const lang = booking.userLang || "lt"; // важно: сохраняй язык пользователя в booking.userLang при создании брони!
  const t = translations[lang] || translations["lt"];

  const date = new Date(booking.start).toLocaleDateString(lang === "lt" ? "lt-LT" : lang === "ru" ? "ru-RU" : "en-GB");
  const time = `${new Date(booking.start).toLocaleTimeString(lang === "lt" ? "lt-LT" : "en-US", { hour: "2-digit", minute: "2-digit" })} – ${new Date(booking.end).toLocaleTimeString(lang === "lt" ? "lt-LT" : "en-US", { hour: "2-digit", minute: "2-digit" })}`;

  const paidStr = booking.paid ? t.paidText : "";

  const html = `
<div style="font-family:Arial,sans-serif;background:#f8f8f8;padding:40px 20px;">
  <div style="max-width:520px;margin:0 auto;background:white;padding:32px;border-radius:16px;box-shadow:0 4px 20px rgba(0,0,0,0.1);text-align:center;">
    <img src="https://izhairtrend.lt/logo-email.png" style="width:170px;margin-bottom:20px;" alt="IZ Hair Trend"/>
    <h2 style="color:#000;font-size:24px;margin-bottom:20px;">${t.title}</h2>
    <p style="font-size:16px;color:#333;line-height:1.6;">
      ${t.greeting}, <b>${booking.userName || "kliente"}</b>!<br><br>
      ${t.text.replace("{paid}", paidStr)}
    </p>
    <div style="background:#f3f3ff;padding:20px;border-radius:12px;margin:30px 0;font-size:15px;line-height:1.7;">
      <b>Data:</b> ${date}<br>
      <b>Laikas:</b> ${time}<br>
      <b>Paslaugos:</b> ${booking.services?.join(", ") || "—"}<br>
      <b>Apmokėta:</b> ${booking.paid ? (booking.price + " €") : "Dar ne"}
    </div>
    <p style="color:#666;font-size:14px;">${t.info}</p>
  </div>
</div>`;

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: `"IZ Hair Trend" <${process.env.FROM_EMAIL}>`,
      to: booking.userEmail,
      subject: t.subject,
      html,
      attachments: booking.paid || booking.price ? [{
        filename: `kvitas-${booking.id.slice(0,6)}.pdf`,
        path: `https://izhairtrend.lt/api/receipt-pdf?id=${booking.id}`, // или твой домен
        contentType: "application/pdf"
      }] : [],
    });

    // === SMS (если хочешь — раскомментируй когда настроишь sms.ru) ===
    /*
    if (booking.userPhone) {
      await fetch("https://izhairtrend.lt/api/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: booking.userPhone,
          type: "confirmed",
          date,
          time,
          services: booking.services,
          lang,
        }),
      });
    }
    */

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("CONFIRM EMAIL ERROR:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
}
