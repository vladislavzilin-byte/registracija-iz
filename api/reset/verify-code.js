import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
  console.log("VERIFY-CODE CALLED →", req.body);

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const { email, code } = req.body || {};

  if (!email || !code) {
    return res.status(400).json({ ok: false, error: "Missing email/code" });
  }

  const normalizedEmail = email.toLowerCase().trim();
  // Очищаем код от пробелов, дефисов, любых символов — только цифры
  const cleanCode = code.toString().replace(/\D/g, "");

  if (cleanCode.length !== 6) {
    console.log("INVALID CODE LENGTH AFTER CLEANING");
    return res.status(400).json({ ok: false, error: "invalid_code" });
  }

  try {
    const rec = await redis.get(`reset_code:${normalizedEmail}`);

    if (!rec) {
      console.log("CODE NOT FOUND IN REDIS");
      return res.status(400).json({ ok: false, error: "code_not_found" });
    }

    console.log("FOUND RECORD:", rec);

    if (Date.now() > rec.expires) {
      await redis.del(`reset_code:${normalizedEmail}`);
      console.log("CODE EXPIRED");
      return res.status(400).json({ ok: false, error: "code_expired" });
    }

    if (rec.code !== cleanCode) {
      console.log(`CODE MISMATCH: stored=${rec.code}, received=${cleanCode}`);
      return res.status(400).json({ ok: false, error: "invalid_code" });
    }

    await redis.del(`reset_code:${normalizedEmail}`);
    console.log("CODE VERIFIED SUCCESSFULLY");

    return res.status(200).json({ ok: true });

  } catch (err) {
    console.error("VERIFY ERROR:", err);
    return res.status(500).json({ ok: false, error: "server_error" });
  }
}
