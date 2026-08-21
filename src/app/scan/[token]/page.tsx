"use client";

// This is the page the QR code's embedded link actually opens - a student's
// phone camera scans the QR, follows the link, and lands here. There's no
// "scan again" button and no camera UI on this page itself: the QR image
// lives on the TEACHER's screen (projected/shared), students just open the
// link it encodes. So for a given student, once this page has run its
// check, that's it for this session - the page shows a final result and
// nothing more, which is what makes the QR "vanish" from their side.

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useToast } from "@/components/shared/toast";

type ScanState = "checking" | "success" | "error";

export default function ScanPage() {
  const { token } = useParams<{ token: string }>();
  const { showToast } = useToast();
  const [state, setState] = useState<ScanState>("checking");
  const [message, setMessage] = useState("");

  // guards against the request firing twice (React can mount effects
  // twice in dev under strict mode) - we only want ONE scan attempt sent
  const hasFired = useRef(false);

  useEffect(() => {
    if (hasFired.current) return;
    hasFired.current = true;

    async function markAttendance() {
      try {
        const res = await fetch("/api/student/attendance/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ qrToken: token }),
        });

        const data = await res.json();

        if (res.ok) {
          setState("success");
          setMessage("Your attendance is marked");
          showToast("Your attendance is marked", "success");
        } else {
          setState("error");
          setMessage(data.error || "Something went wrong");
          showToast(data.error || "Something went wrong", "error");
        }
      } catch {
        setState("error");
        setMessage("Couldn't reach the server - check your connection and try again");
        showToast("Couldn't reach the server", "error");
      }
    }

    markAttendance();
  }, [token, showToast]);

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        {state === "checking" && (
          <>
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-600" />
            <p className="text-slate-600">Verifying your attendance...</p>
          </>
        )}

        {state === "success" && (
          <>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-3xl text-emerald-600">
              ✓
            </div>
            <h1 className="text-lg font-semibold text-slate-900">Attendance marked</h1>
            <p className="mt-1 text-sm text-slate-500">{message}</p>
          </>
        )}

        {state === "error" && (
          <>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-3xl text-red-600">
              ✕
            </div>
            <h1 className="text-lg font-semibold text-slate-900">Couldn't mark attendance</h1>
            <p className="mt-1 text-sm text-slate-500">{message}</p>
          </>
        )}
      </div>
    </main>
  );
}
