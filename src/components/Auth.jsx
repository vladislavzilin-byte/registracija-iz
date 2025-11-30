import express from "express";
import cors from "cors";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

/* ==========================
    PATHS
========================== */
const OTP_PATH = join(process.cwd(), "server", "otp-store.json");
const USERS_PATH = join(process.cwd(), "server", "users.json"); // для хранения новых паролей

if (!existsSync(OTP_PATH)) writeFileSync(OTP_PATH, "[]");
if (!existsSync(USERS_PATH)) writeFileSync(USERS_PATH, "[]");

/* ==========================
    HELPERS
========================== */
function loadOtp() {
  return JSON.parse(readFileSync(OTP_PATH, "utf-8") || "[]");
}
function saveOtp(list) {
  writeFileSync(OTP_PATH, JSON.stringify(list, null, 2));
}

function loadUsers() {
  return JSON.parse(readFileSync(USERS_PATH, "utf-8") || "[]");
}
function saveUsers(list) {
  writeFileSync(USERS_PATH, JSON.stringify(list, null, 2));
}

function genOtp() {
  return String(Math.floor(100000 + Math.random() * 900000)); // 6 digits
}

function generateSessionToken() {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

function makeTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT || 465),
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

/* ==========================
    SEND OTP
========================== */
app.post("/api/send-otp", async (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ ok: false, error: "missing_email" });

  const code = genOtp();
  const expiresAt = Date.now() + 10 * 60 * 1000;

  let list = loadOtp();

  // remove old codes for same email
  list = list.filter((x) => x.email !== email);

  list.push({ email, code, expiresAt });
  saveOtp(list);

  try {
    const t = makeTransporter();
    await t.sendMail({
      from: `"IZ Booking" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Your IZ Booking verification code",
      html: `
        <div style="padding:20px;font-size:18px">
          <p>Your verification code:</p>
          <div style="font-size:28px;font-weight:700">${code}</div>
          <p>Valid for 10 minutes.</p>
        </div>
      `,
    });
  } catch (e) {
    console.log("Email error:", e);
  }

  res.json({ ok: true });
});

/* ==========================
    VERIFY OTP
========================== */
app.post("/api/verify-otp", (req, res) => {
  const { email, code } = req.body || {};
  if (!email || !code) return res.status(400).json({ ok: false });

  let list = loadOtp();
  const entry = list.find((x) => x.email === email);

  if (!entry) return res.json({ ok: false, error: "no_code" });
  if (entry.code !== code) return res.json({ ok: false, error: "invalid_code" });
  if (Date.now() > entry.expiresAt) return res.json({ ok: false, error: "expired" });

  // Create session token
  const token = generateSessionToken();
  entry.sessionToken = token;
  entry.sessionExpires = Date.now() + 5 * 60 * 1000; // 5 min
  saveOtp(list);

  res.json({ ok: true, token });
});

/* ==========================
    SET NEW PASSWORD
========================== */
app.post("/api/set-new-password", (req, res) => {
  const { email, token, newPasswordHash } = req.body || {};
  if (!email || !token || !newPasswordHash)
    return res.status(400).json({ ok: false, error: "missing_data" });

  let list = loadOtp();
  const entry = list.find((x) => x.email === email);

  if (!entry) return res.json({ ok: false, error: "no_session" });
  if (entry.sessionToken !== token) return res.json({ ok: false, error: "bad_token" });
  if (Date.now() > entry.sessionExpires)
    return res.json({ ok: false, error: "session_expired" });

  // Load users
  let users = loadUsers();
  const idx = users.findIndex((u) => u.email === email);
  if (idx === -1) return res.json({ ok: false, error: "user_not_found" });

  users[idx].passwordHash = newPasswordHash;
  saveUsers(users);

  // remove OTP entry
  list = list.filter((x) => x.email !== email);
  saveOtp(list);

  res.json({ ok: true });
});

/* ==========================
    RUN
========================== */
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log("OTP server running on port", PORT));
