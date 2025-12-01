import nodemailer from "nodemailer";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { email } = req.body || {};
  if (!email) return res.status(400).json({ ok: false, error: "no_email" });

  const normalizedEmail = email.toLowerCase().trim();

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE?.toLowerCase() === "true",
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });

    await transporter.verify();

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(`Код для ${normalizedEmail}: ${code}`);

    await transporter.sendMail({
      from: `"${process.env.FROM_NAME}" <${process.env.FROM_EMAIL}>`,
      to: email,
      subject: "Код восстановления",
      html: `<h2>Ваш код:</h2><div style="font-size:32px;font-weight:bold;letter-spacing:10px">${code}</div><p>Действителен 10 минут</p>`,
    });

    await redis.set(`reset:${normalizedEmail}`, code, { ex: 600 });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: "smtp_error" });
  }
}
