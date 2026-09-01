import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,

  // Turbopack persists compiled work across `next dev` restarts in
  // `.next/dev/cache/turbopack` (default: on, since Next 16.1). After heavy
  // HMR churn (renaming/moving routes, editing shared layouts) this cache
  // can get out of sync and serve one route's stale compiled HTML/RSC
  // payload for a completely different URL - which is exactly what caused
  // /student/mark-attendance to render the admin Students page and call
  // admin-only APIs (403s on /api/admin/sections + /api/admin/students).
  // Disabling it trades a bit of dev rebuild speed for correctness.
  experimental: {
    turbopackFileSystemCacheForDev: false,
  },
};

export default nextConfig;
