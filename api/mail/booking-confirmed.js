// /pages/api/mail/booking-confirmed.js
import nodemailer from "nodemailer";

const logoUrl = "https://registracija-iz.vercel.app/logo-email.png";

const translations = {
  lt: {
    title: "Rezervacija patvirtinta!",
    greeting: "Sveiki",
    text: "Jūsų rezervacija buvo sėkmingai patvirtinta{paid}.",
    paidText: " ir apmokėta",
    data: "Data",
    laikas: "Laikas",
    paslaugos: "Paslaugos",
    apmoketa: "Apmokėta",
    kvitas: "Kvitą galite atsisiųsti savo paskyroje",
  },
  ru: {
    title: "Запись подтверждена!",
    greeting: "Здравствуйте",
    text: "Ваша запись была успешно подтверждена{paid}.",
    paidText: " и оплачена",
    data: "Дата",
    laikas: "Время",
    paslaugos: "Услуги",
    apmoketa: "Оплачено",
    kvitas: "Квитанцию можно скачать в личном кабинете",
  },
  en: {
    title: "Booking confirmed!",
    greeting: "Hello",
    text: "Your booking has been successfully confirmed{paid}.",
    paidText: " and paid",
    data: "Date",
    laikas: "Time",
    paslaugos: "Services",
    apmoketa: "Paid",
    kvitas: "You can download the receipt in your account",
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { booking } = req.body || {};
  if (!booking || !booking.userEmail) return res.status(200).json({ ok: true });

  const lang = booking.userLang || "lt";
  const t = translations[lang] || translations["lt"];

  const date = new Date(booking.start).toLocaleDateString("lt-LT", { year: "numeric", month: "2-digit", day: "2-digit" });
  const time = `${new Date(booking.start).toLocaleTimeString("lt-LT", { hour: "2-digit", minute: "2-digit" })} – ${new Date(booking.end).toLocaleTimeString("lt-LT", { hour: "2-digit", minute: "2-digit" })}`;
  const paidStr = booking.paid ? t.paidText : "";

  const html = `
<div style="font-family:Arial,sans-serif;background:#ffffff;padding:40px 20px;">
  <div style="max-width:480px;margin:0 auto;background:#ffffff;padding:40px 20px;border-radius:24px;text-align:center;">
    <img src="${logoUrl}" style="width:240px;margin-bottom:32px;" alt="Irina Žilina IZ Hair Trend"/>
    <h1 style="font-size:29px;font-weight:700;color:#000;margin:0 0 24px;line-height:1.2;">${t.title}</h1>
    <p style="font-size:17px;color:#333;margin:0 0 32px;line-height:1.6;">
      ${t.greeting}, <b>${booking.userName || "kliente"}</b>!<br><br>
      ${t.text.replace("{paid}", paidStr)}
    </p>
    <div style="background:#fdf4ff;padding:26px 20px;border-radius:18px;margin:0 auto 32px auto;">
      <div style="font-size:16px;color:#333;line-height:1.45;text-align:center;word-wrap:break-word;overflow-wrap:break-word;hyphens:auto;">
        <div><b>${t.data}:</b> ${date}</div>
        <div style="margin-top:6px;"><b>${t.laikas}:</b> ${time}</div>
        <div style="margin-top:6px;"><b>${t.paslaugos}:</b><br>${booking.services?.join("<br>") || "—"}</div>
        <div style="margin-top:6px;"><b>${t.apmoketa}:</b> ${booking.paid ? (booking.price + " €") : "Dar ne"}</div>
      </div>
    </div>
    <p style="font-size:14px;color:#888;margin:0;line-height:1.5;">${t.kvitas}</p>
  </div>
</div>`;

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === "true",
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    await transporter.sendMail({ from: `"IZ Hair Trend" <${process.env.FROM_EMAIL}>`, to: booking.userEmail, subject: t.title, html });
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("CONFIRM EMAIL ERROR:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
}
