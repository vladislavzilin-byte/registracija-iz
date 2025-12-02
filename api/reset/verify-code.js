// api/reset/verify-code.js   (или app/api/reset/verify-code/route.js)

import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { email, code } = req.body || {};

  if (!email || !code) {
    return res.status(400).json({ ok: false, error: "missing_data" });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const userCode = String(code).replace(/\D/g, ""); // убираем пробелы и всё лишнее

  try {
    // ←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←
    // ВАЖНО: ключ должен быть ТОЧНО таким же, как в send-code.js!
    const correctCode = await redis.get(`reset_code:${normalizedEmail}`);
    // ←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←

    if (!correct) {
      return res.status(400).json({ ok: false, error: "expired_or_not_found" });
    }

    if (correct !== userCode) {
      return res.status(400).json({ ok: false, error: "wrong_code" });
    }

    // Код подошёл — удаляем его навсегда
    await redis.del(`reset_code:${normalizedEmail}`);

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("VERIFY ERROR:", error);
    return res.status(500).json({ ok: false });
  }
}
