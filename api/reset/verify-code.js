import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { email, code } = req.body || {};
  if (!email || !code) return res.status(400).json({ ok: false });

  const key = `reset:${email.toLowerCase().trim()}`;
  const inputCode = code.toString().replace(/\D/g, "").slice(0, 6);  // ← строка

  try {
    const stored = await redis.get(key);

    // ← Вот эта строчка — вся магия
    if (!stored || String(stored) !== inputCode) {
      console.log(`НЕВЕРНЫЙ КОД: ожидалось ${stored}, пришло ${inputCode} (typeof stored: ${typeof stored})`);
      return res.status(400).json({ ok: false });
    }

    await redis.del(key);
    console.log(`КОД ПРИНЯТ: ${inputCode}`);
    return res.status(200).json({ ok: true });

  } catch (err) {
    console.error(err);
    return res.status(500).end();
  }
}
