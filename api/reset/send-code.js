import { Redis } from "@upstash/redis";
import nodemailer from "nodemailer";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { email } = req.body || {};
  if (!email) return res.status(400).json({ ok: false });

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  console.log(`ОТПРАВКА КОДА ${code} → ${email}`);

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: +process.env.SMTP_PORT,
      secure: process.env.SMTP_SECURE === "true",
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });

    await transporter.sendMail({
      from: `"izbooking" <${process.env.FROM_EMAIL}>`,
      to: email,
      subject: "Код восстановления",
      html: `<h2 style="text-align:center;font-family:Arial">Ваш код:</h2>
             <div style="font-size:48px;letter-spacing:12px;text-align:center;font-weight:bold;color:#a78bfa">
               ${code}
             </div>`,
    });

    await redis.set(`reset:${email.toLowerCase()}`, code, { ex: 600 });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false });
  }
}
