// /pages/api/mail/booking-paid.js
import nodemailer from "nodemailer";

const logoUrl = "https://registracija-iz.vercel.app/logo-email.png";

const translations = {
  lt: {
    title: "Apmokėjimas gautas! ✅",
    greeting: "Ačiū",
    text: "Jūsų rezervacija dabar pilnai apmokėta.",
    data: "Data",
    laikas: "Laikas",
    paslaugos: "Paslaugos",
    suma: "Pilnai apmokėta suma",
    kvitas: "Kvitą galite parsisiųsti savo paskyroje arba admin panelėje.",
  },
  ru: {
    title: "Оплата получена! ✅",
    greeting: "Спасибо",
    text: "Ваша запись теперь полностью оплачена.",
    data: "Дата",
    laikas: "Время",
    paslaugos: "Услуги",
    suma: "Полностью оплаченная сумма",
    kvitas: "Квитанцию можно скачать в личном кабинете или админке.",
  },
  en: {
    title: "Payment received! ✅",
    greeting: "Thank you",
    text: "Your booking is now fully paid.",
    data: "Date",
    laikas: "Time",
    paslaugos: "Services",
    suma: "Fully paid amount",
    kvitas: "You can download the receipt in your account or admin panel.",
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

  const date = new Date(booking.start).toLocaleDateString(lang === "lt" ? "lt-LT" : lang === "ru" ? "ru-RU" : "en-GB");
  const time = `${new Date(booking.start).toLocaleTimeString(lang === "lt" ? "lt-LT" : "en-US", { hour: "2-digit", minute: "2-digit" })} – ${new Date(booking.end).toLocaleTimeString(lang === "lt" ? "lt-LT" : "en-US", { hour: "2-digit", minute: "2-digit" })}`;

  const html = `
<div style="font-family:Arial,sans-serif;background:#f9f5ff;padding:40px 20px;">
  <div style="max-width:520px;margin:0 auto;background:white;padding:32px;border-radius:20px;box-shadow:0 8px 30px rgba(160,100,255,0.15);text-align:center;">
    <img src="${logoUrl}" style="width:180px;margin-bottom:24px;" alt="IZ Hair Trend"/>
    <h1 style="color:#000;font-size:26px;margin:0 0 20px 0;font-weight:700;">${t.title}</h1>
    <p style="font-size:17px;color:#333;margin:0 0 30px 0;">
      ${t.greeting}, <b>${booking.userName || "kliente"}</b>!<br><br>
      ${t.text}
    </p>
    <div style="background:linear-gradient(135deg, #34d399, #10b981);padding:24px;border-radius:16px;color:#fff;font-size:16px;line-height:1.8;">
      <div><b>${t.data}:</b> ${date}</div>
      <div><b>${t.laikas}:</b> ${time}</div>
      <div><b>${t.paslaugos}:</b> ${booking.services?.join(", ") || "—"}</div>
      <div style="margin-top:12px;font-size:18px;font-weight:700;">
        ✅ ${t.suma}: ${booking.price || 0} €
      </div>
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

    console.log(`Оплата — письмо отправлено на ${booking.userEmail} (${lang})`);
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("PAID EMAIL ERROR:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
}
