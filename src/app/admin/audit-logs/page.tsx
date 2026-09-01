"use client";

// Every attendance status change, system-wide - manual teacher overrides
// and the automatic "session closed, still-missing students marked
// absent" sweep alike. Filterable by date range and paginated server-side
// (unlike the plain reports page, this one can genuinely grow without
// bound since every edit adds a row, not just every session).

import { Pagination } from "@/components/shared/pagination";
import { useEffect, useState } from "react";
import { useSearch } from "@/components/shared/search-context";
import { SearchBar } from "@/components/shared/search-bar";
import { Skeleton, TableSkeleton } from "@/components/shared/skeleton";

type AuditLogRow = {
  id: string;
  previousStatus: "PRESENT" | "ABSENT" | "LATE" | null;
  newStatus: "PRESENT" | "ABSENT" | "LATE";
  reason: string | null;
  changedAt: string;
  changedByUser: { name: string; email: string; role: string };
  attendanceRecord: {
    student: { user: { name: string } };
    session: {
      sessionDate: string;
      subjectSection: {
        subject: { name: string; code: string };
        section: { name: string; year: number };
      };
    };
  };
};

const statusStyles: Record<string, string> = {
  PRESENT: "bg-emerald-50 text-emerald-700",
  LATE: "bg-amber-50 text-amber-700",
  ABSENT: "bg-red-50 text-red-700",
};

function StatusBadge({ status }: { status: string | null }) {
  if (!status) {
    return <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">Unmarked</span>;
  }
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[status] || "bg-slate-100 text-slate-600"}`}>
      {status}
    </span>
  );
}

export default function AdminAuditLogsPage() {
  const [rows, setRows] = useState<AuditLogRow[]>([]);
  const { query } = useSearch();
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => { setPage(1); }, [query]);

  async function loadLogs() {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (query.trim()) params.set("search", query.trim());
    if (from) params.set("from", from);
    if (to) params.set("to", to);

    try {
      const res = await fetch(`/api/admin/audit-logs?${params}`);
      const data = await res.json();
      setRows(data.data || []);
      setTotal(data.pagination?.total ?? 0);
      setTotalPages(data.pagination?.totalPages ?? 1);
    } catch (err) {
      console.error("Failed to load audit logs:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, from, to, query]);

  // filters changed - always snap back to page 1 so the view isn't left
  // showing an out-of-range page for the new, narrower result set
  function updateFrom(value: string) {
    setFrom(value);
    setPage(1);
  }
  function updateTo(value: string) {
    setTo(value);
    setPage(1);
  }

  if (loading && rows.length === 0) {
    return (
      <div>
        <Skeleton className="h-8 w-40 mb-6" />
        <TableSkeleton rows={7} columns={6} />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-900 mb-1">Audit Log</h1>
      <p className="text-sm text-slate-500 mb-6">
        Every attendance record change - manual edits and auto-marked absences alike.
      </p>

      <SearchBar placeholder="Search by student, subject, teacher, or reason..." />

      <div className="rounded-lg border border-slate-200 bg-white p-4 mb-6 flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Session date from</label>
          <input
            type="date"
            value={from}
            onChange={(e) => updateFrom(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Session date to</label>
          <input
            type="date"
            value={to}
            onChange={(e) => updateTo(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          />
        </div>
        {(from || to) && (
          <button
            onClick={() => {
              setFrom("");
              setTo("");
              setPage(1);
            }}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Clear filters
          </button>
        )}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Student</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Class</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Session Date</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Change</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Changed By</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">When</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Reason</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((log) => (
              <tr key={log.id} className="hover:bg-slate-50">
                <td className="px-6 py-3 text-sm text-slate-900">
                  {log.attendanceRecord.student.user.name}
                </td>
                <td className="px-6 py-3 text-sm text-slate-600">
                  {log.attendanceRecord.session.subjectSection.subject.code} ·{" "}
                  {log.attendanceRecord.session.subjectSection.section.name}
                </td>
                <td className="px-6 py-3 text-sm text-slate-600">
                  {new Date(log.attendanceRecord.session.sessionDate).toLocaleDateString()}
                </td>
                <td className="px-6 py-3 text-sm">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={log.previousStatus} />
                    <span className="text-slate-400">→</span>
                    <StatusBadge status={log.newStatus} />
                  </div>
                </td>
                <td className="px-6 py-3 text-sm text-slate-600">
                  {log.changedByUser.name}
                  <span className="ml-1 text-xs text-slate-400">({log.changedByUser.role})</span>
                </td>
                <td className="px-6 py-3 text-sm text-slate-500">
                  {new Date(log.changedAt).toLocaleString()}
                </td>
                <td className="px-6 py-3 text-sm text-slate-500">{log.reason || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {rows.length === 0 && (
          <div className="text-center py-8 text-slate-500">No audit log entries match these filters</div>
        )}
      </div>

      <Pagination
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={pageSize}
        itemLabel="audit entries"
        onPageChange={setPage}
        onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
      />
    </div>
  );
}
