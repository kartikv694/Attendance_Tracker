"use client";

import { Pagination } from "@/components/shared/pagination";
import { useEffect, useState } from "react";
import { useSearch, matchesSearch } from "@/components/shared/search-context";
import { SearchBar } from "@/components/shared/search-bar";
import { Skeleton, TableSkeleton } from "@/components/shared/skeleton";

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

// The report route filters by sectionId/subjectId separately, not by the
// subjectSection join row itself - so the "Class" dropdown keeps both ids
// around and sends them as two separate query params under the hood.
type Assignment = {
  id: string;
  subjectId: string;
  sectionId: string;
  subject: { name: string; code: string };
  section: { name: string; year: number };
};

const statusStyles: Record<ReportRow["status"], string> = {
  PRESENT: "bg-emerald-50 text-emerald-700",
  LATE: "bg-amber-50 text-amber-700",
  ABSENT: "bg-red-50 text-red-700",
};

export default function AdminReportsPage() {
  const { query } = useSearch();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [subjectSectionId, setSubjectSectionId] = useState("");
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    async function loadAssignments() {
      try {
        const res = await fetch("/api/admin/subject-sections");
        const data = await res.json();
        setAssignments(data.data || []);
      } catch (err) {
        console.error("Failed to load classes:", err);
      }
    }
    loadAssignments();
  }, []);

  async function loadReports() {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    const chosen = assignments.find((a) => a.id === subjectSectionId);
    if (chosen) {
      params.set("subjectId", chosen.subjectId);
      params.set("sectionId", chosen.sectionId);
    }
    if (status) params.set("status", status);
    if (from) params.set("from", from);
    if (to) params.set("to", to);

    try {
      const res = await fetch(`/api/admin/reports?${params}`);
      const data = await res.json();
      setRows(data.data || []);
      setTotal(data.pagination?.total ?? 0);
      setTotalPages(data.pagination?.totalPages ?? 1);
    } catch (err) {
      console.error("Failed to load reports:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, status, from, to, subjectSectionId, assignments]);

  function updateFilter(setter: (v: string) => void, value: string) {
    setter(value);
    setPage(1);
  }

  function exportReport(format: "csv" | "xlsx") {
    const params = new URLSearchParams({ format });
    const chosen = assignments.find((a) => a.id === subjectSectionId);
    if (chosen) {
      params.set("subjectId", chosen.subjectId);
      params.set("sectionId", chosen.sectionId);
    }
    if (status) params.set("status", status);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    window.open(`/api/admin/reports/export?${params}`, "_blank");
  }

  if (loading && rows.length === 0) {
    return (
      <div>
        <Skeleton className="h-8 w-40 mb-6" />
        <TableSkeleton rows={7} columns={7} />
      </div>
    );
  }

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

      <SearchBar placeholder="Search reports by student, subject, teacher..." />

      <div className="rounded-lg border border-slate-200 bg-white p-4 mb-6 flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Class</label>
          <select
            value={subjectSectionId}
            onChange={(e) => updateFilter(setSubjectSectionId, e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          >
            <option value="">All classes</option>
            {assignments.map((a) => (
              <option key={a.id} value={a.id}>
                {a.subject.code} · {a.section.name} ({a.section.year})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
          <select
            value={status}
            onChange={(e) => updateFilter(setStatus, e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          >
            <option value="">All</option>
            <option value="PRESENT">Present</option>
            <option value="ABSENT">Absent</option>
            <option value="LATE">Late</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">From</label>
          <input
            type="date"
            value={from}
            onChange={(e) => updateFilter(setFrom, e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">To</label>
          <input
            type="date"
            value={to}
            onChange={(e) => updateFilter(setTo, e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          />
        </div>
        {(subjectSectionId || status || from || to) && (
          <button
            onClick={() => {
              setSubjectSectionId("");
              setStatus("");
              setFrom("");
              setTo("");
              setPage(1);
            }}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Clear filters
          </button>
        )}
        <div className="ml-auto flex gap-2">
          <button
            onClick={() => exportReport("csv")}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Export CSV
          </button>
          <button
            onClick={() => exportReport("xlsx")}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Export Excel
          </button>
        </div>
      </div>

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

        {filtered.length === 0 && (
          <div className="text-center py-8 text-slate-500">
            {rows.length === 0 ? "No attendance records found" : "No records match your search"}
          </div>
        )}
      </div>

      <Pagination
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={pageSize}
        itemLabel="records"
        onPageChange={setPage}
        onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
      />
    </div>
  );
}
