import { DashboardLayout } from "@/components/shared/layout";

// Force every page under this role's dashboard to be rendered fresh on
// every request, never served from a cached/prerendered snapshot. These
// are all "use client" pages that fetch their own data anyway, so there's
// no upside to caching the shell - and the downside, if the dev server's
// route cache ever gets out of sync (e.g. after heavy Turbopack HMR
// churn), is a request for one role's page returning another role's
// cached HTML. Not worth the risk.
export const dynamic = "force-dynamic";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
