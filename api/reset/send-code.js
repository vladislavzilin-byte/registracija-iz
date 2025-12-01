import nodemailer from "nodemailer";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ ok: false, error: "Email is required" });
  }

  try {
    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Create JWT containing email + code
    const token = jwt.sign(
      { email, code },
      process.env.JWT_SECRET,
      { expiresIn: "10m" } // valid for 10 minutes
    );

    // Set HttpOnly cookie (frontend cannot read it)
    res.setHeader(
      "Set-Cookie",
      `reset_token=${token}; HttpOnly; Secure; Path=/; Max-Age=600; SameSite=Strict`
    );

    // SMTP transport
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // Email HTML
    const html = `
      <h2>Ваш код для восстановления пароля</h2>
      <div style="font-size:32px;font-weight:bold;color:#2a4cff">${code}</div>
      <p>Код действителен 10 минут.</p>
    `;

    await transporter.sendMail({
      from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
      to: email,
      subject: "Код для восстановления пароля",
      html,
    });

    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
}
