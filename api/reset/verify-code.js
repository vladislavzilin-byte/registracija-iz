import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const { token, code } = req.body;

  if (!token || !code) {
    return res.status(400).json({ ok: false, error: "Missing token or code" });
  }

  try {
    const data = jwt.verify(token, process.env.JWT_SECRET);

    if (data.code !== code) {
      return res.status(400).json({ ok: false, error: "Invalid or expired code" });
    }

    return res.json({ ok: true, email: data.email });
  } catch (err) {
    console.error("VERIFY ERROR:", err);
    return res.status(400).json({ ok: false, error: "Invalid or expired code" });
  }
}
