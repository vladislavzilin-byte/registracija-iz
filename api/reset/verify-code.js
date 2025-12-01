export default async function handler(req, res) {
  console.log("VERIFY called");
  console.log("BODY:", req.body);

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const { email, code, newPassword } = req.body || {}; // newPassword может быть, если фронт шлёт

  if (!email || !code) {
    console.log("Missing email or code");
    return res.status(400).json({ ok: false, error: "Missing email/code" });
  }

  const normalizedEmail = email.toLowerCase().trim();
  console.log("Normalized email for lookup:", normalizedEmail);

  if (!global.resetCodes) {
    global.resetCodes = {};
    console.log("global.resetCodes was undefined → initialized empty");
  }

  console.log("Current stored emails in global.resetCodes:", Object.keys(global.resetCodes));

  const rec = global.resetCodes[normalizedEmail];

  if (!rec) {
    console.log("CODE NOT FOUND IN STORAGE");
    return res.status(400).json({ ok: false, error: "code_not_found" });
  }

  console.log("Found record:", rec);

  if (Date.now() > rec.expires) {
    delete global.resetCodes[normalizedEmail];
    console.log("CODE EXPIRED");
    return res.status(400).json({ ok: false, error: "code_expired" });
  }

  const receivedCode = code.toString().trim();
  console.log(`Comparing saved code "${rec.code}" (length ${rec.code.length}) with received "${receivedCode}" (length ${receivedCode.length})`);

  if (rec.code !== receivedCode) {
    console.log("CODE MISMATCH");
    return res.status(400).json({ ok: false, error: "invalid_code" });
  }

  delete global.resetCodes[normalizedEmail];
  console.log("CODE ACCEPTED — PASSWORD CAN BE CHANGED");
  return res.status(200).json({ ok: true });
}
