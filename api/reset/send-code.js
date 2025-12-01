import nodemailer from "nodemailer";

export default async function handler(req, res) {
  console.log("REQUEST BODY:", req.body);
  console.log("ENV:", {
    HOST: process.env.SMTP_HOST,
    PORT: process.env.SMTP_PORT,
    SECURE: process.env.SMTP_SECURE,
    USER: process.env.SMTP_USER,
    PASS: process.env.SMTP_PASS ? "SET" : "MISSING",
    FROM_EMAIL: process.env.FROM_EMAIL,
    FROM_NAME: process.env.FROM_NAME,
  });

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const { email } = req.body || {};

  if (!email) {
    return res.status(400).json({ ok: false, error: "No email provided" });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      // Главное исправление — теперь берётся из .env, а не хардкод true
      secure: process.env.SMTP_SECURE?.toLowerCase() === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      // Если вдруг будут ошибки с сертификатом Apple — раскомментируй
      // tls: {
      //   rejectUnauthorized: false
      // }
    });

    console.log("CHECKING CONNECTION...");
    await transporter.verify();
    console.log("SMTP CONNECTION OK");

    const code = Math.floor(100000 + Math.random() * 900000).toString();

    console.log("GENERATED CODE FOR", email, "→", code); // очень удобно при тестах

    await transporter.sendMail({
      from: `"${process.env.FROM_NAME}" <${process.env.FROM_EMAIL}>`,
      to: email,
      subject: "Код восстановления",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; text-align: center;">
          <h2>Ваш код для восстановления пароля</h2>
          <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #6366f1; margin: 30px 0;">
            ${code}
          </div>
          <p>Код действителен 10 минут.</p>
        </div>
      `
    });

    console.log("EMAIL SENT SUCCESSFULLY!");

    // Сохраняем код для последующей проверки в verify-code.js
    if (!global.resetCodes) {
      global.resetCodes = {};
    }

    global.resetCodes[email.toLowerCase().trim()] = {
      code,
      expires: Date.now() + 10 * 60 * 1000 // 10 минут
    };

    return res.status(200).json({ ok: true, codeSent: true });

  } catch (err) {
    console.error("SMTP ERROR:", err);
    return res.status(500).json({ ok: false, error: String(err) });
  }
}
