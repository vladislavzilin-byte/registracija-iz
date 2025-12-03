// /pages/api/sms/send.js
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const translations = {
  confirmed: {
    lt: "Jūsų rezervacija patvirtinta! 📅 {date} 🕐 {time} 💇‍♀️ {services}",
    ru: "Ваша запись подтверждена! 📅 {date} 🕐 {time} 💇‍♀️ {services}",
    en: "Your booking is confirmed! 📅 {date} 🕐 {time} 💇‍♀️ {services}",
  },
  paid: {
    lt: "Apmokėjimas gautas! ✅ Rezervacija {date} {time} dabar pilnai apmokėta.",
    ru: "Оплата получена! ✅ Запись {date} {time} теперь полностью оплачена.",
    en: "Payment received! ✅ Booking {date} {time} is now fully paid.",
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { phone, type = "confirmed", date, time, services, lang = "lt" } = req.body;

  if (!phone || !date || !time) return res.status(400).json({ ok: false });

  // Антиспам – не чаще чем раз в 60 сек на один номер
  const key = `sms_cooldown:${phone}`;
  if (await redis.get(key)) {
    return res.status(429).json({ ok: false, message: "Too frequent" });
  }
  await redis.set(key, "1", { ex: 60 });

  const t = translations[type][lang] || translations[type]["lt"];

  const message = t
    .replace("{date}", date)
    .replace("{time}", time)
    .replace("{services}", services?.join(", ") || "");

  // ←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←
  // Здесь подключи свой SMS-провайдер
  // Пример для Twilio:
  /*
  const twilio = require("twilio")(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
  await twilio.messages.create({
    body: message,
    from: process.env.TWILIO_PHONE,
    to: phone,
  });
  */

  // Пример для sms.ru (очень дешево в Литве/России):
  const response = await fetch(`https://sms.ru/sms/send?api_id=${process.env.SMSRU_API_ID}&to=${phone}&msg=${encodeURIComponent(message)}&json=1`);
  const result = await response.json();
  if (result.status !== "OK") throw new Error("SMS failed");

  // ←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←

  return res.status(200).json({ ok: true });
}