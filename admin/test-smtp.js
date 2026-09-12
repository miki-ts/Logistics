"use strict";
/* Diagnostic: loads .env exactly like start.ps1 does, reports which SMTP
   variables are present (values masked), verifies the SMTP connection,
   and sends a real test email to the notification address.
   Run: node test-smtp.js            (verify + send test)
        node test-smtp.js --verify   (connection check only) */
const fs = require("fs");
const path = require("path");

const envFile = path.join(__dirname, ".env");
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([^#=\s][^=]*?)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const mask = (v) => (v ? `${v.length} chars, starts with "${v.slice(0, 2)}***"` : "(missing)");
console.log("SMTP_HOST :", process.env.SMTP_HOST || "(missing)");
console.log("SMTP_PORT :", process.env.SMTP_PORT || "(default 587)");
console.log("SMTP_USER :", mask(process.env.SMTP_USER));
console.log("SMTP_PASS :", mask(process.env.SMTP_PASS));
console.log("SMTP_FROM :", process.env.SMTP_FROM || "(defaults to SMTP_USER)");

let nodemailer;
try {
  nodemailer = require("nodemailer");
  console.log("nodemailer loaded: OK (v" + require("nodemailer/package.json").version + ")");
} catch (e) {
  console.error("FAIL: cannot load nodemailer:", e.message);
  process.exit(1);
}

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
  console.error("FAIL: SMTP_HOST, SMTP_USER and SMTP_PASS are ALL required. One or more are missing from .env");
  process.exit(1);
}

const port = Number(SMTP_PORT || 587);
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port,
  secure: port === 465,
  auth: { user: SMTP_USER, pass: SMTP_PASS },
});

(async () => {
  try {
    await transporter.verify();
    console.log("SMTP connection + authentication: OK");
  } catch (e) {
    console.error("SMTP verify FAILED:", e.message);
    process.exit(1);
  }

  if (process.argv.includes("--verify")) return;

  // Send to the same address the admin panel notifies
  let to = process.env.SMTP_USER;
  try {
    const data = JSON.parse(fs.readFileSync(path.join(__dirname, "data", "submissions.json"), "utf8"));
    if (data.settings && data.settings.notificationEmail) to = data.settings.notificationEmail;
  } catch {}
  console.log("Sending test email to:", to);

  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || SMTP_USER,
      to,
      subject: "[YM Logistics] SMTP test email",
      text: "If you can read this, SMTP is working. Sent at " + new Date().toISOString(),
    });
    console.log("Test email accepted by server. MessageId:", info.messageId);
  } catch (e) {
    console.error("Test email FAILED:", e.message);
    process.exit(1);
  }
})();
