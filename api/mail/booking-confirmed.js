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

  if (!booking || !booking.userEmail) {
    return res.status(200).json({ ok: true });
  }

  const lang = booking.userLang || "lt";
  const t = translations[lang] || translations["lt"];

  const date = new Date(booking.start).toLocaleDateString("lt-LT", { year: "numeric", month: "2-digit", day: "2-digit" });
  const time = `${new Date(booking.start).toLocaleTimeString("lt-LT", { hour: "2-digit", minute: "2-digit" })} – ${new Date(booking.end).toLocaleTimeString("lt-LT", { hour: "2-digit", minute: "2-digit" })}`;

  const paidStr = booking.paid ? t.paidText : "";

  const html = `
<table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(to right, #fce7f3, #f3e8ff);padding:40px 16px;">
  <tr>
    <td align="center">
      <div style="max-width:460px;width:100%;margin:0 auto;background:#ffffff;border-radius:28px;overflow:hidden;box-shadow:0 15px 40px rgba(236,211,255,0.3);">
        <div style="padding:48px 32px 40px;text-align:center;">
          <img src="${logoUrl}" style="width:230px;margin-bottom:32px;" alt="Irina Žilina IZ Hair Trend"/>
          <h1 style="font-size:29px;font-weight:700;color:#000;margin:0 0 20px;line-height:1.2;">
            ${t.title}
          </h1>
          <p style="font-size:17px;color:#333;margin:0 0 32px;line-height:1.6;">
            ${t.greeting}, <b>${booking.userName || "kliente"}</b>!<br><br>
            ${t.text.replace("{paid}", paidStr)}
          </p>
          <div style="background:#fdf4ff;padding:20px 28px;border-radius:16px;">
            <div style="font-size:16px;color:#333;line-height:1.3;">
              <div><b>${t.data}:</b> ${date}</div>
              <div style="margin-top:4px;"><b>${t.laikas}:</b> ${time}</div>
              <div style="margin-top:4px;"><b>${t.paslaugos}:</b> ${booking.services?.join(", ") || "—"}</div>
              <div style="margin-top:4px;"><b>${t.apmoketa}:</b> ${booking.paid ? (booking.price + " €") : "Dar ne"}</div>
            </div>
          </div>
          <p style="font-size:14px;color:#888;margin:32px 0 0;line-height:1.5;">
            ${t.kvitas}
          </p>
        </div>
      </div>
    </td>
  </tr>
</table>`;

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
      subject: t.title,
      html,
    });

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("CONFIRM EMAIL ERROR:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
}
