// /pages/api/mail/booking-confirmed.js
import nodemailer from "nodemailer";

const logoUrl = "https://registracija-iz.vercel.app/logo-email.png";

const translations = {
  lt: {
    subject: "Jūsų rezervacija patvirtinta!",
    title: "Rezervacija patvirtinta!",
    greeting: "Sveiki",
    text: "Jūsų rezervacija buvo <b>patvirtinta{paid}</b>.",
    paidText: " ir apmokėta",
    data: "Data",
    laikas: "Laikas",
    paslaugos: "Paslaugos",
    apmoketa: "Apmokėta",
    kvitas: "Kvitą galite atsisiųsti savo paskyroje",
  },
  ru: {
    subject: "Ваша запись подтверждена!",
    title: "Запись подтверждена!",
    greeting: "Здравствуйте",
    text: "Ваша запись была <b>подтверждена{paid}</b>.",
    paidText: " и оплачена",
    data: "Дата",
    laikas: "Время",
    paslaugos: "Услуги",
    apmoketa: "Оплачено",
    kvitas: "Квитанцию можно скачать в личном кабинете",
  },
  en: {
    subject: "Your booking is confirmed!",
    title: "Booking confirmed!",
    greeting: "Hello",
    text: "Your booking has been <b>confirmed{paid}</b>.",
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

  if (!booking || !booking.userEmail) {
    return res.status(200).json({ ok: true });
  }

  const lang = booking.userLang || "lt";
  const t = translations[lang] || translations["lt"];

  const date = new Date(booking.start).toLocaleDateString("lt-LT", { year: "numeric", month: "2-digit", day: "2-digit" });
  const time = `${new Date(booking.start).toLocaleTimeString("lt-LT", { hour: "2-digit", minute: "2-digit" })} – ${new Date(booking.end).toLocaleTimeString("lt-LT", { hour: "2-digit", minute: "2-digit" })}`;

  const paidStr = booking.paid ? t.paidText : "";

  const html = `
<div style="font-family:Arial,sans-serif;background:#ffffff;padding:40px 20px;">
  <div style="max-width:480px;margin:0 auto;background:#ffffff;padding:40px 20px;border-radius:24px;text-align:center;">
    <img src="${logoUrl}" style="width:240px;margin-bottom:32px;" alt="Irina Žilina IZ Hair Trend"/>
    <h1 style="font-size:29px;font-weight:700;color:#000;margin:0 0 24px;line-height:1.2;">
      ${t.title}
    </h1>
    <p style="font-size:17px;color:#333;margin:0 0 32px;line-height:1.6;">
      ${t.greeting}, <b>${booking.userName || "kliente"}</b>!<br><br>
      ${t.text.replace("{paid}", paidStr)}
    </p>
    <div style="background:#fdf4ff;padding:20px 32px;border-radius:18px;margin:0 auto 32px auto;">
      <div style="font-size:16px;color:#333;line-height:1.3;text-align:left;">
        <div><b>${t.data}:</b> ${date}</div>
        <div style="margin-top:4px;"><b>${t.laikas}:</b> ${time}</div>
        <div style="margin-top:4px;"><b>${t.paslaugos}:</b> ${booking.services?.join(", ") || "—"}</div>
        <div style="margin-top:4px;"><b>${t.apmoketa}:</b> ${booking.paid ? (booking.price + " €") : "Dar ne"}</div>
      </div>
    </div>
    <p style="font-size:14px;color:#888;margin:0;line-height:1.5;">
      ${t.kvitas}
    </p>
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
    });

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("CONFIRM EMAIL ERROR:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
}
