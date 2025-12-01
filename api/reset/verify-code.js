import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { email, code } = req.body || {};
  if (!email || !code) return res.status(400).json({ ok: false, error: "missing_data" });

  const normalizedEmail = email.toLowerCase().trim();
  const cleanCode = code.toString().replace(/\D/g, ""); // убирает пробелы и всё лишнее

  try {
    const storedCode = await redis.get(`reset:${normalizedEmail}`);

    if (!storedCode) {
      return res.status(400).json({ ok: false, error: "not_found" });
    }

    if (storedCode !== cleanCode) {
      return res.status(400).json({ ok: false, error: "invalid_code" });
    }

    await redis.del(`reset:${normalizedEmail}`);

    // Если у тебя в фронте требуется token — возвращаем любой
    return res.status(200).json({ ok: true, token: "approved" });

  } catch (err) {
    console.error(err);
    return res.status(500).end();
  }
}
