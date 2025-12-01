export default function handler(req, res) {
  res.json({
    SMTP_USER: process.env.SMTP_USER || "MISSING",
    SMTP_PASS: process.env.SMTP_PASS || "MISSING",
    SMTP_PORT: process.env.SMTP_PORT || "MISSING",
    SMTP_SECURE: process.env.SMTP_SECURE || "MISSING",
    FROM_EMAIL: process.env.FROM_EMAIL || "MISSING",
    FROM_NAME: process.env.FROM_NAME || "MISSING",
    RUNTIME_HOST: req.headers.host || null
  })
}
