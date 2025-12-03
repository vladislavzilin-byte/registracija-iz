// /pages/api/mail/booking-paid.js
import nodemailer from "nodemailer";

const baseUrl = process.env.NEXT_PUBLIC_URL || "https://registracija-pk5lf8jlo-vladislavzilin.vercel.app";

const titles = {
  lt: "Apmokėjimas gautas! ✅",
  ru: "Оплата получена! ✅",
  en: "Payment received! ✅",
};

const texts = {
  lt: "Ačiū už apmokėjimą! Jūsų rezervacija dabar pilnai apmokėta.",
  ru: "Спасибо за оплату! Ваша запись теперь полностью оплачена.",
  en: "Thank you for your payment! Your booking is now fully paid.",
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { booking } = req.body || {};

  if (!booking || !booking.userEmail || !booking.paid) {
    return res.status(200).json({ ok: true });
  }

  const lang = booking.userLang || "lt";

  const date = new Date(booking.start).toLocaleDateString(lang === "lt" ? "lt-LT" : lang === "ru" ? "ru-RU" : "en-GB");
  const time = `${new Date(booking.start).toLocaleTimeString(lang === "lt" ? "lt-LT" : "en-US", { hour: "2-digit", minute: "2-digit" })} – ${new Date(booking.end).toLocaleTimeString(lang === "lt" ? "lt-LT" : "en-US", { hour: "2-digit", minute: "2-digit" })}`;

  const html = `
<div style="font-family:Arial,sans-serif;background:#f8f8f8;padding:40px 20px;">
  <div style="max-width:520px;margin:0 auto;background:white;padding:32px;border-radius:16px;box-shadow:0 4px 20px rgba(0,0,0,0.1);text-align:center;">
    <img src="https://izhairtrend.lt/logo-email.png" style="width:170px;margin-bottom:20px;" />
    <h2 style="color:#000;font-size:24px;margin-bottom:20px;">${titles[lang]}</h2>
    <p style="font-size:16px;color:#333;line-height:1.6;">
      ${texts[lang]}<br><br>
      <b>${date} ${time}</b>
    </p>
    <div style="background:#f0fdf4;padding:20px;border-radius:12px;margin:30px 0;font-size:15px;color:#166534;">
      ✅ Pilnai apmokėta suma: ${booking.price || 0} €
    </div>
    <p style="color:#666;font-size:14px;">Kvitą rasite prisegte prie laiško.</p>
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

    const mailOptions = {
      from: `"IZ Hair Trend" <${process.env.FROM_EMAIL}>`,
      to: booking.userEmail,
      subject: titles[lang],
      html,
    };

    // PDF только здесь — когда реально оплачено
    if (booking.price) {
      mailOptions.attachments = [{
        filename: `kvitas-${booking.id.slice(0,6)}.pdf`,
        path: `${baseUrl}/api/receipt-pdf?id=${booking.id}`,
        contentType: "application/pdf"
      }];
    }

    await transporter.sendMail(mailOptions);

    console.log(`Оплата + PDF отправлено на ${booking.userEmail}`);
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("PAID EMAIL ERROR:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
}
