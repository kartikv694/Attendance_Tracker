"use client";

// Live view of whichever session(s) the teacher currently has open. Shows
// the FULL class roster (not just students who've already scanned in) so
// a teacher can see, at a glance, who's present and who's still pending -
// and how many out of the whole class. Polls every few seconds while a
// session is active so the count updates as students scan the QR, without
// the teacher needing to refresh. Manual mark/update is available right
// here too, for anyone stuck on PENDING.

import { useCallback, useEffect, useState } from "react";
import { Pagination } from "@/components/shared/pagination";
import { useSearch, matchesSearch } from "@/components/shared/search-context";
import { useToast } from "@/components/shared/toast";
import { Skeleton, TableSkeleton } from "@/components/shared/skeleton";

type SessionOption = {
  id: string;
  sessionDate: string;
  isActive: boolean;
  subjectSection: {
    subject: { name: string; code: string };
    section: { name: string; year: number };
  };
};

type RosterRow = {
  student: { id: string; rollNumber: string; user: { name: string } };
  recordId: string | null;
  status: "PRESENT" | "LATE" | "ABSENT" | "PENDING";
  markedVia: "QR" | "MANUAL" | null;
  markedAt: string | null;
};

type LiveData = {
  session: SessionOption;
  roster: RosterRow[];
  counts: { total: number; present: number; late: number; absent: number; pending: number };
};

const POLL_INTERVAL_MS = 4000;

const statusStyles: Record<RosterRow["status"], string> = {
  PRESENT: "bg-emerald-100 text-emerald-700",
  LATE: "bg-amber-100 text-amber-700",
  ABSENT: "bg-red-100 text-red-700",
  PENDING: "bg-slate-100 text-slate-500",
};

