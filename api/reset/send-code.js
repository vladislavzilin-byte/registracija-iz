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

  // 🚀 Фиксируется логотип
  const logoUrl = `https://${req.headers.host}/logo2.svg`;

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === "true",
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });

    const html = `
      <div style="font-family:Arial,sans-serif;background:#f4f4f4;padding:40px;">
        <div style="
          max-width:480px;
          margin:0 auto;
          background:white;
          padding:32px;
          border-radius:16px;
          box-shadow:0 4px 14px rgba(0,0,0,0.08)"
        >
          <div style="text-align:center;">
            <img src="${logoUrl}" style="width:180px; margin-bottom:20px;">
          </div>

          <h2 style="text-align:center;color:#000;font-size:22px;margin-bottom:25px;">
            ${t.title}
          </h2>

          <div style="
            background:#eaeaea;
            padding:12px 0;
            font-size:40px;
            text-align:center;
            font-weight:bold;
            letter-spacing:8px;
            border-radius:8px;
            margin: 0 auto 25px;
            width: 240px;
          ">
            ${code}
          </div>

          <p style="text-align:center;color:#444;font-size:14px;">
            ${t.info}
          </p>

          <p style="text-align:center;color:#888;font-size:12px;margin-top:30px;">
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

    await redis.set(`reset:${normalizedEmail}`, code, { ex: 600 });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false });
  }
}
