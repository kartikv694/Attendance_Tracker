"use client";

import { useEffect, useState } from "react";

type SubjectSummary = {
  subject: { name: string; code: string };
  section: { name: string; year: number };
  totalSessions: number;
  attended: number;
  absent: number;
  percentage: number | null;
};

type SummaryData = {
  subjects: SubjectSummary[];
  overall: { totalSessions: number; attended: number; percentage: number | null };
};

export default function StudentStatsPage() {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSummary() {
      try {
        const res = await fetch("/api/student/attendance/summary");
        const data = await res.json();
        setSummary(data);
      } catch (err) {
        console.error("Failed to load stats:", err);
      } finally {
        setLoading(false);
      }
    }
    loadSummary();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (!summary) return <div>Failed to load statistics</div>;

  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-900 mb-6">Statistics</h1>

      <div className="rounded-lg border border-slate-200 bg-white p-6 mb-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Per-subject breakdown</h2>

        <div className="space-y-5">
          {summary.subjects.map((subject, idx) => {
            const pct = subject.percentage ?? 0;
            const barColor = pct < 75 ? "bg-red-500" : "bg-emerald-500";
            return (
              <div key={idx}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-slate-900">
                    {subject.subject.code} - {subject.subject.name}
                  </span>
                  <span className="text-sm text-slate-600">
                    {subject.percentage !== null ? `${subject.percentage.toFixed(1)}%` : "N/A"} (
                    {subject.attended}/{subject.totalSessions})
                  </span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${barColor}`}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {summary.subjects.length === 0 && (
          <div className="text-center py-8 text-slate-500">No enrolled subjects yet</div>
        )}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-2">Overall</h2>
        <p className="text-sm text-slate-600">
          You've attended {summary.overall.attended} out of {summary.overall.totalSessions}{" "}
          sessions across all subjects
          {summary.overall.percentage !== null &&
            ` (${summary.overall.percentage.toFixed(1)}%)`}
          .
        </p>
      </div>
    </div>
  );
}
