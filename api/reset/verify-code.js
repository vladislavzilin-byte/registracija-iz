// pages/api/reset/verify-code.js   ИЛИ   app/api/reset/verify-code/route.js
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { email, code } = req.body || {};

  {};

  if (!email || !code) {
    return res.status(400).json({ ok: false, error: "missing_data" });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const cleanCode = code.toString().replace(/\D/g, ""); // убираем пробелы и всё лишнее

  try {
    const storedCode = await redis.get(`reset:${normalizedEmail}`);

    // Если кода нет или он не совпадает
    if (!storedCode || storedCode !== cleanCode) {
      return res.status(400).json({ ok: false, error: "invalid_or_expired" });
    }

    // Код подошёл — удаляем, чтобы нельзя было использовать повторно
    await redis.del(`reset:${normalizedEmail}`);

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Ошибка verify-code:", err);
    return res.status(500).json({ ok: false });
  }
}
