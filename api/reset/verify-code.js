// api/reset/verify-code.js
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).end();
  }

  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({ ok: false, error: "Email and code required" });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const userCode = String(code).replace(/\D/g, ""); // убираем пробелы и буквы

  try {
    const correctCode = await redis.get(`reset_code:${normalizedEmail}`);

    if (!correctCode) {
      return res.status(400).json({ ok: false, error: "expired_or_not_found" });
    }

    if (correctCode !== userCode) {
      return res.status(400).json({ ok: false, error: "wrong_code" });
    }

    // Код верный — удаляем, чтобы нельзя было использовать ещё раз
    await redis.del(`reset_code:${normalizedEmail}`);

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("Ошибка verify-code:", error);
    return res.status(500).json({ ok: false });
  }
}
