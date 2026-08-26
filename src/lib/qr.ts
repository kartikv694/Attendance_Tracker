// Small helper around the `qrcode` package + token generation.
// Kept separate from the route logic so it's easy to test / swap later.

import QRCode from "qrcode";
import { randomBytes } from "crypto";
 
// long random hex string - this is what gets embedded in the QR and is
// what the student's scan actually authenticates against. Long enough
// that guessing it isn't realistic within the session's short lifetime.
export function generateQrToken() {
  return randomBytes(24).toString("hex");
}

// turns a token into an actual scannable QR code, returned as a base64
// data URL so it can be dropped straight into an <img src="..."> on the
// frontend with no separate file storage needed.
export async function generateQrDataUrl(qrToken: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const scanUrl = `${appUrl}/scan/${qrToken}`;
  return QRCode.toDataURL(scanUrl, { errorCorrectionLevel: "M", margin: 2 });
}

export function getQrExpiryDate() {
  const seconds = Number(process.env.QR_EXPIRY_SECONDS) || 10;
  return new Date(Date.now() + seconds * 1000);
}

// there's no separate "issued at" column in the DB - expiresAt is always
// set to (issue time + the configured window), so this just works
// backward from it. Kept as one shared helper so the create, refresh,
// and detail routes can't drift out of sync with each other.
export function getQrIssuedAt(expiresAt: Date) {
  const seconds = Number(process.env.QR_EXPIRY_SECONDS) || 10;
  return new Date(expiresAt.getTime() - seconds * 1000);
}
