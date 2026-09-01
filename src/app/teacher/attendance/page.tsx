"use client";

// Manual attendance marking - a teacher picks one of their sessions, sees
// every enrolled student for that class, and marks/updates each one.
// The roster comes from /reports/summary (it already returns every
// enrolled student for a subject-section); current status per student
// comes from the session's own records. A student with no record yet
// gets POSTed as new, one that already has a record gets PATCHed
// (which is also what writes the audit log entry).

import { useEffect, useState } from "react";
import { Pagination } from "@/components/shared/pagination";
import { useSearch, matchesSearch } from "@/components/shared/search-context";
import { useToast } from "@/components/shared/toast";
import { Skeleton, TableSkeleton } from "@/components/shared/skeleton";
import { matchesSessionFilters } from "@/components/teacher/session-filter-bar";

type SessionOption = {
  id: string;
  sessionDate: string;
  subjectSectionId: string;
  isActive: boolean;
  subjectSection: {
    subject: { name: string; code: string };
    section: { name: string; year: number };
  };
};

type RosterStudent = {
  student: { id: string; rollNumber: string; user: { name: string } };
};

type ExistingRecord = {
  id: string;
  status: "PRESENT" | "ABSENT" | "LATE";
  student: { id: string };
};

export default function TeacherAttendancePage() {
  const { showToast } = useToast();
  const { query } = useSearch();
  const [sessions, setSessions] = useState<SessionOption[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [roster, setRoster] = useState<RosterStudent[]>([]);
  const [records, setRecords] = useState<ExistingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);

  useEffect(() => { setPage(1); }, [selectedSessionId, query]);
  const [savingStudentId, setSavingStudentId] = useState<string | null>(null);
  const [sessionDay, setSessionDay] = useState("");
  const [sessionDateFilter, setSessionDateFilter] = useState("");
  const [sessionTime, setSessionTime] = useState("");

  useEffect(() => {
    async function loadSessions() {
      try {
        const res = await fetch("/api/teacher/sessions");
        const data = await res.json();
        setSessions(data.data || []);
        if (data.data?.length > 0) setSelectedSessionId(data.data[0].id);
      } catch (err) {
        console.error("Failed to load sessions:", err);
      } finally {
        setLoading(false);
      }
    }
    loadSessions();
  }, []);

  useEffect(() => {
    if (!selectedSessionId) return;
    loadRosterAndRecords(selectedSessionId);
  }, [selectedSessionId]);

  async function loadRosterAndRecords(sessionId: string) {
    setRosterLoading(true);
    try {
      const session = sessions.find((s) => s.id === sessionId);
      const sessionDetailRes = await fetch(`/api/teacher/sessions/${sessionId}`);
      const sessionDetail = await sessionDetailRes.json();
      setRecords(sessionDetail.records || []);

      const subjectSectionId = session?.subjectSectionId || sessionDetail.subjectSectionId;
      if (subjectSectionId) {
        const summaryRes = await fetch(
          `/api/teacher/reports/summary?subjectSectionId=${subjectSectionId}`
        );
        const summaryData = await summaryRes.json();
        setRoster(
          (summaryData.students || []).map(
            (s: { student: { id: string; rollNumber: string; user: { name: string } } }) => ({
              student: s.student,
            })
          )
        );
      }
    } catch (err) {
      console.error("Failed to load roster:", err);
    } finally {
      setRosterLoading(false);
    }
  }

  async function markStatus(studentId: string, status: "PRESENT" | "ABSENT" | "LATE") {
    const selectedSession = sessions.find((s) => s.id === selectedSessionId);
    if (!selectedSession?.isActive) {
      showToast("Attendance can only be updated while the session is active", "error");
      return;
    }
    setSavingStudentId(studentId);
    const existing = records.find((r) => r.student.id === studentId);

    try {
      let res: Response;
      if (existing) {
        res = await fetch(`/api/teacher/attendance/${existing.id}`, {
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
      loadRosterAndRecords(selectedSessionId);
    } catch {
      showToast("Failed to update attendance", "error");
    } finally {
      setSavingStudentId(null);
    }
  }

  if (loading) {
    return (
      <div>
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="rounded-lg border border-slate-200 bg-white p-5 mb-6">
          <Skeleton className="h-4 w-32 mb-2" />
          <Skeleton className="h-10 w-full max-w-md" />
        </div>
        <TableSkeleton rows={6} columns={3} />
      </div>
    );
  }

  const filteredRoster = roster.filter(({ student }) =>
    matchesSearch(query, student.user.name, student.rollNumber)
  );
  const filteredSessions = sessions.filter((s) =>
    matchesSessionFilters(s, "", sessionDay, sessionDateFilter, sessionTime)
  );
  const timeOptions = Array.from(
    new Set(
      sessions.map((s) => {
        const d = new Date(s.sessionDate);
        return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
      })
    )
  ).sort();
  const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const paginatedRoster = filteredRoster.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.max(1, Math.ceil(filteredRoster.length / pageSize));

  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-900 mb-6">Attendance</h1>

      {sessions.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-500">
          No sessions yet - start one from the Sessions page first.
        </div>
      ) : (
        <>
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="w-full sm:w-36">
              <label className="mb-1 block text-sm font-medium text-slate-700">Day</label>
              <select
                value={sessionDay}
                onChange={(e) => { setSessionDay(e.target.value); setSelectedSessionId(""); }}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              >
                <option value="">Select...</option>
                {DAY_NAMES.map((name, index) => (
                  <option key={name} value={String(index)}>{name}</option>
                ))}
              </select>
            </div>
            <div className="w-full sm:w-40">
              <label className="mb-1 block text-sm font-medium text-slate-700">Date</label>
              <input
                type="date"
                value={sessionDateFilter}
                onChange={(e) => { setSessionDateFilter(e.target.value); setSelectedSessionId(""); }}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              />
            </div>
            <div className="w-full sm:w-32">
              <label className="mb-1 block text-sm font-medium text-slate-700">Time</label>
              <select
                value={sessionTime}
                onChange={(e) => { setSessionTime(e.target.value); setSelectedSessionId(""); }}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              >
                <option value="">Select...</option>
                {timeOptions.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div className="w-full sm:min-w-[16rem] sm:flex-1">
              <label className="mb-1 block text-sm font-medium text-slate-700">Select session</label>
              <select
                value={selectedSessionId}
                onChange={(e) => setSelectedSessionId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              >
                <option value="">Select...</option>
                {filteredSessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.subjectSection.subject.code} - {s.subjectSection.subject.name} · {s.subjectSection.section.name} ({s.subjectSection.section.year}) · {new Date(s.sessionDate).toLocaleString()}
                  </option>
                ))}
              </select>
            </div>

            {(sessionDay || sessionDateFilter || sessionTime) && (
              <button
                type="button"
                onClick={() => {
                  setSessionDay("");
                  setSessionDateFilter("");
                  setSessionTime("");
                  setSelectedSessionId("");
                }}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Clear
              </button>
            )}
          </div>
          {filteredSessions.length === 0 && (
            <p className="-mt-4 mb-6 text-xs text-slate-400">No sessions match these filters.</p>
          )}

          {rosterLoading ? (
            <div>Loading roster...</div>
          ) : (
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
                      Current Status
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                      Mark As
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {paginatedRoster.map(({ student }) => {
                    const existing = records.find((r) => r.student.id === student.id);
                    return (
                      <tr key={student.id} className="hover:bg-slate-50">
                        <td className="px-6 py-3 text-sm text-slate-600">{student.rollNumber}</td>
                        <td className="px-6 py-3 text-sm text-slate-900">{student.user.name}</td>
                        <td className="px-6 py-3 text-sm">
                          {existing ? (
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-medium ${
                                existing.status === "PRESENT"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : existing.status === "LATE"
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {existing.status}
                            </span>
                          ) : (
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
                              Not marked
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-3 text-sm">
                          <div className="flex gap-2">
                            {(["PRESENT", "LATE", "ABSENT"] as const).map((status) => (
                              <button
                                key={status}
                                onClick={() => markStatus(student.id, status)}
                                disabled={!sessions.find((s) => s.id === selectedSessionId)?.isActive || savingStudentId === student.id}
                                className={`rounded-md px-2.5 py-1 text-xs font-medium border disabled:opacity-50 ${
                                  existing?.status === status
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
                    );
                  })}
                </tbody>
              </table>

              {roster.length === 0 && (
                <div className="text-center py-8 text-slate-500">
                  No students enrolled in this class yet
                </div>
              )}
            </div>
          )}
        </>
      )}
      <Pagination
        page={page}
        totalPages={totalPages}
        total={filteredRoster.length}
        pageSize={pageSize}
        itemLabel="students"
        onPageChange={setPage}
        onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
      />

    </div>
  );
}
