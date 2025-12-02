import nodemailer from "nodemailer";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { email } = req.body || {};
  if (!email) return res.status(400).json({ ok: false });

  const normalizedEmail = email.toLowerCase().trim();

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  console.log(`КОД ДЛЯ ${normalizedEmail}: ${code}`);

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE?.toLowerCase() === "true",
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });

    await transporter.verify();
    await transporter.sendMail({
      from: `"izbooking" <${process.env.FROM_EMAIL}>`,
      to: email,
      subject: "Код восстановления",
      html: `<h2>Ваш код:</h2><h1 style="letter-spacing:10px;font-size:40px">${code}</h1><p>Действителен 10 минут</p>`,
    });

    if (!global.resetCodes) global.resetCodes = {};
    global.resetCodes[normalizedEmail] = { code, expires: Date.now() + 600000 };

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false });
  }
}
