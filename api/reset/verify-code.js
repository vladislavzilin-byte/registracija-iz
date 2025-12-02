import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN
});

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { email, code } = req.body || {};
  if (!email || !code) return res.status(400).json({ ok: false });

  const normalizedEmail = email.toLowerCase().trim();
  const cleanCode = code.toString().replace(/\D/g, "");

  try {
    const stored = await redis.get(`reset:${normalizedEmail}`);

    if (!stored) {
      return res.status(400).json({ ok: false, error: "invalid_or_expired" });
    }

    if (stored !== cleanCode) {
      return res.status(400).json({ ok: false, error: "wrong_code" });
    }

    await redis.del(`reset:${normalizedEmail}`);

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("VERIFY ERROR:", err);
    return res.status(500).json({ ok: false });
  }
}
