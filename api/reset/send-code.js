// pages/api/reset/send-code.js   ИЛИ   app/api/reset/send-code/route.js
import nodemailer from "nodemailer";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false });

  const { email } = req.body || {};
  if (!email || typeof email !== "string") {
    return res.status(400).json({ ok: false, error: "no_email" });
  }

  const normalizedEmail = email.toLowerCase().trim();

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

    const code = Math.floor(100000 + Math.random() * 900000).toString();

    await transporter.sendMail({
      from: `"${process.env.FROM_NAME || "Мой сервис"}" <${process.env.FROM_EMAIL}>`,
      to: normalizedEmail,
      subject: "Код восстановления пароля",
      html: `
        <div style="font-family:Arial,sans-serif;text-align:center;padding:50px;background:#000;color:#fff;border-radius:16px;max-width:420px;margin:auto;">
          <h2>Ваш код для восстановления пароля</h2>
          <div style="font-size:52px;letter-spacing:16px;font-weight:bold;margin:40px 0;color:#c084fc;">
            ${code}
          </div>
          <p style="color:#999;font-size:14px;">Действителен 10 минут</p>
        </div>
      `,
    });

    // Сохраняем в Upstash Redis на 10 минут
    await redis.set(`reset:${normalizedEmail}`, code, { ex: 600 });

    console.log(`Код ${code} отправлен на ${normalizedEmail}`);

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Ошибка send-code:", err);
    return res.status(500).json({ ok: false, error: "send_failed" });
  }
}
