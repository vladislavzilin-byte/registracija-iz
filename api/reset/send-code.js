import nodemailer from "nodemailer";
import { Redis } from "@upstash/redis";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  console.log("DEBUG: send-code started");

  const { email } = req.body || {};
  if (!email) return res.status(400).json({ ok: false });

  try {
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN
    });

    console.log("DEBUG: Redis OK");

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    console.log("DEBUG: Transporter OK");

    await transporter.verify();
    console.log("DEBUG: SMTP verified");

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(`DEBUG: generated code ${code}`);

    await transporter.sendMail({
      from: `"${process.env.FROM_NAME}" <${process.env.FROM_EMAIL}>`,
      to: email,
      subject: "Ваш код",
      text: `Ваш код: ${code}`,
    });

    console.log("DEBUG: mail sent");

    await redis.set(`reset:${email}`, code, { ex: 600 });

    console.log("DEBUG: redis saved");

    return res.status(200).json({ ok: true });

  } catch (err) {
    console.error("ERROR in send-code:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
