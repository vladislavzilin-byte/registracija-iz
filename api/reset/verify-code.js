export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { email, code } = req.body || {};
  if (!email || !code) return res.status(400).json({ ok: false });

  const normalizedEmail = email.toLowerCase().trim();
  const cleanCode = code.toString().replace(/\D/g, "");

  if (!global.resetCodes) global.resetCodes = {};

  const record = global.resetCodes[normalizedEmail];

  if (!record || Date.now() > record.expires) {
    delete global.resetCodes[normalizedEmail];
    return res.status(400).json({ ok: false, error: "invalid_or_expired" });
  }

  if (record.code !== cleanCode) {
    return res.status(400).json({ ok: false, error: "wrong_code" });
  }

  // Код подошёл — удаляем его
  delete global.resetCodes[normalizedEmail];

  return res.status(200).json({ ok: true });
}
