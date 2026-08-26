"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/shared/toast";

type ActiveSession = {
  id: string;
  sessionDate: string;
  expiresAt: string;
  qrToken: string;
  qrCodeDataUrl: string;
  qrIssuedAt: string;
  alreadyMarked: boolean;
  markedAt: string | null;
  subjectSection: {
    subject: { name: string; code: string };
    section: { name: string; year: number };
    teacherName: string;
  };
};

export default function MarkAttendancePage() {
  const { showToast } = useToast();
  const router = useRouter();
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [attendanceMarked, setAttendanceMarked] = useState(false);
  const scannerRef = useRef<{ clear: () => Promise<void> } | null>(null);
  const scannedRef = useRef(false);

  async function loadSessions() {
    try {
      const res = await fetch("/api/student/attendance/active", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load active classes");
      setSessions(data.data || []);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Failed to load active classes", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSessions();
    // Polling lets students see the latest QR after the teacher's configured
    // QR rotation happens.
    const interval = setInterval(loadSessions, 5000);
    return () => clearInterval(interval);
  }, []);

  function extractToken(decodedText: string) {
    try {
      const url = new URL(decodedText);
      const parts = url.pathname.split("/").filter(Boolean);
      const scanIndex = parts.indexOf("scan");
      if (scanIndex !== -1 && parts[scanIndex + 1]) return parts[scanIndex + 1];
    } catch {
      // A raw token is also accepted.
    }
    return decodedText.trim();
  }

  async function submitToken(decodedText: string) {
    if (scannedRef.current) return;
    scannedRef.current = true;
    setScanning(true);

    const qrToken = extractToken(decodedText);

    try {
      const res = await fetch("/api/student/attendance/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qrToken }),
      });
      const data = await res.json();

      if (!res.ok) {
        const message = data.error || "Attendance could not be marked";
        showToast(message, "error");
        await stopScanner();
        return;
      }

      setAttendanceMarked(true);
      showToast("Attendance marked successfully", "success");
      await stopScanner();
      await loadSessions();

      // Let the student clearly see the success state, then take them back
      // to the student dashboard automatically.
      setTimeout(() => router.push("/student"), 1500);
    } catch (error) {
      scannedRef.current = false;
      showToast(error instanceof Error ? error.message : "Attendance could not be marked", "error");
    } finally {
      setScanning(false);
    }
  }

  async function openScanner() {
    setScannerOpen(true);
  }

  async function startScanner() {
    // html5-qrcode is imported only in the browser so this page remains
    // compatible with Next.js server rendering.
    const { Html5QrcodeScanner } = await import("html5-qrcode");

    const scanner = new Html5QrcodeScanner(
      "attendance-qr-reader",
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
      },
      false
    );

    scanner.render(
      (decodedText) => submitToken(decodedText),
      () => {}
    );

    scannerRef.current = scanner;
  }

  async function stopScanner() {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    if (scanner) {
      try {
        await scanner.clear();
      } catch {
        // Scanner may already be cleared by the browser.
      }
    }
    setScannerOpen(false);
  }

  useEffect(() => {
    if (scannerOpen) {
      scannedRef.current = false;
      startScanner().catch(() => {
        showToast("Camera could not be started. Please allow camera permission.", "error");
        setScannerOpen(false);
      });
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, [scannerOpen]);

  return (
    <div className="max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Mark Attendance</h1>
        <p className="mt-2 text-slate-600">
          Open the camera, point it at your teacher&apos;s QR code, and your attendance will be marked automatically.
        </p>
      </div>

      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-semibold text-slate-900">Scan classroom QR</h2>
            <p className="text-sm text-slate-500">Camera permission is required.</p>
          </div>
          <button
            onClick={openScanner}
            disabled={sessions.length > 0 && sessions.every((session) => session.alreadyMarked)}
            className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sessions.length > 0 && sessions.every((session) => session.alreadyMarked)
              ? "Attendance Marked"
              : "Open Camera"}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-slate-500">Loading active classes...</div>
      ) : sessions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
          No active attendance session is available for your enrolled classes.
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {sessions.map((session) => (
            <div key={session.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <div className="text-lg font-semibold text-slate-900">
                    {session.subjectSection.subject.code} - {session.subjectSection.subject.name}
                  </div>
                  <div className="mt-1 text-sm text-slate-600">
                    {session.subjectSection.section.name} ({session.subjectSection.section.year})
                  </div>
                  <div className="mt-1 text-sm text-slate-500">
                    Teacher: {session.subjectSection.teacherName}
                  </div>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                  session.alreadyMarked
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-amber-100 text-amber-700"
                }`}>
                  {session.alreadyMarked ? "Marked" : "Active"}
                </span>
              </div>

              {session.alreadyMarked ? (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-6 text-center">
                  <div className="mb-2 text-3xl text-emerald-600">✓</div>
                  <div className="font-semibold text-emerald-800">Attendance Marked</div>
                  <div className="mt-1 text-xs text-emerald-700">
                    {session.markedAt
                      ? `Marked at ${new Date(session.markedAt).toLocaleTimeString()}`
                      : "Your attendance for this lecture is already marked."}
                  </div>
                </div>
              ) : (
                <>
                  <div className="mx-auto mb-4 max-w-xs rounded-lg bg-slate-50 p-3">
                    <img
                      src={session.qrCodeDataUrl}
                      alt={`Attendance QR for ${session.subjectSection.subject.code}`}
                      className="h-auto w-full"
                    />
                  </div>

                  <div className="text-xs text-slate-500">
                    QR refreshes automatically while the attendance session is active.
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}


      {attendanceMarked && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-8 text-center shadow-xl">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-700">
              ✓
            </div>
            <h2 className="text-xl font-bold text-slate-900">Attendance Marked</h2>
            <p className="mt-2 text-sm text-slate-600">
              Your attendance has been marked successfully. Redirecting to your dashboard...
            </p>
          </div>
        </div>
      )}
      {scannerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Scan QR Code</h2>
                <p className="text-sm text-slate-500">
                  {scanning ? "Verifying attendance..." : "Point your camera at the teacher's QR code."}
                </p>
              </div>
              <button
                onClick={stopScanner}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
            <div id="attendance-qr-reader" className="overflow-hidden rounded-lg" />
          </div>
        </div>
      )}
    </div>
  );
}
