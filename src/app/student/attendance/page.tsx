"use client";

import { useEffect, useState } from "react";
import { useSearch, matchesSearch } from "@/components/shared/search-context";
import { Pagination } from "@/components/shared/pagination";
import { TableSkeleton } from "@/components/shared/skeleton";

type HistoryRow = {
  id: string;
  status: string;
  markedVia: string;
  markedAt: string;
  session: {
    sessionDate: string;
    subjectSection: {
      subject: { name: string; code: string };
      section: { name: string; year: number };
    };
  };
};

export default function StudentAttendanceHistoryPage() {
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const { query } = useSearch();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => { setPage(1); }, [from, to]);

  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, page, pageSize]);

  async function loadHistory() {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (from) params.set("from", from);
    if (to) params.set("to", to);

    try {
      const res = await fetch(`/api/student/attendance?${params}`);
      const data = await res.json();
      setRows(data.data || []);
      setTotal(data.pagination?.total ?? 0);
      setTotalPages(data.pagination?.totalPages ?? 1);
    } catch (err) {
      console.error("Failed to load history:", err);
    } finally {
      setLoading(false);
    }
  }

  const filteredRows = rows.filter((row) =>
    matchesSearch(
      query,
      row.session.subjectSection.subject.name,
      row.session.subjectSection.subject.code,
      row.session.subjectSection.section.name,
      row.status,
      row.markedVia
    )
  );

  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-900 mb-6">My Attendance</h1>

      <div className="rounded-lg border border-slate-200 bg-white p-4 mb-6 flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">From</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">To</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          />
        </div>
      </div>

      {loading ? (
        <TableSkeleton rows={6} columns={5} />
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Subject</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Section</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Date</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Status</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Via</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredRows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50">
                  <td className="px-6 py-3 text-sm text-slate-900">
                    {row.session.subjectSection.subject.code} -{" "}
                    {row.session.subjectSection.subject.name}
                  </td>
                  <td className="px-6 py-3 text-sm text-slate-600">
                    {row.session.subjectSection.section.name} (
                    {row.session.subjectSection.section.year})
                  </td>
                  <td className="px-6 py-3 text-sm text-slate-600">
                    {new Date(row.session.sessionDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-3 text-sm">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        row.status === "PRESENT"
                          ? "bg-emerald-100 text-emerald-700"
                          : row.status === "LATE"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-sm text-slate-500">{row.markedVia}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredRows.length === 0 && (
            <div className="text-center py-8 text-slate-500">
              {rows.length === 0
                ? "No attendance records for this range"
                : "No attendance records match your search"}
            </div>
          )}
        </div>
      )}
      <Pagination
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={pageSize}
        itemLabel="attendance records"
        onPageChange={setPage}
        onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
      />

    </div>
  );
}
