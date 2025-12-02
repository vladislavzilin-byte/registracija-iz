import nodemailer from "nodemailer";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN
});

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { email } = req.body || {};
  if (!email) return res.status(400).json({ ok: false });

  const normalizedEmail = email.toLowerCase().trim();

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE?.toLowerCase() === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    await transporter.verify();

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(`RESET CODE ${code} for ${email}`);

    await redis.set(`reset:${normalizedEmail}`, code, { ex: 600 });

    await transporter.sendMail({
      from: `"${process.env.FROM_NAME}" <${process.env.FROM_EMAIL}>`,
      to: email,
      subject: "Ваш код",
      html: `
        <div style="font-family:Arial,sans-serif;text-align:center;padding:40px;background:#111;color:white;">
          <h2>Ваш код для восстановления пароля</h2>
          <div style="font-size:42px;letter-spacing:12px;font-weight:bold;margin:30px;color:#a78bfa;">
            ${code}
          </div>
          <p>Действителен 10 минут</p>
        </div>
      `
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("SEND ERROR:", err);
    return res.status(500).json({ ok: false });
  }
}
