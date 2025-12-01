import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const { code, newPassword } = req.body;

  if (!code || !newPassword) {
    return res.status(400).json({ ok: false, error: "Missing fields" });
  }

  try {
    // Get JWT cookie
    const cookie = req.headers.cookie || "";
    const token = cookie
      .split("; ")
      .find((x) => x.startsWith("reset_token="))
      ?.split("=")[1];

    if (!token) {
      return res.status(400).json({ ok: false, error: "Token missing" });
    }

    // Decode JWT
    const data = jwt.verify(token, process.env.JWT_SECRET);

    if (data.code !== code) {
      return res.status(400).json({ ok: false, error: "Invalid code" });
    }

    // Here you update the password in your "database"
    // Your project stores users in /server/db.json — we update it

    const dbPath = path.join(process.cwd(), "server", "db.json");

    const db = JSON.parse(fs.readFileSync(dbPath, "utf8"));

    const user = db.users.find((u) => u.email === data.email);

    if (!user) {
      return res.status(404).json({ ok: false, error: "User not found" });
    }

    // Hash new password
    user.password = bcrypt.hashSync(newPassword, 10);

    // Save DB
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));

    // Remove cookie
    res.setHeader(
      "Set-Cookie",
      "reset_token=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict"
    );

    return res.json({ ok: true });
  } catch (err) {
    return res.status(400).json({ ok: false, error: "Expired or invalid code" });
  }
}
