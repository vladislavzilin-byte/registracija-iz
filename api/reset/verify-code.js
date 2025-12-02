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
  const cleanCode = code.toString().replace(/\D/g, "").slice(0, 6);

  try {
    const stored = await redis.get(key);

    if (stored !== cleanCode) {
      console.log(`НЕВЕРНЫЙ КОД: ожидалось ${stored}, пришло ${cleanCode}`);
      return res.status(400).json({ ok: false });
    }

    // Удаляем код сразу после успешной проверки
    await redis.del(key);
    console.log(`КОД ПРИНЯТ И УДАЛЁН: ${cleanCode} для ${email}`);
    
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("UPSTASH ERROR:", err);
    return res.status(500).json({ ok: false });
  }
}
