import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { email, code } = req.body || {};
  if (!email || !code) return res.status(400).json({ ok: false });

  const cleanCode = code.toString().replace(/\D/g, "");

  try {
    const stored = await redis.get(`reset:${email.toLowerCase()}`);

    if (!stored || stored !== cleanCode) {
      return res.status(400).json({ ok: false });
    }

    await redis.del(`reset:${email.toLowerCase()}`);
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).end();
  }
}