export default function TeacherLivePage() {
  const { showToast } = useToast();
  const { query } = useSearch();
  const [sessions, setSessions] = useState<SessionOption[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [live, setLive] = useState<LiveData | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingStudentId, setSavingStudentId] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);

  useEffect(() => { setPage(1); }, [selectedSessionId, query]);

  const loadSessions = useCallback(async () => {
    try {
      const res = await fetch("/api/teacher/sessions");
      const data = await res.json();
      const all: SessionOption[] = data.data || [];
      setSessions(all);
      setSelectedSessionId((current) => {
        if (current && all.some((s) => s.id === current)) return current;
        const active = all.find((s) => s.isActive);
        return active ? active.id : all[0]?.id ?? "";
      });
    } catch {
      showToast("Failed to load sessions", "error");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadLive = useCallback(async (sessionId: string) => {
    try {
      const res = await fetch(`/api/teacher/sessions/${sessionId}/live`);
      const data = await res.json();
      if (res.ok) setLive(data);
    } catch {
      // silent - the next poll will just try again
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    if (!selectedSessionId) {
      setLive(null);
      return;
    }
    loadLive(selectedSessionId);

    const selected = sessions.find((s) => s.id === selectedSessionId);
    if (!selected?.isActive) return;

    // only poll while the selected session is actually still live -
    // no point hammering the API for a closed session that can't change
    const interval = setInterval(() => loadLive(selectedSessionId), POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [selectedSessionId, sessions, loadLive]);

  const filteredRoster = live
    ? live.roster.filter((row) => matchesSearch(query, row.student.user.name, row.student.rollNumber))
    : [];
  const paginatedRoster = filteredRoster.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.max(1, Math.ceil(filteredRoster.length / pageSize));

  async function markStatus(studentId: string, status: "PRESENT" | "ABSENT" | "LATE") {
    if (!live || !selected?.isActive) {
      showToast("Attendance can only be updated while the session is active", "error");
      return;
    }
    setSavingStudentId(studentId);
    const row = live.roster.find((r) => r.student.id === studentId);

    try {
      let res: Response;
      if (row?.recordId) {
        res = await fetch(`/api/teacher/attendance/${row.recordId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });
      } else {
        res = await fetch("/api/teacher/attendance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: selectedSessionId, studentId, status }),
        });
      }
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Failed to update attendance", "error");
        return;
      }
      showToast("Attendance updated", "success");
      loadLive(selectedSessionId);
    } catch {
      showToast("Failed to update attendance", "error");
    } finally {
      setSavingStudentId(null);
    }
  }

  async function closeSession() {
    if (!selectedSessionId) return;
    setClosing(true);
    try {
      const res = await fetch(`/api/teacher/sessions/${selectedSessionId}`, { method: "PATCH" });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Failed to close session", "error");
        return;
      }
      showToast("Session closed - unmarked students set to absent", "success");
      await loadSessions();
      await loadLive(selectedSessionId);
    } catch {
      showToast("Failed to close session", "error");
    } finally {
      setClosing(false);
    }
  }

  if (loading) {
    return (
      <div>
        <Skeleton className="h-8 w-56 mb-6" />
        <div className="rounded-lg border border-slate-200 bg-white p-5 mb-6">
          <Skeleton className="h-4 w-32 mb-2" />
          <Skeleton className="h-10 w-full max-w-md" />
        </div>
        <TableSkeleton rows={6} columns={4} />
      </div>
    );
  }

  const selected = sessions.find((s) => s.id === selectedSessionId);

  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-900 mb-1">Live Attendance</h1>
      <p className="text-sm text-slate-500 mb-6">
        Watch who has marked attendance for your active class in real time.
      </p>

      {sessions.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-500">
          No sessions yet - start one from the Sessions page first.
        </div>
      ) : (
        <>
          <div className="mb-6 flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[16rem]">
              <label className="block text-sm font-medium text-slate-700 mb-1">Class</label>
              <select
                value={selectedSessionId}
                onChange={(e) => setSelectedSessionId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              >
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.subjectSection.subject.code} - {s.subjectSection.subject.name} ·{" "}
                    {s.subjectSection.section.name} ·{" "}
                    {new Date(s.sessionDate).toLocaleDateString()}
                    {s.isActive ? " (active)" : " (closed)"}
                  </option>
                ))}
              </select>
            </div>
            {selected?.isActive && (
              <button
                onClick={closeSession}
                disabled={closing}
                className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                {closing ? "Closing..." : "Close session"}
              </button>
            )}
          </div>

          {!live ? (
            <TableSkeleton rows={6} columns={4} />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 mb-6 sm:grid-cols-5">
                <StatCard label="Total" value={live.counts.total} tone="slate" />
                <StatCard label="Present" value={live.counts.present} tone="emerald" />
                <StatCard label="Late" value={live.counts.late} tone="amber" />
                <StatCard label="Absent" value={live.counts.absent} tone="red" />
                <StatCard label="Pending" value={live.counts.pending} tone="slate" />
              </div>

              {selected?.isActive && (
                <p className="mb-4 text-xs text-slate-400">
                  Updating automatically every few seconds while this session is active.
                </p>
              )}

              <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                        Roll No.
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                        Student
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                        Marked At
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                        Mark As
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {paginatedRoster.map((row) => (
                      <tr key={row.student.id} className="hover:bg-slate-50">
                        <td className="px-6 py-3 text-sm text-slate-600">
                          {row.student.rollNumber}
                        </td>
                        <td className="px-6 py-3 text-sm text-slate-900">
                          {row.student.user.name}
                        </td>
                        <td className="px-6 py-3 text-sm">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-medium ${statusStyles[row.status]}`}
                          >
                            {row.status === "PENDING" ? "Pending" : row.status}
                          </span>
                          {row.markedVia && (
                            <span className="ml-2 text-xs text-slate-400">
                              via {row.markedVia === "QR" ? "QR scan" : "manual"}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-3 text-sm text-slate-500">
                          {row.markedAt ? new Date(row.markedAt).toLocaleTimeString() : "—"}
                        </td>
                        <td className="px-6 py-3 text-sm">
                          <div className="flex gap-2">
                            {(["PRESENT", "LATE", "ABSENT"] as const).map((status) => (
                              <button
                                key={status}
                                onClick={() => markStatus(row.student.id, status)}
                                disabled={!selected?.isActive || savingStudentId === row.student.id}
                                className={`rounded-md px-2.5 py-1 text-xs font-medium border disabled:opacity-50 ${
                                  row.status === status
                                    ? "border-slate-900 bg-slate-900 text-white"
                                    : "border-slate-200 text-slate-600 hover:border-slate-400"
                                }`}
                              >
                                {status}
                              </button>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {live.roster.length === 0 && (
                  <div className="text-center py-8 text-slate-500">
                    No students enrolled in this class yet
                  </div>
                )}
              </div>
              <Pagination
                page={page}
                totalPages={totalPages}
                pageSize={pageSize}
                total={filteredRoster.length}
                itemLabel="students"
                onPageChange={setPage}
                onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "slate" | "emerald" | "amber" | "red";
}) {
  const toneStyles: Record<typeof tone, string> = {
    slate: "border-slate-200 bg-white text-slate-900",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    red: "border-red-200 bg-red-50 text-red-700",
  };
  return (
    <div className={`rounded-lg border p-4 ${toneStyles[tone]}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs font-medium opacity-80">{label}</div>
    </div>
  );
}
