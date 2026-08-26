import Link from "next/link";
import { Fraunces, Inter, IBM_Plex_Mono } from "next/font/google";

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-fraunces",
});
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
});
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
});

const NAVY = "#161D2E";
const NAVY_LIGHT = "#1F273C";
const PAPER = "#F1EFE6";
const STAMP = "#C1440E";
const SAGE = "#6E8F6B";
const CREAM_TEXT = "#EDEAE0";

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="font-[family-name:var(--font-plex-mono)] text-[11px] uppercase tracking-[0.2em]"
      style={{ color: STAMP }}
    >
      {children}
    </p>
  );
}

export default function LandingPage() {
  return (
    <main
      className={`${fraunces.variable} ${inter.variable} ${plexMono.variable} font-[family-name:var(--font-inter)]`}
      style={{ backgroundColor: NAVY, color: CREAM_TEXT }}
    >
      {/* ---- Nav ---- */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-7">
        <div className="font-[family-name:var(--font-fraunces)] text-xl font-medium">
          Roll Call
        </div>
        <div className="flex items-center gap-5">
          <Link
            href="/login"
            className="font-[family-name:var(--font-plex-mono)] text-xs uppercase tracking-[0.1em] text-[#EDEAE0]/70 hover:text-[#EDEAE0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ outlineColor: STAMP }}
          >
            Log In
          </Link>
          <Link
            href="/register"
            style={{ backgroundColor: STAMP }}
            className="rounded-sm px-5 py-2 font-[family-name:var(--font-plex-mono)] text-xs uppercase tracking-[0.1em] text-white hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white transition-opacity"
          >
            Sign Up
          </Link>
        </div>
      </header>

      {/* ---- Hero ---- */}
      <section className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-16 px-6 pb-24 pt-8 md:grid-cols-[1.1fr_0.9fr] md:pt-16">
        <div>
          <Eyebrow>For teachers tired of calling names</Eyebrow>
          <h1 className="mt-5 font-[family-name:var(--font-fraunces)] text-5xl leading-[1.05] md:text-6xl">
            Attendance that stamps itself.
          </h1>
          <p className="mt-6 max-w-md text-base leading-relaxed text-[#EDEAE0]/70">
            Open a session, a QR appears, a student scans it. Present is
            present — logged the instant it happens, not argued about
            afterward.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-5">
            <Link
              href="/register"
              style={{ backgroundColor: STAMP }}
              className="rounded-sm px-6 py-3 text-sm font-medium text-white hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white transition-opacity"
            >
              Sign Up
            </Link>
            <a
              href="#how-it-works"
              className="text-sm font-medium text-[#EDEAE0]/80 underline decoration-[#EDEAE0]/30 underline-offset-4 hover:text-[#EDEAE0] hover:decoration-[#EDEAE0]"
            >
              See how it works
            </a>
          </div>
        </div>

        {/* index card - the signature roll-sheet + stamp */}
        <div className="relative mx-auto w-full max-w-sm rotate-[2deg]">
          <div
            className="rounded-sm p-6 shadow-[10px_10px_0_0_rgba(0,0,0,0.25)]"
            style={{ backgroundColor: PAPER, color: "#1E2438" }}
          >
            <p className="font-[family-name:var(--font-plex-mono)] text-[10px] uppercase tracking-[0.15em] text-[#1E2438]/50">
              CS301 · Data Structures · 3A
            </p>
            <ul className="mt-4 space-y-3">
              {[
                { name: "Meera Nair", time: "09:02:14" },
                { name: "Arjun Patel", time: "09:02:31" },
                { name: "Sana Iyer", time: "09:03:02" },
              ].map((row) => (
                <li
                  key={row.name}
                  className="flex items-center justify-between border-b border-[#1E2438]/10 pb-3 text-sm last:border-b-0 last:pb-0"
                >
                  <span>{row.name}</span>
                  <span
                    className="font-[family-name:var(--font-plex-mono)] text-xs"
                    style={{ color: SAGE }}
                  >
                    ✓ {row.time}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div
            className="motion-safe:animate-stamp-drop absolute -right-7 -top-7 flex h-28 w-28 rotate-[-9deg] select-none items-center justify-center rounded-full border-[3px]"
            style={{ borderColor: STAMP, color: STAMP, backgroundColor: PAPER }}
          >
            <div className="text-center leading-none">
              <div className="font-[family-name:var(--font-plex-mono)] text-[8px] tracking-[0.2em]">
                MARKED
              </div>
              <div className="font-[family-name:var(--font-fraunces)] text-base font-medium">
                PRESENT
              </div>
              <div className="font-[family-name:var(--font-plex-mono)] text-[8px] tracking-[0.2em]">
                09:02 AM
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---- perforated divider ---- */}
      <div className="mx-auto max-w-6xl border-t border-dashed px-6" style={{ borderColor: `${CREAM_TEXT}25` }} />

      {/* ---- How it works: a genuine 3-step sequence ---- */}
      <section id="how-it-works" className="mx-auto max-w-6xl px-6 py-24">
        <Eyebrow>How it works</Eyebrow>
        <h2 className="mt-4 max-w-lg font-[family-name:var(--font-fraunces)] text-3xl">
          Three steps, none of them slow.
        </h2>

        <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
          {[
            {
              n: "01",
              title: "Open a session",
              body: "The teacher starts a session for their class. A fresh QR appears, counting down.",
            },
            {
              n: "02",
              title: "Scan it",
              body: "A student opens their camera, scans, and lands on a one-tap confirmation screen.",
            },
            {
              n: "03",
              title: "It's stamped",
              body: "Present is recorded instantly. No double marks, no scans after the QR expires.",
            },
          ].map((step) => (
            <div key={step.n} className="rounded-sm p-7" style={{ backgroundColor: NAVY_LIGHT }}>
              <div
                className="font-[family-name:var(--font-fraunces)] text-3xl"
                style={{ color: STAMP }}
              >
                {step.n}
              </div>
              <h3 className="mt-4 font-[family-name:var(--font-fraunces)] text-lg">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#EDEAE0]/65">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="mx-auto max-w-6xl border-t border-dashed px-6" style={{ borderColor: `${CREAM_TEXT}25` }} />

      {/* ---- What you get: cards on paper, not numbered - not a sequence ---- */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <Eyebrow>What you get</Eyebrow>
        <h2 className="mt-4 max-w-lg font-[family-name:var(--font-fraunces)] text-3xl">
          Built around who's actually looking at it.
        </h2>

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          {[
            {
              title: "Every role gets its own view",
              body: "Admins run the institution, teachers run the room, students see their own record and nothing more.",
            },
            {
              title: "Reports you can export",
              body: "Filter by date, section, or subject, then download to CSV or Excel when someone upstairs asks for numbers.",
            },
            {
              title: "A paper trail for every change",
              body: "Manual edits are logged — who changed a record, when, and why, not just the final number.",
            },
          ].map((card) => (
            <div
              key={card.title}
              className="rounded-sm p-7"
              style={{ backgroundColor: PAPER, color: "#1E2438" }}
            >
              <h3 className="font-[family-name:var(--font-fraunces)] text-lg">{card.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#1E2438]/70">{card.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---- Testimonial ---- */}
      <section className="mx-auto max-w-2xl px-6 py-20 text-center">
        <p className="font-[family-name:var(--font-fraunces)] text-2xl italic leading-relaxed">
          "Attendance used to eat the first ten minutes of every class. Now
          it's done before I've finished writing the date on the board."
        </p>
        <p
          className="mt-6 font-[family-name:var(--font-plex-mono)] text-xs uppercase tracking-[0.15em]"
          style={{ color: `${CREAM_TEXT}60` }}
        >
          — a professor who no longer calls out names
        </p>
      </section>

      {/* ---- Closing CTA card ---- */}
      <section className="mx-auto max-w-4xl px-6 pb-24">
        <div
          className="flex flex-col items-center gap-6 rounded-sm px-8 py-14 text-center md:flex-row md:justify-between md:text-left"
          style={{ backgroundColor: PAPER, color: "#1E2438" }}
        >
          <div>
            <h2 className="font-[family-name:var(--font-fraunces)] text-2xl">
              Stop taking attendance the slow way.
            </h2>
            <p className="mt-2 text-sm text-[#1E2438]/65">
              Set up your first class in a few minutes.
            </p>
          </div>
          <Link
            href="/register"
            style={{ backgroundColor: STAMP }}
            className="shrink-0 rounded-sm px-7 py-3 text-sm font-medium text-white hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 transition-opacity"
          >
            Sign Up
          </Link>
        </div>
      </section>

      {/* ---- Footer ---- */}
      <footer
        className="border-t px-6 py-8"
        style={{ borderColor: `${CREAM_TEXT}15` }}
      >
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 font-[family-name:var(--font-plex-mono)] text-xs text-[#EDEAE0]/40 md:flex-row">
          <span>Roll Call — attendance, kept honest.</span>
          <div className="flex gap-5">
            <Link href="/login" className="hover:text-[#EDEAE0]/70">
              Log In
            </Link>
            <Link href="/register" className="hover:text-[#EDEAE0]/70">
              Sign Up
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
