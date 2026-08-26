"use client";

// Manual attendance marking - a teacher picks one of their sessions, sees
// every enrolled student for that class, and marks/updates each one.
// The roster comes from /reports/summary (it already returns every
// enrolled student for a subject-section); current status per student
// comes from the session's own records. A student with no record yet
// gets POSTed as new, one that already has a record gets PATCHed
// (which is also what writes the audit log entry).

import { useEffect, useState } from "react";
import { useToast } from "@/components/shared/toast";

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
  student: { id: string; user: { name: string } };
};

type ExistingRecord = {
  id: string;
  status: "PRESENT" | "ABSENT" | "LATE";
  student: { id: string };
};

export default function TeacherAttendancePage() {
  const { showToast } = useToast();
  const [sessions, setSessions] = useState<SessionOption[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [roster, setRoster] = useState<RosterStudent[]>([]);
  const [records, setRecords] = useState<ExistingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [savingStudentId, setSavingStudentId] = useState<string | null>(null);

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
          (summaryData.students || []).map((s: { student: { id: string; user: { name: string } } }) => ({
            student: s.student,
          }))
        );
      }
    } catch (err) {
      console.error("Failed to load roster:", err);
    } finally {
      setRosterLoading(false);
    }
  }

  async function markStatus(studentId: string, status: "PRESENT" | "ABSENT" | "LATE") {
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

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-900 mb-6">Attendance</h1>

      {sessions.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-500">
          No sessions yet - start one from the Sessions page first.
        </div>
      ) : (
        <>
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-1">Session</label>
            <select
              value={selectedSessionId}
              onChange={(e) => setSelectedSessionId(e.target.value)}
              className="w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            >
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.subjectSection.subject.code} - {s.subjectSection.subject.name} ·{" "}
                  {s.subjectSection.section.name} · {new Date(s.sessionDate).toLocaleDateString()}
                  {s.isActive ? " (active)" : ""}
                </option>
              ))}
            </select>
          </div>

          {rosterLoading ? (
            <div>Loading roster...</div>
          ) : (
            <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-50 border-b">
                  <tr>
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
                  {roster.map(({ student }) => {
                    const existing = records.find((r) => r.student.id === student.id);
                    return (
                      <tr key={student.id} className="hover:bg-slate-50">
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
                                disabled={savingStudentId === student.id}
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
    </div>
  );
}
