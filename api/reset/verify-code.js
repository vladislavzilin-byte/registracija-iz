export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const { email, code } = req.body || {};
  if (!email || !code) {
    return res.status(400).json({ ok: false, error: "Missing email/code" });
  }

  if (!global.resetCodes) {
    return res.status(400).json({ ok: false, error: "no_codes" });
  }

  const rec = global.resetCodes[email.toLowerCase()];
  if (!rec) {
    return res.status(400).json({ ok: false, error: "code_not_found" });
  }

  if (Date.now() > rec.expires) {
    delete global.resetCodes[email.toLowerCase()];
    return res.status(400).json({ ok: false, error: "code_expired" });
  }

  if (rec.code !== code.trim()) {
    return res.status(400).json({ ok: false, error: "invalid_code" });
  }

  delete global.resetCodes[email.toLowerCase()];
  return res.status(200).json({ ok: true });
}
