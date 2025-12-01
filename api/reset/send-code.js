import nodemailer from "nodemailer";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const { email } = req.body || {};
  if (!email) {
    return res.status(400).json({ ok: false, error: "Missing email" });
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: Number(process.env.SMTP_PORT || 465),
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: `"${process.env.FROM_NAME || "IZ Booking"}" <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`,
      to: email,
      subject: "Ваш код для восстановления пароля",
      html: `
        <div style="background:#111;color:#fff;padding:18px;border-radius:10px;font-size:16px">
          <h2 style="margin:0 0 8px 0">Восстановление пароля — IZ Booking</h2>
          <p>Ваш код подтверждения:</p>
          <p style="font-size:28px;font-weight:bold;letter-spacing:4px">${code}</p>
          <p>Код действителен 10 минут.</p>
        </div>
      `,
    });

    if (!global.resetCodes) global.resetCodes = {};
    global.resetCodes[email.toLowerCase()] = {
      code,
      expires: Date.now() + 10 * 60 * 1000,
    };

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("SEND CODE ERROR", e);
    return res.status(500).json({ ok: false, error: "smtp_failed" });
  }
}
