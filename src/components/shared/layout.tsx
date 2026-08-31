"use client";

// Sidebar + top bar that appears on every dashboard - shows the logged-in
// user's info, nav links for their role, and logout button. Fetches /me on
// mount to get current session details (name, role, email).

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useToast } from "@/components/shared/toast";
import { SearchProvider } from "@/components/shared/search-context";
import { TopBar } from "@/components/shared/topbar";
import { ProfileModal } from "@/components/shared/profile-modal";
import { AppShellSkeleton } from "@/components/shared/skeleton";
import type { SessionPayload } from "@/lib/auth";

type SidebarProps = {
  children: React.ReactNode;
};

type NavLeaf = { label: string; href: string };
type NavGroup = { label: string; children: NavLeaf[] };
type NavItem = NavLeaf | NavGroup;

function isGroup(item: NavItem): item is NavGroup {
  return "children" in item;
}

// Every role gets its own "Dashboard" entry (different landing page per
// role) plus whatever else is relevant to them. Admin's day-to-day CRUD
// pages (students/teachers/sections/subjects) live under a single
// collapsible "Manage" group instead of being flat top-level links.
const navItems: Record<SessionPayload["role"], NavItem[]> = {
  ADMIN: [
    { label: "Dashboard", href: "/admin" },
    {
      label: "Users",
      children: [
        { label: "Students", href: "/admin/students" },
        { label: "Teachers", href: "/admin/teachers" },
      ],
    },
    {
      label: "Manage",
      children: [
        { label: "Sections", href: "/admin/sections" },
        { label: "Subjects", href: "/admin/subjects" },
        { label: "Enrollments", href: "/admin/enrollments" },
      ],
    },
    { label: "Timetable", href: "/admin/timetable" },
    { label: "Reports", href: "/admin/reports" },
    { label: "Audit Log", href: "/admin/audit-logs" },
  ],
  TEACHER: [
    { label: "Dashboard", href: "/teacher" },
    { label: "Sessions", href: "/teacher/sessions" },
    { label: "Live Attendance", href: "/teacher/live" },
    { label: "Mark Attendance", href: "/teacher/attendance" },
  ],
  STUDENT: [
    { label: "Dashboard", href: "/student" },
    { label: "Mark Attendance", href: "/student/mark-attendance" },
    { label: "Timetable", href: "/student/timetable" },
    { label: "Section", href: "/student/section" },
  ],
};

function NavLink({ item, pathname }: { item: NavLeaf; pathname: string }) {
  const active = pathname === item.href;
  return (
    <a
      href={item.href}
      className={`block rounded-lg px-4 py-2 text-sm font-medium transition ${
        active ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
      }`}
    >
      {item.label}
    </a>
  );
}

function NavDropdown({ group, pathname }: { group: NavGroup; pathname: string }) {
  const childActive = group.children.some((c) => pathname.startsWith(c.href));
  const [open, setOpen] = useState(childActive);

  // auto-expand (never auto-collapse) once the admin lands on one of this
  // group's pages, so the active page is never hidden behind a closed menu
  useEffect(() => {
    if (childActive) setOpen(true);
  }, [childActive]);

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex w-full items-center justify-between rounded-lg px-4 py-2 text-sm font-medium transition ${
          childActive ? "text-slate-900" : "text-slate-700 hover:bg-slate-100"
        }`}
      >
        {group.label}
        <span className={`text-xs transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
      </button>
      {open && (
        <div className="ml-2 mt-1 space-y-1 border-l border-slate-200 pl-3">
          {group.children.map((child) => (
            <NavLink key={child.href} item={child} pathname={pathname} />
          ))}
        </div>
      )}
    </div>
  );
}

export function DashboardLayout({ children }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { showToast } = useToast();
  const [session, setSession] = useState<SessionPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchSession() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          setSession(await res.json());
        } else {
          router.push("/login");
        }
      } catch {
        router.push("/login");
      } finally {
        setLoading(false);
      }
    }
    fetchSession();
  }, [router]);

  // close the "view profile / logout" popover when clicking outside of it
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target as Node)) {
        setShowAccountMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    showToast("Logged out", "success");
    router.push("/login");
  }

  if (loading) {
    return <AppShellSkeleton />;
  }

  if (!session) {
    return null;
  }

  const currentNav = navItems[session.role] || [];

  return (
    <SearchProvider>
      <div className="flex min-h-screen bg-slate-50">
        {/* Sidebar */}
        <div className="flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white p-6 shadow-sm">
          {/* Brand - left aligned, no logo mark */}
          <div className="mb-8 text-left">
            <h1 className="text-2xl font-bold text-slate-900">Roll Call</h1>
            <p className="text-xs text-slate-500 mt-1">Management System</p>
          </div>

          {/* Nav grows to fill the space so the account card below always
              sits at the very bottom of the sidebar */}
          <nav className="flex-1 space-y-1 overflow-y-auto">
            {currentNav.map((item) =>
              isGroup(item) ? (
                <NavDropdown key={item.label} group={item} pathname={pathname} />
              ) : (
                <NavLink key={item.href} item={item} pathname={pathname} />
              )
            )}
          </nav>

          <hr className="my-4" />

          {/* Account card, pinned to the bottom of the sidebar */}
          <div className="relative" ref={accountMenuRef}>
            {showAccountMenu && (
              <div className="absolute bottom-full left-0 mb-2 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg z-10">
                <button
                  onClick={() => {
                    setShowAccountMenu(false);
                    setShowProfileModal(true);
                  }}
                  className="block w-full px-4 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  View Profile
                </button>
                <button
                  onClick={handleLogout}
                  className="block w-full border-t border-slate-100 px-4 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  Logout
                </button>
              </div>
            )}

            <button
              onClick={() => setShowAccountMenu((o) => !o)}
              className="flex w-full items-center gap-3 rounded-lg border border-slate-200 p-3 text-left hover:bg-slate-50 transition"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                {session.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-slate-900">{session.name}</div>
                <div className="text-xs text-slate-500">{session.role}</div>
              </div>
              <span className="text-slate-400 text-xs">⋯</span>
            </button>
          </div>
        </div>

        {/* Main content: shared top bar (with search) + page content */}
        <div className="flex flex-1 flex-col">
          <TopBar />
          <div className="flex-1 p-8">{children}</div>
        </div>
      </div>

      {showProfileModal && <ProfileModal onClose={() => setShowProfileModal(false)} />}
    </SearchProvider>
  );
}
