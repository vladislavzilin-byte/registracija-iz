import nodemailer from "nodemailer";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { booking } = req.body || {};
  if (!booking) return res.status(400).json({ ok: false, error: "No booking" });

  // гарантируем, что отправляем обновлённые данные
  const id = booking.id;
  const stored = JSON.parse(localStorage.getItem("iz.bookings.v7") || "[]")
      .find(b => b.id === id) || booking;

  const {
    userEmail,
    userName,
    start,
    end,
    services,
    price,
  } = stored;

  if (!userEmail) {
    return res.status(400).json({ ok: false, error: "User email missing" });
  }

  const date = new Date(start).toLocaleDateString("lt-LT");
  const time =
    new Date(start).toLocaleTimeString("lt-LT", { hour: "2-digit", minute: "2-digit" }) +
    " – " +
    new Date(end).toLocaleTimeString("lt-LT", { hour: "2-digit", minute: "2-digit" });

  const html = `
    <div style="font-family:Arial,sans-serif;background:#f4f4f4;padding:40px;">
      <div style="max-width:520px;margin:0 auto;background:white;padding:32px;border-radius:16px;box-shadow:0 4px 14px rgba(0,0,0,0.1);">

        <div style="text-align:center;margin-bottom:20px;">
          <img src="https://izhairtrend.lt/logo-email.png" style="width:170px;" />
        </div>

        <h2 style="text-align:center;color:#000;font-size:22px;margin-bottom:25px;">
          Jūsų rezervacija patvirtinta! 🎉
        </h2>

        <p style="font-size:15px;color:#444;">
          Sveiki, <b>${userName || "kliente"}</b>!<br><br>
          Jūsų rezervacija buvo <b>patvirtinta${stored.paid ? " ir apmokėta" : ""}</b>.
        </p>

        <div style="background:#f3f3f3;padding:16px 20px;border-radius:10px;margin:20px 0;font-size:15px;line-height:1.6;">
          <b>Data:</b> ${date}<br>
          <b>Laikas:</b> ${time}<br>
          <b>Paslauga:</b> ${services?.join(", ") || "—"}<br>
          <b>Apmokėta:</b> ${stored.paid ? (price + "€") : "Neapmokėta"}
        </div>

        <p style="font-size:14px;color:#666;">
          Pridedame sąskaitą–faktūrą (PDF) prie laiško.
        </p>

      </div>
    </div>
  `;

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    await transporter.sendMail({
      from: `"IZ Booking" <${process.env.FROM_EMAIL}>`,
      to: userEmail,
      subject: "Jūsų rezervacija patvirtinta ✓",
      html,
      attachments: [
        {
          filename: `receipt-${id.slice(0, 6)}.pdf`,
          path: `https://izhairtrend.lt/api/receipt-pdf?id=${id}`,
          contentType: "application/pdf"
        }
      ]
    });

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("EMAIL CONFIRM ERROR:", e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}
