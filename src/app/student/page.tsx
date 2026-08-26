
"use client";

import { useEffect, useState } from "react";

type SubjectSummary = {
  subject: { name: string; code: string };
  section: { name: string; year: number };
  totalSessions: number;
  attended: number;
  percentage: number | null;
};

type SummaryData = {
  subjects: SubjectSummary[];
  overall: {
    totalSessions: number;
    attended: number;
    percentage: number | null;
  };
};

type SectionData = {
  section: { name: string; year: number };
  students: { id: string }[];
};

export default function StudentDashboard() {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [sectionData, setSectionData] = useState<SectionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSummary() {
      try {
        const [summaryRes, sectionRes] = await Promise.all([
          fetch("/api/student/attendance/summary"),
          fetch("/api/student/section"),
        ]);
        setSummary(await summaryRes.json());
        if (sectionRes.ok) setSectionData(await sectionRes.json());
      } catch (err) {
        console.error("Failed to load summary:", err);
      } finally {
        setLoading(false);
      }
    }
    loadSummary();
  }, []);

  if (loading) return <div>Loading...</div>;

  if (!summary) return <div>Failed to load attendance data</div>;

  const overallPercentage = summary.overall.percentage;
  const isWarning = overallPercentage !== null && overallPercentage < 75;

  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-900 mb-6">My Attendance</h1>

      {/* Overall percentage card */}
      <div
        className={`rounded-lg p-8 mb-8 ${
          isWarning ? "bg-red-50 border border-red-200" : "bg-emerald-50 border border-emerald-200"
        }`}
      >
        <div className="text-center">
          <div
            className={`text-6xl font-bold ${
              isWarning ? "text-red-600" : "text-emerald-600"
            }`}
          >
            {overallPercentage !== null ? `${overallPercentage.toFixed(1)}%` : "N/A"}
          </div>
          <div className={`text-sm mt-2 ${isWarning ? "text-red-600" : "text-emerald-600"}`}>
            {isWarning ? "⚠️ Below minimum attendance" : "✓ Attendance on track"}
          </div>
          <div className="text-sm text-slate-600 mt-2">
            {summary.overall.attended} / {summary.overall.totalSessions} sessions attended
          </div>
        </div>
      </div>

      {/* Section card - only ever shows the ONE section this student
          actually belongs to */}
      {sectionData && (
        <a
          href="/student/section"
          className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-6 mb-8 hover:border-slate-400 hover:shadow-sm transition"
        >
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
              My Section
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-1">
              {sectionData.section.name} ({sectionData.section.year})
            </div>
            <div className="text-sm text-slate-600 mt-1">
              {sectionData.students.length} student{sectionData.students.length === 1 ? "" : "s"} in
              this class
            </div>
          </div>
          <span className="text-sm font-medium text-slate-500">View classmates →</span>
        </a>
      )}

      {/* Per-subject breakdown */}
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">Subject-wise Attendance</h2>

        <div className="space-y-4">
          {summary.subjects.map((subject, idx) => (
            <div key={idx} className="flex items-center justify-between border-b pb-4 last:border-b-0">
              <div>
                <div className="font-medium text-slate-900">
                  {subject.subject.code} - {subject.subject.name}
                </div>
                <div className="text-sm text-slate-600">
                  {subject.section.name} ({subject.section.year})
                </div>
              </div>
              <div className="text-right">
                <div
                  className={`text-2xl font-bold ${
                    subject.percentage !== null && subject.percentage < 75
                      ? "text-red-600"
                      : "text-emerald-600"
                  }`}
                >
                  {subject.percentage !== null ? `${subject.percentage.toFixed(1)}%` : "N/A"}
                </div>
                <div className="text-xs text-slate-600">
                  {subject.attended} / {subject.totalSessions}
                </div>
              </div>
            </div>
          ))}
        </div>

        {summary.subjects.length === 0 && (
          <div className="text-center py-8 text-slate-500">
            No enrolled subjects yet
          </div>
        )}
      </div>
    </div>
  );
}
