// /pages/api/mail/booking-confirmed.js
import nodemailer from "nodemailer";

const logoUrl = "https://registracija-iz.vercel.app/logo-email.png";

const translations = {
  lt: {
    title: "Rezervacija patvirtinta! 🎉",
    greeting: "Sveiki",
    text: "Jūsų rezervacija buvo patvirtinta{paid}.",
    paidText: " ir apmokėta",
    data: "Data",
    laikas: "Laikas",
    paslaugos: "Paslaugos",
    apmoketa: "Apmokėta",
    kvitas: "Kvitą galite parsisiųsti savo paskyroje arba admin panelėje.",
  },
  ru: {
    title: "Запись подтверждена! 🎉",
    greeting: "Здравствуйте",
    text: "Ваша запись была подтверждена{paid}.",
    paidText: " и оплачена",
    data: "Дата",
    laikas: "Время",
    paslaugos: "Услуги",
    apmoketa: "Оплачено",
    kvitas: "Квитанцию можно скачать в личном кабинете или админ-панели.",
  },
  en: {
    title: "Booking confirmed! 🎉",
    greeting: "Hello",
    text: "Your booking has been confirmed{paid}.",
    paidText: " and paid",
    data: "Date",
    laikas: "Time",
    paslaugos: "Services",
    apmoketa: "Paid",
    kvitas: "You can download the receipt in your account or admin panel.",
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

  const date = new Date(booking.start).toLocaleDateString(lang === "lt" ? "lt-LT" : lang === "ru" ? "ru-RU" : "en-GB");
  const time = `${new Date(booking.start).toLocaleTimeString(lang === "lt" ? "lt-LT" : "en-US", { hour: "2-digit", minute: "2-digit" })} – ${new Date(booking.end).toLocaleTimeString(lang === "lt" ? "lt-LT" : "en-US", { hour: "2-digit", minute: "2-digit" })}`;

  const paidStr = booking.paid ? t.paidText : "";

  const html = `
<div style="font-family:Arial,sans-serif;background:#f9f5ff;padding:40px 20px;">
  <div style="max-width:520px;margin:0 auto;background:white;padding:32px;border-radius:20px;box-shadow:0 8px 30px rgba(160,100,255,0.15);text-align:center;">
    <img src="${logoUrl}" style="width:180px;margin-bottom:24px;" alt="IZ Hair Trend"/>
    <h1 style="color:#000;font-size:26px;margin:0 0 20px 0;font-weight:700;">${t.title}</h1>
    <p style="font-size:17px;color:#333;margin:0 0 30px 0;">
      ${t.greeting}, <b>${booking.userName || "kliente"}</b>!<br><br>
      ${t.text.replace("{paid}", paidStr)}
    </p>
    <div style="background:linear-gradient(135deg, #c084fc, #818cf8);padding:24px;border-radius:16px;color:#fff;font-size:16px;line-height:1.8;">
      <div><b>${t.data}:</b> ${date}</div>
      <div><b>${t.laikas}:</b> ${time}</div>
      <div><b>${t.paslaugos}:</b> ${booking.services?.join(", ") || "—"}</div>
      <div><b>${t.apmoketa}:</b> ${booking.paid ? (booking.price + " €") : "Dar ne"}</div>
    </div>
    <p style="color:#666;font-size:14px;margin-top:24px;">${t.kvitas}</p>
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
      subject: t.title,
      html,
    });

    console.log(`Подтверждение отправлено на ${booking.userEmail} (${lang})`);
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("CONFIRM EMAIL ERROR:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
}
