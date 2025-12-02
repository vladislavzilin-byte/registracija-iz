// api/reset/send-code.js
import nodemailer from "nodemailer";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const { email } = req.body;

  if (!email || !email.includes("@")) {
    return res.status(400).json({ ok: false, error: "Invalid email" });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const code = String(Math.floor(100000 + Math.random() * 900000));

  try {
    // Отправка письма
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
      from: `"${process.env.FROM_NAME || "No Reply"}" <${process.env.FROM_EMAIL}>`,
      to: normalizedEmail,
      subject: "Ваш код для восстановления пароля",
      html: `<div style="text-align:center;font-family:Arial,sans-serif;padding:40px;background:#000;color:#fff">
               <h2>Ваш код</h2>
               <div style="font-size:48px;letter-spacing:10px;color:#a78bfa">${code}</div>
               <p>Действителен 10 минут</p>
             </div>`,
    });

    // Сохраняем код в Redis ровно на 10 минут
    await redis.set(`reset_code:${normalizedEmail}`, code, { ex: 600 });

    console.log("Код успешно отправлен и сохранён:", code, normalizedEmail);

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("Ошибка в send-code:", error);
    return res.status(500).json({ ok: false, error: "Failed to send code" });
  }
}

// Если используешь App Router (Next 13+, просто переименуй файл в route.js и замени экспорт:
// export async function POST(req) { ... весь код выше ... }
