// /pages/api/mail/booking-confirmed.js
import nodemailer from "nodemailer";

const translations = {
  title: {
    lt: "Jūsų rezervacija patvirtinta! 🎉",
    ru: "Ваша запись подтверждена! 🎉",
    en: "Your booking is confirmed! 🎉",
  },
  greeting: {
    lt: "Sveiki",
    ru: "Здравствуйте",
    en: "Hello",
  },
  text1: {
    lt: "Jūsų rezervacija buvo <b>patvirtinta{paid}</b>.",
    ru: "Ваша запись была <b>подтверждена{paid}</b>.",
    en: "Your booking has been <b>confirmed{paid}</b>.",
  },
  paidText: {
    lt: " ir apmokėta",
    ru: " и оплачена",
    en: " and paid",
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { booking } = req.body || {};
  if (!booking?.userEmail) return res.status(400).json({ ok: false });

  const lang = booking.userLang || "lt"; // ← ты должен сохранять язык пользователя в booking.userLang

  const t = translations;
  const paidStr = booking.paid ? translations.paidText[lang] : "";

  const date = new Date(booking.start).toLocaleDateString(lang === "lt" ? "lt-LT" : lang === "ru" ? "ru-RU" : "en-GB");
  const time = `${new Date(booking.start).toLocaleTimeString(lang === "lt" ? "lt-LT" : "en-US", { hour: "2-digit", minute: "2-digit" })} – ${new Date(booking.end).toLocaleTimeString(lang === "lt" ? "lt-LT" : "en-US", { hour: "2-digit", minute: "2-digit" })}`;

  const html = `
    <div style="font-family:Arial,sans-serif;background:#f4f4f4;padding:40px;">
      <div style="max-width:520px;margin:0 auto;background:white;padding:32px;border-radius:16px;box-shadow:0 4px 14px rgba(0,0,0,0.1);text-align:center;">
        <img src="https://izhairtrend.lt/logo-email.png" style="width:170px;margin-bottom:20px;" alt="IZ Hair Trend"/>
        <h2 style="color:#000;font-size:22px;margin-bottom:25px;">${t.title[lang]}</h2>
        <p style="font-size:15px;color:#444;">
          ${t.greeting[lang]}, <b>${booking.userName || "kliente"}</b>!<br><br>
          ${t.text1[lang].replace("{paid}", paidStr)}
        </p>
        <div style="background:#f8f0ff;padding:20px;border-radius:12px;margin:25px 0;font-size:15px;">
          <b>Data:</b> ${date}<br>
          <b>Laikas:</b> ${time}<br>
          <b>Paslaugos:</b> ${booking.services?.join(", ") || "—"}<br>
          <b>Apmokėta:</b> ${booking.paid ? (booking.price + " €") : "Dar ne"}
        </div>
        <p style="font-size:14px;color:#666;">Pridedame PDF kvito.</p>
      </div>
    </div>`;

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === "true",
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });

    await transporter.sendMail({
      from: `"IZ Hair Trend" <${process.env.FROM_EMAIL}>`,
      to: booking.userEmail,
      subject: t.title[lang],
      html,
      attachments: [{
        filename: `kvitas-${booking.id.slice(0,6)}.pdf`,
        path: `https://izhairtrend.lt/api/receipt-pdf?id=${booking.id}`,
        contentType: "application/pdf"
      }]
    });

    // === ОТПРАВЛЯЕМ SMS ===
    if (booking.userPhone) {
      await fetch(`${process.env.NEXT_PUBLIC_URL || "https://tavo-domenas.lt"}/api/sms/send`, {
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

    res.status(200).json({ ok: true });
  } catch (e) {
    console.error("EMAIL/SMS ERROR:", e);
    res.status(500).json({ ok: false });
  }
}
