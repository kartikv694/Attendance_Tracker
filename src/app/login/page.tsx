"use client";

// Login page - the entry point before anyone sees a dashboard.
// Takes email + password, calls the login API, stores session, redirects
// to the appropriate dashboard based on role.

import { useState } from "react";
import { useToast } from "@/components/shared/toast";
import { PasswordInput } from "@/components/shared/password-input";
import { SESSION_TOKEN_KEY } from "@/lib/session-fetch";

export default function LoginPage() {
  const { showToast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        showToast(data.error || "Login failed", "error");
        setLoading(false);
        return;
      }

      showToast("Login successful", "success");

      // Stored per-tab (sessionStorage, not localStorage/cookie) so THIS
      // tab keeps its own identity from here on, independent of whatever
      // any other open tab is logged in as. See session-fetch.ts.
      window.sessionStorage.setItem(SESSION_TOKEN_KEY, data.token);

      // redirect based on role
      const roleMap: Record<string, string> = {
        ADMIN: "/admin",
        TEACHER: "/teacher",
        STUDENT: "/student",
      };

      const redirectPath = roleMap[data.role] || "/";
      // A full navigation (not router.push) here is deliberate: switching
      // accounts must also throw away Next's client-side Router Cache, or
      // a previously visited page for a different role can get reused
      // for the new session and render the wrong dashboard.
      window.location.href = redirectPath;
    } catch (err) {
      showToast("Something went wrong", "error");
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-linear-to-br from-slate-50 to-slate-100 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-slate-900">Attendance</h1>
          <p className="mt-2 text-sm text-slate-600">QR-based attendance tracking</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
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

          <div>
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-slate-700">Password</label>
              <a href="/forgot-password" className="text-xs font-medium text-slate-500 hover:text-slate-700">
                Forgot password?
              </a>
            </div>
            <PasswordInput
              value={password}
              onChange={setPassword}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-lg bg-slate-900 py-2 font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-500">
          First time? Ask your admin to create an account.
        </p>
      </div>
    </main>
  );
}
