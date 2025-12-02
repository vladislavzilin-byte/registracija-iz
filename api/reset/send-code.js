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

  const normalizedEmail = email.toLowerCase().trim();
  const code = Math.floor(100000 + Math.random() * 900000).toString();

  // 🌍 Три языка
  const translations = {
    ru: {
      subject: "Ваш код для восстановления пароля",
      title: "Ваш код для восстановления пароля",
      info: "Код действителен 10 минут.",
      ignore: "Если вы не запрашивали код — просто игнорируйте письмо.",
    },
    lt: {
      subject: "Slaptažodžio atkūrimo kodas",
      title: "Jūsų slaptažodžio atkūrimo kodas",
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

  // 📌 Стабильный URL логотипа (PNG)
  const logoUrl = "https://registracija-iz.vercel.app/logo-email.png";

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === "true",
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });

    // 📌 Gmail-friendly, НЕ сворачивается, без больших div
    const html = `
      <div style="font-family: Arial, sans-serif; background:#ffffff; padding:0; margin:0;">
        <table width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:480px;margin:0 auto;">
          
          <tr>
            <td style="padding:25px 20px 10px 20px; text-align:center;">
              <img src="${logoUrl}" alt="Logo" style="width:180px; display:block; margin:auto;" />
            </td>
          </tr>

          <tr>
            <td style="text-align:center; font-size:22px; font-weight:600; padding:10px 20px; color:#000;">
              ${t.title}
            </td>
          </tr>

          <tr>
            <td style="padding:20px 20px 10px 20px;">
              <div style="
                background:#eaeaea;
                padding:18px 0;
                font-size:38px;
                text-align:center;
                font-weight:bold;
                letter-spacing:8px;
                border-radius:8px;
              ">
                ${code}
              </div>
            </td>
          </tr>

          <tr>
            <td style="text-align:center; font-size:14px; padding:15px 20px; color:#444;">
              ${t.info}
            </td>
          </tr>

          <tr>
            <td style="text-align:center; font-size:12px; padding:15px 30px 25px; color:#777;">
              ${t.ignore}
            </td>
          </tr>

        </table>
      </div>
    `;

    await transporter.sendMail({
      from: `"IZ Booking" <${process.env.FROM_EMAIL}>`,
      to: email,
      subject: t.subject,
      html,
    });

    // ⏳ Сохраняем код в Redis на 10 минут
    await redis.set(`reset:${normalizedEmail}`, code, { ex: 600 });

    return res.status(200).json({ ok: true });

  } catch (err) {
    console.error("EMAIL ERROR:", err);
    return res.status(500).json({ ok: false });
  }
}
