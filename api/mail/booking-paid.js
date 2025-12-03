// /pages/api/mail/booking-paid.js
import nodemailer from "nodemailer";

const logoUrl = "https://registracija-iz.vercel.app/logo-email.png";

const translations = {
  lt: {
    title: "Apmokėjimas gautas!",
    greeting: "Sveiki",
    text: "Jūsų rezervacija dabar pilnai apmokėta.",
    data: "Data",
    laikas: "Laikas",
    suma: "Suma",
    kvitas: "Kvitą galite atsisiųsti savo paskyroje",
  },
  ru: {
    title: "Оплата получена!",
    greeting: "Здравствуйте",
    text: "Ваша запись теперь полностью оплачена.",
    data: "Дата",
    laikas: "Время",
    suma: "Сумма",
    kvitas: "Квитанцию можно скачать в личном кабинете",
  },
  en: {
    title: "Payment received!",
    greeting: "Hello",
    text: "Your booking is now fully paid.",
    data: "Date",
    laikas: "Time",
    suma: "Amount",
    kvitas: "You can download the receipt in your account",
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { booking } = req.body || {};

  if (!booking || !booking.userEmail || !booking.paid) {
    return res.status(200).json({ ok: true });
  }

  const lang = booking.userLang || "lt";
  const t = translations[lang] || translations["lt"];

  const date = new Date(booking.start).toLocaleDateString(lang === "lt" ? "lt-LT" : lang === "ru" ? "ru-RU" : "en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
  const time = `${new Date(booking.start).toLocaleTimeString(lang === "lt" ? "lt-LT" : "en-US", { hour: "2-digit", minute: "2-digit" })} – ${new Date(booking.end).toLocaleTimeString(lang === "lt" ? "lt-LT" : "en-US", { hour: "2-digit", minute: "2-digit" })}`;

  const html = `
<div style="font-family:Arial,sans-serif;background:#f8f8f8;padding:40px 20px;">
  <div style="max-width:480px;margin:0 auto;background:white;padding:40px 30px;border-radius:24px;text-align:center;box-shadow:0 10px 30px rgba(0,0,0,0.08);">
    <img src="${logoUrl}" style="width:220px;margin-bottom:30px;" alt="Irina Žilina IZ Hair Trend"/>
    <h1 style="font-size:28px;font-weight:700;color:#000;margin:0 0 20px 0;">
      ${t.title} ✅
    </h1>
    <p style="font-size:17px;color:#333;margin:0 0 30px 0;line-height:1.6;">
      ${t.greeting}, <b>${booking.userName || "kliente"}</b>!<br><br>
      ${t.text}
    </p>
    <div style="background:#ecfdf5;padding:24px;border-radius:16px;margin:30px 0;">
      <div style="font-size:16px;color:#333;line-height:1.8;text-align:left;max-width:300px;margin:0 auto;">
        <div><b>${t.data}:</b> ${date}</div>
        <div><b>${t.laikas}:</b> ${time}</div>
        <div style="margin-top:12px;font-size:18px;font-weight:700;color:#166534;">
          ✅ ${t.suma}: ${booking.price || 0} €
        </div>
      </div>
    </div>
    <p style="font-size:14px;color:#666;margin-top:30px;">
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
      subject: t.title + " ✅",
      html,
    });

    console.log(`Оплата — письмо отправлено на ${booking.userEmail} (${lang})`);
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("PAID EMAIL ERROR:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
}
