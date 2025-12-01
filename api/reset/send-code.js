import nodemailer from "nodemailer";

export default async function handler(req, res) {
  console.log("👉 REQUEST BODY:", req.body);
  console.log("👉 ENV:", {
    HOST: process.env.SMTP_HOST,
    PORT: process.env.SMTP_PORT,
    USER: process.env.SMTP_USER,
    PASS: process.env.SMTP_PASS ? "SET" : "MISSING",
    FROM_EMAIL: process.env.FROM_EMAIL,
    FROM_NAME: process.env.FROM_NAME
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
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    console.log("👉 CHECKING CONNECTION...");
    await transporter.verify();
    console.log("✅ SMTP CONNECTION OK");

    const code = Math.floor(100000 + Math.random() * 900000).toString();

    console.log("👉 SENDING EMAIL TO:", email);

    await transporter.sendMail({
      from: `"${process.env.FROM_NAME}" <${process.env.FROM_EMAIL}>`,
      to: email,
      subject: "Reset code",
      html: `<h2>Your code:</h2><div style="font-size:26px;font-weight:bold">${code}</div>`
    });

    console.log("✅ EMAIL SENT!");

    return res.status(200).json({ ok: true, codeSent: true });

  } catch (err) {
    console.error("🔥 SMTP ERROR:", err);
    return res.status(500).json({ ok: false, error: String(err) });
  }
}
