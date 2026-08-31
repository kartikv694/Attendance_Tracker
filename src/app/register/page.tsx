"use client";

// Register page - only ever creates the FIRST admin account (see
// /api/auth/register). Anyone hitting this after an admin already exists
// gets a clear message instead of a form that silently fails.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/shared/toast";
import { PasswordInput } from "@/components/shared/password-input";

export default function RegisterPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        showToast(data.error || "Registration failed", "error");
        setLoading(false);
        return;
      }

      showToast("Admin account created - you can log in now", "success");
      router.push("/login");
    } catch {
      showToast("Something went wrong", "error");
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#EFEEE9] px-4">
      <div className="w-full max-w-md rounded-sm border border-[#202A3C]/15 bg-[#FAF9F6] p-8">
        <div className="mb-8">
          <h1 className="font-[family-name:var(--font-fraunces)] text-2xl text-[#202A3C]">
            Create the admin account
          </h1>
          <p className="mt-2 text-sm text-[#202A3C]/60">
            This only works once. After the first admin exists, every other
            account gets created from inside the admin dashboard.
          </p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#202A3C]">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-md border border-[#202A3C]/20 px-4 py-2 text-[#202A3C] focus:border-[#202A3C]/50 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#202A3C]">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@college.edu"
              className="mt-1 w-full rounded-md border border-[#202A3C]/20 px-4 py-2 text-[#202A3C] placeholder-[#202A3C]/30 focus:border-[#202A3C]/50 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#202A3C]">Password</label>
            <PasswordInput
              value={password}
              onChange={setPassword}
              placeholder="At least 6 characters"
              required
              minLength={6}
              autoComplete="new-password"
              className="mt-1 w-full rounded-md border border-[#202A3C]/20 px-4 py-2 pr-10 text-[#202A3C] placeholder-[#202A3C]/30 focus:border-[#202A3C]/50 focus:outline-none"
              iconClassName="absolute right-3 top-1/2 mt-0.5 -translate-y-1/2 text-[#202A3C]/40 hover:text-[#202A3C]/70"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full rounded-md bg-[#202A3C] py-2 font-medium text-[#EFEEE9] hover:bg-[#2b3852] disabled:opacity-50"
          >
            {loading ? "Creating account..." : "Create admin account"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-[#202A3C]/50">
          Already have an account?{" "}
          <a href="/login" className="underline hover:text-[#202A3C]">
            Log in
          </a>
        </p>
      </div>
    </main>
  );
}
