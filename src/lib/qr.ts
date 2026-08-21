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
  const seconds = Number(process.env.QR_EXPIRY_SECONDS) || 60;
  return new Date(Date.now() + seconds * 1000);
}
