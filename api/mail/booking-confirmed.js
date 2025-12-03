// /api/mail/booking-confirmed.js
import { Redis } from "@upstash/redis";
import nodemailer from "nodemailer";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { getBookings, getUsers } from "../../lib/storage"; // если путь другой — поправлю

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { booking } = req.body || {};
  if (!booking || !booking.userEmail)
    return res.status(400).json({ ok: false, error: "bad_request" });

  try {
    // LOGO
    const logoUrl =
      "https://registracija-iz.vercel.app/logo-email.png";

    // 1) Генерируем PDF-квитанцию (вариант A – как у пользователя)
    const pdfBytes = await generateReceiptPdf(booking);

    // 2) Генерируем HTML-письмо (как Reset Password)
    const html = `
      <div style="font-family:Arial,sans-serif;background:#f4f4f4;padding:40px;">
        <div style="max-width:480px;margin:0 auto;background:white;padding:32px;border-radius:16px;box-shadow:0 4px 14px rgba(0,0,0,0.1);">

          <div style="text-align:center;margin-bottom:20px;">
            <img src="${logoUrl}" alt="Logo" style="width:180px;" />
          </div>

          <h2 style="text-align:center;color:#000;font-size:22px;margin-bottom:25px;">
            Ваше бронирование подтверждено!
          </h2>

          <p style="text-align:center;color:#444;font-size:14px;margin-top:10px;">
            <b>Дата:</b> ${formatDate(booking.start)}<br>
            <b>Время:</b> ${formatTime(booking.start)} – ${formatTime(booking.end)}<br>
            <b>Услуги:</b> ${(booking.services || []).join(", ")}<br>
            <b>Стоимость:</b> ${booking.price ? booking.price + "€" : "—"}
          </p>

          <p style="text-align:center;color:#444;font-size:15px;margin-top:25px;">
            PDF-квитанция прикреплена к письму.
          </p>

        </div>
      </div>
    `;

    // Transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === "true",
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });

    await transporter.sendMail({
      from: `"IZ Booking" <${process.env.FROM_EMAIL}>`,
      to: booking.userEmail,
      subject: "Ваше бронирование подтверждено",
      html,
      attachments: [
        {
          filename: `IZ-Booking-${booking.id.slice(0, 6)}.pdf`,
          content: pdfBytes,
        },
      ],
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("EMAIL CONFIRM ERROR:", err);
    return res.status(500).json({ ok: false, error: "server_error" });
  }
}

// === HELPERS ===

function formatDate(date) {
  return new Date(date).toLocaleDateString("lt-LT");
}
function formatTime(date) {
  return new Date(date).toLocaleTimeString("lt-LT", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// === СЕРВЕРНАЯ PDF КАК У ПОЛЬЗОВАТЕЛЯ ===
async function generateReceiptPdf(b) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]); // A4
  const font = await pdf.embedFont(StandardFonts.Helvetica);

  let y = 800;
  const size = 14;

  page.drawText("IZ HAIR TREND – Квитанция", {
    x: 50,
    y,
    size: 20,
    font,
    color: rgb(0.3, 0.2, 0.5),
  });
  y -= 40;

  const add = (label, value) => {
    page.drawText(label, { x: 50, y, size, font });
    page.drawText(String(value || "-"), {
      x: 200,
      y,
      size,
      font,
    });
    y -= 25;
  };

  add("Номер:", b.id.slice(0, 6));
  add("Имя:", b.userName);
  add("Телефон:", b.userPhone);
  add("Email:", b.userEmail);
  add("Дата:", formatDate(b.start));
  add("Время:", `${formatTime(b.start)} – ${formatTime(b.end)}`);
  add("Услуги:", (b.services || []).join(", "));
  add("Стоимость:", b.price ? b.price + "€" : "—");
  add("Статус:", "Оплачено");

  page.drawText("Спасибо за бронирование!", {
    x: 50,
    y: y - 20,
    size: 14,
    font,
    color: rgb(0.3, 0.5, 0.3),
  });

  return await pdf.save();
}
