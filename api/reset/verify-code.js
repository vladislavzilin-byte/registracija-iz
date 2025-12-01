import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { email, code } = req.body || {};
  if (!email || !code) return res.status(400).json({ ok: false });

  const normalizedEmail = email.toLowerCase().trim();
  const cleanCode = code.toString().replace(/\D/g, "").slice(0, 6);

  try {
    const storedCode = await redis.get(`reset:${normalizedEmail}`);

    if (!storedCode) {
      console.log(`Код не найден для ${normalizedEmail}`);
      return res.status(400).json({ ok: false, error: "not_found" });
    }

    if (storedCode !== cleanCode) {
      console.log(`Неверный код: ожидалось ${storedCode}, пришло ${cleanCode}`);
      return res.status(400).json({ ok: false, error: "invalid_code" });
    }

    await redis.del(`reset:${normalizedEmail}`);
    console.log(`Код принят для ${normalizedEmail}`);

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("VERIFY ERROR:", err);
    return res.status(500).end();
  }
}
