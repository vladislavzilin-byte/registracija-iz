import nodemailer from "nodemailer";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  // Читаем body вручную — на Vercel нет req.body
  let raw = "";
  await new Promise(resolve => {
    req.on("data", chunk => raw += chunk);
    req.on("end", resolve);
  });

  const { email } = JSON.parse(raw || "{}");

  if (!email) {
    return res.status(400).json({ ok: false, error: "No email provided" });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 465),
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const code = Math.floor(100000 + Math.random() * 900000).toString();

    await transporter.sendMail({
      from: `"${process.env.FROM_NAME}" <${process.env.FROM_EMAIL}>`,
      to: email,
      subject: "Password reset code",
      html: `<h2>Your code:</h2> <div style="font-size:32px;font-weight:bold">${code}</div>`
    });

    return res.status(200).json({ ok: true, codeSent: true });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
}
