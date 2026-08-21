import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/shared/toast";

export const metadata: Metadata = {
  title: "Attendance Management System",
  description: "QR-based attendance tracking for Admins, Teachers, and Students",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
