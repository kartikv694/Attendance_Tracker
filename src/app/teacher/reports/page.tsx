"use client";

import { Pagination } from "@/components/shared/pagination";
import { useEffect, useState } from "react";
import { Skeleton, TableSkeleton } from "@/components/shared/skeleton";

type Assignment = { id: string; subject: { name: string; code: string }; section: { name: string; year: number } };
type ReportRow = {
  id: string;
  status: string;
  student: { user: { name: string } };
  session: { sessionDate: string };
};

export default function TeacherReportsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [subjectSectionId, setSubjectSectionId] = useState("");
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    async function loadAssignments() {
      try {
        const res = await fetch("/api/teacher/schedule");
        const data = await res.json();
        const unique = new Map<string, Assignment>();
        (data.schedule || []).forEach(
          (entry: { subjectSectionId: string; subject: { name: string; code: string }; section: { name: string; year: number } }) => {
            if (!unique.has(entry.subjectSectionId)) {
              unique.set(entry.subjectSectionId, {
                id: entry.subjectSectionId,
                subject: entry.subject,
                section: entry.section,
              });
            }
          }
        );
        const list = Array.from(unique.values());
        setAssignments(list);
        if (list.length > 0) setSubjectSectionId(list[0].id);
      } catch (err) {
        console.error("Failed to load assignments:", err);
      } finally {
        setLoading(false);
      }
    }
    loadAssignments();
  }, []);

  // any filter change (not pagination itself) should snap back to page 1,
  // otherwise you can get stuck on page 3 of a filtered set that only has 1 page
  function updateFilter(setter: (v: string) => void, value: string) {
    setter(value);
    setPage(1);
  }

  async function loadReport() {
    const params = new URLSearchParams({
      subjectSectionId,
      page: String(page),
      pageSize: String(pageSize),
    });
    if (status) params.set("status", status);
    if (from) params.set("from", from);
    if (to) params.set("to", to);

    try {
      const res = await fetch(`/api/teacher/reports?${params}`);
      const data = await res.json();
      setRows(data.data || []);
      setTotal(data.pagination?.total ?? 0);
      setTotalPages(data.pagination?.totalPages ?? 1);
    } catch (err) {
      console.error("Failed to load report:", err);
    }
  }

  useEffect(() => {
    if (!subjectSectionId) return;
    loadReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectSectionId, status, from, to, page, pageSize]);

  function exportReport(format: "csv" | "xlsx") {
    const params = new URLSearchParams({ subjectSectionId, format });
    if (status) params.set("status", status);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    window.open(`/api/teacher/reports/export?${params}`, "_blank");
  }

  if (loading) {
    return (
      <div>
        <Skeleton className="h-8 w-32 mb-6" />
        <div className="rounded-lg border border-slate-200 bg-white p-5 mb-6">
          <Skeleton className="h-4 w-32 mb-2" />
          <Skeleton className="h-10 w-full max-w-md" />
        </div>
        <TableSkeleton rows={6} columns={3} />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-900 mb-6">Reports</h1>

      {assignments.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-500">
          You don't have any classes assigned yet.
        </div>
      ) : (
        <>
          <div className="rounded-lg border border-slate-200 bg-white p-4 mb-6 flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Class</label>
              <select
                value={subjectSectionId}
                onChange={(e) => updateFilter(setSubjectSectionId, e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              >
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
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                    Student
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Date</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3 text-sm text-slate-900">{row.student.user.name}</td>
                    <td className="px-6 py-3 text-sm text-slate-600">
                      {new Date(row.session.sessionDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-3 text-sm text-slate-600">{row.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {rows.length === 0 && (
              <div className="text-center py-8 text-slate-500">
                No records match these filters
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
        </>
      )}
    </div>
  );
}
