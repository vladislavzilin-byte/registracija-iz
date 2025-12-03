// /pages/api/mail/booking-paid.js
import nodemailer from "nodemailer";

const titles = {
  lt: "Apmokėjimas gautas! ✅",
  ru: "Оплата получена! ✅",
  en: "Payment received! ✅",
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { booking } = req.body;
  if (!booking?.userEmail) return res.status(400).json({ ok: false });

  const lang = booking.userLang || "lt";

  const date = new Date(booking.start).toLocaleDateString(lang === "lt" ? "lt-LT" : lang === "ru" ? "ru-RU" : "en-GB");
  const time = `${new Date(booking.start).toLocaleTimeString(lang === "lt" ? "lt-LT" : "en-US", { hour: "2-digit", minute: "2-digit" })} – ${new Date(booking.end).toLocaleTimeString(lang === "lt" ? "lt-LT" : "en-US", { hour: "2-digit", minute: "2-digit" })}`;

  const html = `
    <div style="font-family:Arial,sans-serif;background:#f4f4f4;padding:40px;text-align:center;">
      <div style="max-width:520px;margin:0 auto;background:white;padding:32px;border-radius:16px;box-shadow:0 4px 14px rgba(0,0,0,0.1);">
        <img src="https://izhairtrend.lt/logo-email.png" style="width:170px;margin-bottom:20px;" />
        <h2 style="color:#000;font-size:22px;margin-bottom:25px;">${titles[lang]}</h2>
        <p style="font-size:16px;color:#444;">
          Ačiū už apmokėjimą!<br>
          Jūsų rezervacija <b>${date} ${time}</b> dabar pilnai apmokėta.
        </p>
      </div>
    </div>`;

  try {
    const transporter = nodemailer.createTransport({ /* те же настройки */ });

    await transporter.sendMail({
      from: `"IZ Hair Trend" <${process.env.FROM_EMAIL}>`,
      to: booking.userEmail,
      subject: titles[lang],
      html,
    });

    // SMS об оплате
    if (booking.userPhone) {
      await fetch(`${process.env.NEXT_PUBLIC_URL || "https://tavo-domenas.lt"}/api/sms/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: booking.userPhone,
          type: "paid",
          date,
          time,
          lang,
        }),
      });
    }

    res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false });
  }
}