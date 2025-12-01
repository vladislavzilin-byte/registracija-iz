import nodemailer from "nodemailer";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const { email } = req.body;
  if (!email) return res.status(400).json({ ok: false, error: "Email required" });

  try {
    // ---------- 1) Create code ----------
    const code = String(Math.floor(100000 + Math.random() * 900000));

    // ---------- 2) Create JWT with code ----------
    const token = jwt.sign(
      {
        email,
        code,
        exp: Math.floor(Date.now() / 1000) + 600 // 10 min
      },
      process.env.JWT_SECRET
    );

    // ---------- 3) Send email ----------
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    await transporter.sendMail({
      from: `"${process.env.FROM_NAME}" <${process.env.FROM_EMAIL}>`,
      to: email,
      subject: "Ваш код для восстановления пароля",
      html: `
        <h2>Ваш код для восстановления пароля</h2>
        <div style="font-size:32px;font-weight:bold;color:#2563eb">${code}</div>
        <p>Код действует 10 минут.</p>
      `
    });

    // ---------- 4) Return JWT token ----------
    return res.json({ ok: true, token });
  } catch (err) {
    console.error("SEND CODE ERROR:", err);
    return res.status(500).json({ ok: false, error: "Failed to send code" });
  }
}
