"use client";

// Two-step forgot-password flow:
//   1. enter email -> request a 6-digit code (emailed via SMTP)
//   2. enter the code + a new password -> reset
// Kept as one page with a `step` switch rather than two routes since the
// email carries across both steps and there's nothing else to navigate to
// in between.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/shared/toast";

type Step = "email" | "reset";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRequestCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Failed to send reset code", "error");
        return;
      }
      showToast("Check your email for the 6-digit code", "success");
      setStep("reset");
    } catch {
      showToast("Something went wrong", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Failed to reset password", "error");
        return;
      }
      showToast("Password updated - log in with your new password", "success");
      router.push("/login");
    } catch {
      showToast("Something went wrong", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-linear-to-br from-slate-50 to-slate-100 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-slate-900">Reset your password</h1>
          <p className="mt-2 text-sm text-slate-600">
            {step === "email"
              ? "Enter your account email and we'll send you a 6-digit code."
              : `Enter the 6-digit code sent to ${email}, and your new password.`}
          </p>
        </div>

        {step === "email" && (
          <form onSubmit={handleRequestCode} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@college.edu"
                className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2 text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:outline-none"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded-lg bg-slate-900 py-2 font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {loading ? "Sending..." : "Send code"}
            </button>
          </form>
        )}

        {step === "reset" && (
          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">6-digit code</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="123456"
                className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2 text-center text-lg tracking-[0.5em] text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">New password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2 text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:outline-none"
                required
                minLength={6}
              />
            </div>
            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="mt-2 w-full rounded-lg bg-slate-900 py-2 font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {loading ? "Resetting..." : "Reset password"}
            </button>
            <button
              type="button"
              onClick={() => setStep("email")}
              className="w-full text-center text-xs font-medium text-slate-500 hover:text-slate-700"
            >
              Use a different email or resend the code
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-xs text-slate-500">
          <a href="/login" className="hover:text-slate-700">Back to login</a>
        </p>
      </div>
    </main>
  );
}
