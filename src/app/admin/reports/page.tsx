"use client";

import { useEffect, useState } from "react";
import { useSearch, matchesSearch } from "@/components/shared/search-context";

type ReportRow = {
  id: string;
  status: "PRESENT" | "ABSENT" | "LATE";
  markedVia: "QR" | "MANUAL";
  markedAt: string;
  student: {
    rollNumber: string;
    user: { name: string };
  };
  session: {
    sessionDate: string;
    subjectSection: {
      subject: { name: string; code: string };
      section: { name: string; year: number };
      teacher: { user: { name: string } };
    };
  };
};

const statusStyles: Record<ReportRow["status"], string> = {
  PRESENT: "bg-emerald-50 text-emerald-700",
  LATE: "bg-amber-50 text-amber-700",
  ABSENT: "bg-red-50 text-red-700",
};

export default function AdminReportsPage() {
  const { query } = useSearch();
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadReports() {
      try {
        const res = await fetch(`/api/admin/reports?page=1&pageSize=100`);
        const data = await res.json();
        setRows(data.data || []);
      } catch (err) {
        console.error("Failed to load reports:", err);
      } finally {
        setLoading(false);
      }
    }
    loadReports();
  }, []);

  if (loading) return <div>Loading...</div>;

  const filtered = rows.filter((row) =>
    matchesSearch(
      query,
      row.student.user.name,
      row.student.rollNumber,
      row.session.subjectSection.subject.name,
      row.session.subjectSection.subject.code,
      row.session.subjectSection.section.name,
      row.session.subjectSection.teacher.user.name,
      row.status
    )
  );

  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-900 mb-6">Reports</h1>

      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Student</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Roll No.</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Subject</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Section</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Teacher</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Date</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map((row) => (
              <tr key={row.id} className="hover:bg-slate-50">
                <td className="px-6 py-3 text-sm text-slate-900">{row.student.user.name}</td>
                <td className="px-6 py-3 text-sm text-slate-600">{row.student.rollNumber}</td>
                <td className="px-6 py-3 text-sm text-slate-600">
                  {row.session.subjectSection.subject.code} - {row.session.subjectSection.subject.name}
                </td>
                <td className="px-6 py-3 text-sm text-slate-600">
                  {row.session.subjectSection.section.name} ({row.session.subjectSection.section.year})
                </td>
                <td className="px-6 py-3 text-sm text-slate-600">
                  {row.session.subjectSection.teacher.user.name}
                </td>
                <td className="px-6 py-3 text-sm text-slate-600">
                  {new Date(row.session.sessionDate).toLocaleDateString()}
                </td>
                <td className="px-6 py-3 text-sm">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[row.status]}`}>
                    {row.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-8 text-slate-500">
          {rows.length === 0 ? "No attendance records found" : "No records match your search"}
        </div>
      )}
    </div>
  );
}
