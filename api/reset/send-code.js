import nodemailer from "nodemailer";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
  console.log("SEND-CODE CALLED →", req.body);

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const { email } = req.body || {};

  if (!email) {
    return res.status(400).json({ ok: false, error: "No email provided" });
  }

  const normalizedEmail = email.toLowerCase().trim();

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE?.toLowerCase() === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.verify();
    console.log("SMTP OK");

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(`GENERATED CODE FOR ${normalizedEmail} → ${code}`);

    await transporter.sendMail({
      from: `"${process.env.FROM_NAME}" <${process.env.FROM_EMAIL}>`,
      to: email,
      subject: "Код восстановления • izbooking",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 30px; text-align: center; background:#0f0a1a; color:#fff; max-width:400px; margin:auto; border-radius:16px;">
          <h2 style="color:#a78bfa;">Ваш код восстановления</h2>
          <div style="font-size:38px; font-weight:bold; letter-spacing:12px; margin:40px 0; color:#c4b5fd;">
            ${code}
          </div>
          <p style="color:#aaa;">Код действителен 10 минут</p>
        </div>
      `
    });

    console.log("EMAIL SENT");

    // Сохраняем в Upstash Redis с TTL 10 минут
    await redis.set(
      `reset_code:${normalizedEmail}`,
      { code, expires: Date.now() + 10 * 60 * 1000 },
      { ex: 600 }
    );

    return res.status(200).json({ ok: true, codeSent: true });

  } catch (err) {
    console.error("SEND-CODE ERROR:", err);
    return res.status(500).json({ ok: false, error: String(err) });
  }
}
