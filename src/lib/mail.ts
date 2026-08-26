// Small wrapper around nodemailer - one transporter, reused across
// requests (creating a new SMTP connection per email would be wasteful
// and slow). Reads the SMTP_* vars already set up in .env.

import nodemailer from "nodemailer";

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465, // true only for port 465, else STARTTLS
    auth: {
      user: process.env.SMTP_USER_EMAIL,
      pass: process.env.SMTP_USER_PASSWORD,
    },
  });

  return transporter;
}

export async function sendPasswordResetEmail(to: string, resetLink: string) {
  const mailer = getTransporter();

  await mailer.sendMail({
    from: process.env.SMTP_USER_EMAIL,
    to,
    subject: "Reset your Roll Call password",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #161D2E;">Reset your password</h2>
        <p>Someone (hopefully you) asked to reset the password on your Roll Call account.</p>
        <p>
          <a href="${resetLink}" style="display: inline-block; background: #C1440E; color: white; padding: 10px 20px; border-radius: 4px; text-decoration: none;">
            Reset Password
          </a>
        </p>
        <p style="color: #666; font-size: 13px;">
          This link expires in 30 minutes. If you didn't request this, you can safely ignore this email.
        </p>
      </div>
    `,
  });
}
