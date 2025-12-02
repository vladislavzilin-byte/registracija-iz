// api/reset/verify-code.js   ←←←←← УБЕДИСЬ, ЧТО ПУТЬ ПРАВИЛЬНЫЙ!

import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { email, code } = req.body || {};

  if (!email || !code) {
    return res.status(400).json({ ok: false, error: "no email or code" });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const enteredCode = String(code).replace(/\D/g, ""); // 911770 → "911770"

  console.log("Проверка кода для:", normalizedEmail, "| введено:", enteredCode);

  redis
    .get(`reset_code:${normalizedEmail}`)           // ←←←←←←←←←←←←←←←←←←←←←←←←←←←
    .then((storedCode) => {
      console.log("Найденный в Redis код:", storedCode);

      if (!storedCode) {
        return res.status(400).json({ ok: false, error: "expired_or_not_found" });
      }

      if (storedCode !== enteredCode) {
        return res.status(400).json({ ok: false, error: "wrong_code" });
      }

      // Код верный — удаляем его
      return redis.del(`reset_code:${normalizedEmail}`).then(() => {
        console.log("Код подтверждён и удалён");
        return res.status(200).json({ ok: true });
      });
    })
    .catch((err) => {
      console.error("Redis error в verify-code:", err);
      return res.status(500).json({ ok: false });
    });
}
