// Thin wrapper around nodemailer for the one email this app sends: a
// 6-digit password-reset code. Reads SMTP creds from .env (SMTP_HOST,
// SMTP_PORT, SMTP_USER_EMAIL, SMTP_USER_PASSWORD) - already provisioned
// with a Gmail app-password there.
//
// The transporter is created lazily and cached, not at module load time -
// that way a missing/bad env var only breaks the one request that actually
// tries to send an email, instead of crashing the whole server on boot.

import nodemailer, { type Transporter } from "nodemailer";

let cachedTransporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (cachedTransporter) return cachedTransporter;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER_EMAIL;
  const pass = process.env.SMTP_USER_PASSWORD;

  if (!host || !user || !pass) {
    throw new Error(
      "SMTP is not configured - set SMTP_HOST, SMTP_USER_EMAIL and SMTP_USER_PASSWORD in .env"
    );
  }

  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // 465 = implicit TLS, 587 = STARTTLS (the default here)
    auth: { user, pass },
  });

  return cachedTransporter;
}

export async function sendPasswordResetEmail(to: string, code: string) {
  const transporter = getTransporter();

  await transporter.sendMail({
    from: `"Roll Call" <${process.env.SMTP_USER_EMAIL}>`,
    to,
    subject: "Your Roll Call password reset code",
    text: `Your password reset code is ${code}. It expires in 5 minutes. If you didn't request this, you can ignore this email.`,
    html: `
      <div style="font-family: sans-serif; max-width: 420px; margin: 0 auto;">
        <h2 style="color:#0f172a;">Reset your password</h2>
        <p style="color:#334155;">Use the code below to reset your Roll Call password. It expires in 5 minutes.</p>
        <div style="font-size: 32px; font-weight: 700; letter-spacing: 8px; background:#f1f5f9; padding: 16px 24px; border-radius: 10px; text-align:center; color:#0f172a;">
          ${code}
        </div>
        <p style="color:#64748b; font-size: 13px; margin-top: 20px;">
          If you didn't request this, you can safely ignore this email.
        </p>
      </div>
    `,
  });
}
