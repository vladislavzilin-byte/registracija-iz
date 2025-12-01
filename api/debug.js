export default function handler(req, res) {
  res.json({
    SMTP_USER: process.env.SMTP_USER || "MISSING",
    SMTP_PASS: process.env.SMTP_PASS ? "SET" : "MISSING",
    HOST: process.env.VERCEL_URL || null
  })
}