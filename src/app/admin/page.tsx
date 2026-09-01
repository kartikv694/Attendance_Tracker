"use client";

import { useEffect, useState } from "react";
import { Skeleton, StatCardsSkeleton } from "@/components/shared/skeleton";

type Stats = {
  students: number;
  teachers: number;
  sections: number;
  subjects: number;
};

async function fetchTotal(url: string): Promise<number> {
  try {
    const res = await fetch(url);
    if (!res.ok) return 0;
    const data = await res.json();
    return data.pagination?.total ?? 0;
  } catch {
    return 0;
  }
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        // no dedicated /api/admin/stats endpoint - each list endpoint
        // already returns a pagination.total, so a tiny (pageSize=1) page
        // from each one is enough to build the counts here
        const [students, teachers, sections, subjects] = await Promise.all([
          fetchTotal("/api/admin/students?page=1&pageSize=1"),
          fetchTotal("/api/admin/teachers?page=1&pageSize=1"),
          fetchTotal("/api/admin/sections?page=1&pageSize=1"),
          fetchTotal("/api/admin/subjects?page=1&pageSize=1"),
        ]);
        setStats({ students, teachers, sections, subjects });
      } catch (err) {
        console.error("Failed to load stats:", err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  if (loading) {
    return (
      <div>
        <Skeleton className="h-8 w-48 mb-8" />
        <StatCardsSkeleton count={4} columnsClassName="grid-cols-4" />
      </div>
    );
  }

  const cards = [
    { label: "Total Students", value: stats?.students || 0, href: "/admin/students" },
    { label: "Total Teachers", value: stats?.teachers || 0, href: "/admin/teachers" },
    { label: "Sections", value: stats?.sections || 0, href: "/admin/sections" },
    { label: "Subjects", value: stats?.subjects || 0, href: "/admin/subjects" },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-900 mb-8">Admin Dashboard</h1>

      <div className="grid grid-cols-4 gap-4 mb-8">
        {cards.map((card) => (
          <a
            key={card.label}
            href={card.href}
            className="rounded-lg border border-slate-200 bg-white p-6 hover:border-slate-400 hover:shadow-sm transition"
          >
            <div className="text-3xl font-bold text-slate-900">{card.value}</div>
            <div className="text-sm text-slate-600 mt-1">{card.label}</div>
          </a>
        ))}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">Quick Actions</h2>
        <div className="space-y-2">
          <p className="text-sm text-slate-600">
            • Use the Manage menu in the sidebar to add or review students, teachers, sections, and subjects
          </p>
          <p className="text-sm text-slate-600">
            • View system-wide reports from the Reports section
          </p>
          <p className="text-sm text-slate-600">
            • Export attendance data in CSV or Excel format
          </p>
        </div>
      </div>
    </div>
  );
}
