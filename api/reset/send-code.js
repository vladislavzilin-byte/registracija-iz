import { Redis } from "@upstash/redis";
import nodemailer from "nodemailer";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { email, lang = "ru" } = req.body || {};
  if (!email) return res.status(400).json({ ok: false });

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const normalizedEmail = email.toLowerCase().trim();

  // 🌍 Локализованный текст
  const translations = {
    ru: {
      subject: "Ваш код для восстановления пароля",
      title: "Ваш код для восстановления пароля",
      info: "Код действителен 10 минут.",
      ignore: "Если вы не запрашивали код — просто игнорируйте письмо.",
    },
    lt: {
      subject: "Slaptažodžio atstatymo kodas",
      title: "Jūsų slaptažodžio atstatymo kodas",
      info: "Kodas galioja 10 minučių.",
      ignore: "Jeigu neprašėte šio kodo — tiesiog ignoruokite laišką.",
    },
    en: {
      subject: "Your password reset code",
      title: "Your password reset code",
      info: "The code is valid for 10 minutes.",
      ignore: "If you did not request this code — please ignore this email.",
    },
  };

  const t = translations[lang] || translations["ru"];

  // 🌐 URL логотипа
  const logoUrl = `${process.env.RUNTIME_HOST}/logo2.svg`;

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === "true",
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });

    const html = `
      <div style="font-family:Arial, sans-serif; background:#f8f8f8; padding:40px;">
        <div style="
          max-width:480px;
          margin:0 auto;
          background:white;
          padding:32px;
          border-radius:12px;
          box-shadow:0 4px 14px rgba(0,0,0,0.08)
        ">
          <div style="text-align:center; margin-bottom:24px;">
            <img src="${logoUrl}" alt="Logo" style="max-width:180px;">
          </div>

          <h2 style="text-align:center; color:#111; font-size:22px; margin-bottom:10px;">
            ${t.title}
          </h2>

          <div style="font-size:42px; letter-spacing:12px; text-align:center; color:#a78bfa; font-weight:bold; margin:20px 0;">
            ${code}
          </div>

          <p style="text-align:center; color:#333; font-size:14px;">
            ${t.info}
          </p>

          <p style="text-align:center; color:#888; font-size:12px; margin-top:20px;">
            ${t.ignore}
          </p>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: `"izbooking" <${process.env.FROM_EMAIL}>`,
      to: email,
      subject: t.subject,
      html,
    });

    // Store code in Redis
    await redis.set(`reset:${normalizedEmail}`, code, { ex: 600 });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false });
  }
}
