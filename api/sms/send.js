// /pages/api/sms/send.js
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const translations = {
  confirmed: {
    lt: "Jūsų rezervacija patvirtinta! 🎉 {date} {time} • {services}",
    ru: "Ваша запись подтверждена! 🎉 {date} {time} • {services}",
    en: "Your booking is confirmed! 🎉 {date} {time} • {services}",
  },
  paid: {
    lt: "Apmokėjimas gautas! ✅ {date} {time} pilnai apmokėta",
    ru: "Оплата получена! ✅ {date} {time} полностью оплачена",
    en: "Payment received! ✅ {date} {time} fully paid",
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { phone, type = "confirmed", date, time, services = [], lang = "lt" } = req.body;

  if (!phone || !date || !time) {
    return res.status(400).json({ ok: false, error: "Missing data" });
  }

  // Антиспам: не чаще 1 SMS в 60 секунд на один номер
  const cooldownKey = `sms_cooldown:${phone}`;
  const hasCooldown = await redis.get(cooldownKey);
  if (hasCooldown) {
    return res.status(429).json({ ok: false, cooldown: true });
  }
  await redis.set(cooldownKey, "1", { ex: 60 });

  const t = translations[type][lang] || translations[type]["lt"];

  const message = t
    .replace("{date}", date)
    .replace("{time}", time)
    .replace("{services}", services.join(", ") || "paslauga");

  try {
    // === SMS.RU — работает идеально в Литве, дешево (~0.02–0.03€ за SMS) ===
    const smsResponse = await fetch(
      `https://sms.ru/sms/send?api_id=${process.env.SMSRU_API_ID}&to=${phone}&msg=${encodeURIComponent(message)}&json=1`
    );

    const result = await smsResponse.json();

    if (result.status !== "OK") {
      console.error("SMS.RU ERROR:", result);
      throw new Error(result.status_text || "SMS send failed");
    }

    return res.status(200).json({ ok: true, sms_id: result.sms[phone]?.sms_id });
  } catch (err) {
    console.error("SMS SEND ERROR:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
