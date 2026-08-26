"use client";

import { useEffect, useRef, useState } from "react";
import { useToast } from "@/components/shared/toast";
import { useSearch, matchesSearch } from "@/components/shared/search-context";
import { QRCountdown } from "@/components/teacher/qr-countdown";

type Session = {
  id: string;
  qrToken: string;
  qrCodeDataUrl: string;
  expiresAt: string;
  isActive: boolean;
  subjectSection: {
    subject: { name: string; code: string };
    section: { name: string; year: number };
  };
  _count: { records: number };
};

type ScheduleEntry = {
  id: string;
  subjectSectionId: string;
  subject: { name: string; code: string };
  section: { name: string; year: number };
  day: string;
  startTime: string;
  endTime: string;
  studentsEnrolled: number;
};

type ScheduleData = {
  totalStudents: number;
  totalLectures: number;
  scheduledLectures?: number;
  classSection: { id: string; name: string; year: number } | null;
  schedule: ScheduleEntry[];
  assignments: Array<{
    subjectSectionId: string;
    subject: { name: string; code: string };
    section: { name: string; year: number };
    studentsEnrolled: number;
    timetableSlots: Array<{ id: string; dayOfWeek: string; startTime: string; endTime: string }>;
  }>;
};

type ClassStudent = {
  id: string;
  rollNumber: string;
  user: { name: string; email: string };
};

const DAY_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export default function TeacherDashboard() {
  const { showToast } = useToast();
  const { query } = useSearch();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [scheduleData, setScheduleData] = useState<ScheduleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [showSchedule, setShowSchedule] = useState(false);
  const [qrLoading, setQrLoading] = useState(false);
  const refreshingIdsRef = useRef<Set<string>>(new Set());

  // "Class Assigned" KPI -> roster of the section this teacher is
  // class-teacher of, with an add-student form (class-teacher only)
  const [showClassRoster, setShowClassRoster] = useState(false);
  const [classStudents, setClassStudents] = useState<ClassStudent[]>([]);
  const [classRosterLoading, setClassRosterLoading] = useState(false);
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [addingStudent, setAddingStudent] = useState(false);
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentEmail, setNewStudentEmail] = useState("");
  const [newStudentPassword, setNewStudentPassword] = useState("");
  const [newStudentRoll, setNewStudentRoll] = useState("");

  async function loadDashboard() {
    try {
      const [sessionsRes, scheduleRes] = await Promise.all([
        fetch("/api/teacher/sessions", { cache: "no-store" }),
        fetch("/api/teacher/schedule", { cache: "no-store" }),
      ]);
      const sessionsData = await sessionsRes.json();
      setSessions(sessionsData.data || []);
      if (scheduleRes.ok) {
        setScheduleData(await scheduleRes.json());
      }
    } catch {
      showToast("Failed to load dashboard", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
    const interval = setInterval(loadDashboard, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep active dashboard QRs rotating even if the teacher stays on this page.
  // A short interval is more reliable than a one-shot timeout because the
  // dashboard itself also polls for updated attendance counts.
  useEffect(() => {
    const interval = setInterval(async () => {
      const dueSessions = sessions.filter(
        (session) =>
          session.isActive &&
          new Date(session.expiresAt).getTime() <= Date.now() &&
          !refreshingIdsRef.current.has(session.id)
      );

      await Promise.all(
        dueSessions.map(async (session) => {
          refreshingIdsRef.current.add(session.id);
          try {
            const res = await fetch(`/api/teacher/sessions/${session.id}/refresh`, {
              method: "POST",
            });
            const data = await res.json();
            if (!res.ok) return;

            setSessions((current) =>
              current.map((item) => (item.id === session.id ? { ...item, ...data } : item))
            );
            setSelectedSession((current) =>
              current && current.id === session.id ? { ...current, ...data } : current
            );
          } catch {
            // The dashboard polling loop will keep the UI in sync and retry.
          } finally {
            refreshingIdsRef.current.delete(session.id);
          }
        })
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [sessions]);

  async function showQr(id: string) {
    setQrLoading(true);
    try {
      const res = await fetch(`/api/teacher/sessions/${id}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load QR code");
      setSelectedSession(data);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Failed to load QR code", "error");
    } finally {
      setQrLoading(false);
    }
  }

  async function openClassRoster() {
    setShowClassRoster(true);
    setClassRosterLoading(true);
    try {
      const res = await fetch("/api/teacher/class/students");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load class roster");
      setClassStudents(data.data || []);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to load class roster", "error");
    } finally {
      setClassRosterLoading(false);
    }
  }

  async function handleAddStudent(e: React.FormEvent) {
    e.preventDefault();
    setAddingStudent(true);
    try {
      const res = await fetch("/api/teacher/class/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newStudentName,
          email: newStudentEmail,
          password: newStudentPassword,
          rollNumber: newStudentRoll,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Failed to add student", "error");
        return;
      }
      showToast("Student added to your class", "success");
      setShowAddStudent(false);
      setNewStudentName("");
      setNewStudentEmail("");
      setNewStudentPassword("");
      setNewStudentRoll("");
      openClassRoster();
    } catch {
      showToast("Failed to add student", "error");
    } finally {
      setAddingStudent(false);
    }
  }

  if (loading) return <div>Loading...</div>;

  const activeSessions = sessions.filter((s) => s.isActive);
  const expiredSessions = sessions.filter((s) => !s.isActive);

  const sortedSchedule = [...(scheduleData?.schedule || [])].sort((a, b) => {
    const dayDiff = DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day);
    if (dayDiff !== 0) return dayDiff;
    return a.startTime.localeCompare(b.startTime);
  });

  const filteredSchedule = sortedSchedule.filter((entry) =>
    matchesSearch(query, entry.subject.name, entry.subject.code, entry.section.name, entry.day)
  );

  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-900 mb-6">Teacher Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <button
          onClick={() => setShowSchedule(true)}
          className="rounded-lg border border-slate-200 bg-white p-6 text-left hover:border-slate-400 hover:shadow-sm transition"
        >
          <div className="text-3xl font-bold text-indigo-600">{scheduleData?.totalLectures ?? 0}</div>
          <div className="text-sm text-slate-600 mt-1">Lectures Assigned</div>
          <div className="text-xs text-indigo-500 mt-1">{scheduleData?.scheduledLectures ?? 0} scheduled • Click to view timetable →</div>
        </button>

        {scheduleData?.classSection ? (
          <button
            onClick={openClassRoster}
            className="rounded-lg border border-slate-200 bg-white p-6 text-left hover:border-slate-400 hover:shadow-sm transition"
          >
            <div className="text-3xl font-bold text-amber-600">{scheduleData.classSection.name}</div>
            <div className="text-sm text-slate-600 mt-1">Class Assigned</div>
            <div className="text-xs text-amber-500 mt-1">Click to view students →</div>
          </button>
        ) : (
          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <div className="text-3xl font-bold text-amber-600">—</div>
            <div className="text-sm text-slate-600 mt-1">Class Assigned</div>
            <div className="text-xs text-slate-400 mt-1">Not a class-teacher yet</div>
          </div>
        )}

        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <div className="text-3xl font-bold text-emerald-600">{activeSessions.length}</div>
          <div className="text-sm text-slate-600 mt-1">Active Sessions</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <div className="text-3xl font-bold text-slate-600">{expiredSessions.length}</div>
          <div className="text-sm text-slate-600 mt-1">Completed Sessions</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <div className="text-3xl font-bold text-blue-600">
            {sessions.reduce((sum, s) => sum + s._count.records, 0)}
          </div>
          <div className="text-sm text-slate-600 mt-1">Total Marks Recorded</div>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">My Assigned Classes</h2>
            <p className="text-sm text-slate-500 mt-1">Subjects and classes currently assigned to you.</p>
          </div>
          <span className="text-sm font-medium text-indigo-600">{scheduleData?.assignments?.length ?? 0} assigned</span>
        </div>

        {!scheduleData?.assignments?.length ? (
          <div className="rounded-lg bg-slate-50 p-5 text-sm text-slate-500">
            No classes have been assigned to you yet.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {scheduleData.assignments.map((assignment) => (
              <div key={assignment.subjectSectionId} className="rounded-lg border border-slate-200 p-4">
                <div className="font-semibold text-slate-900">
                  {assignment.subject.code} - {assignment.subject.name}
                </div>
                <div className="text-sm text-slate-600 mt-1">
                  Class: {assignment.section.name} ({assignment.section.year})
                </div>
                <div className="text-xs text-slate-500 mt-2">
                  {assignment.studentsEnrolled} student(s) enrolled
                  {assignment.timetableSlots.length > 0
                    ? ` • ${assignment.timetableSlots.length} timetable slot(s)`
                    : " • No timetable slot yet"}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6 mb-6">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">Active Sessions</h2>

        {activeSessions.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <p>No active sessions. Create one from the Sessions page.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activeSessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 p-4"
              >
                <div>
                  <div className="font-semibold text-slate-900">
                    {session.subjectSection.subject.code} -{" "}
                    {session.subjectSection.subject.name}
                  </div>
                  <div className="text-sm text-slate-600">
                    {session.subjectSection.section.name} ({session.subjectSection.section.year})
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {session._count.records} student(s) marked
                  </div>
                </div>
                <button
                  onClick={() => showQr(session.id)}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                >
                  {qrLoading && selectedSession?.id === session.id ? "Loading..." : "Show QR"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedSession && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-4">
          <div className="rounded-lg bg-white p-8 max-w-md w-full">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">QR Code</h3>
            <QRCountdown expiresAt={selectedSession.expiresAt} />
            <div className="aspect-square bg-white rounded-lg flex items-center justify-center mb-4 border border-slate-200 overflow-hidden p-3">
              {selectedSession.qrCodeDataUrl ? (
                <img
                  src={selectedSession.qrCodeDataUrl}
                  alt="QR Code"
                  className="h-full w-full object-contain"
                />
              ) : (
                <span className="text-sm text-slate-500">Loading QR code...</span>
              )}
            </div>
            <p className="text-sm text-slate-600 mb-4">
              {selectedSession.subjectSection.subject.code} -{" "}
              {selectedSession.subjectSection.subject.name}
            </p>
            <button
              onClick={() => setSelectedSession(null)}
              className="w-full rounded-lg bg-slate-900 px-4 py-2 text-white font-medium hover:bg-slate-800"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {showSchedule && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-4"
          onClick={() => setShowSchedule(false)}
        >
          <div
            className="w-full max-w-3xl rounded-lg bg-white p-6 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-lg font-semibold text-slate-900">Weekly Timetable</h3>
              <button
                onClick={() => setShowSchedule(false)}
                aria-label="Close"
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Your assigned lecture timetable. Each row shows the day, exact time, subject, and class section.
            </p>

            {filteredSchedule.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                {sortedSchedule.length === 0
                  ? "Your assigned classes are not scheduled in the timetable yet"
                  : "No lectures match your search"}
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-slate-900">Day</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-slate-900">Time</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-slate-900">Subject</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-slate-900">Section</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-slate-900">Students</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredSchedule.map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2 text-sm text-slate-900">{entry.day}</td>
                      <td className="px-4 py-2 text-sm text-slate-600">
                        {entry.startTime} - {entry.endTime}
                      </td>
                      <td className="px-4 py-2 text-sm text-slate-600">
                        {entry.subject.code} - {entry.subject.name}
                      </td>
                      <td className="px-4 py-2 text-sm text-slate-600">
                        {entry.section.name} ({entry.section.year})
                      </td>
                      <td className="px-4 py-2 text-sm text-slate-600">{entry.studentsEnrolled}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {showClassRoster && scheduleData?.classSection && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-4"
          onClick={() => setShowClassRoster(false)}
        >
          <div
            className="w-full max-w-2xl rounded-lg bg-white p-6 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-lg font-semibold text-slate-900">
                {scheduleData.classSection.name} ({scheduleData.classSection.year}) - Students
              </h3>
              <button
                onClick={() => setShowClassRoster(false)}
                aria-label="Close"
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              As the class-teacher of this section, you can add students directly here.
            </p>

            <button
              onClick={() => setShowAddStudent(true)}
              className="mb-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              + Add Student
            </button>

            {classRosterLoading ? (
              <div className="text-sm text-slate-500">Loading...</div>
            ) : classStudents.length === 0 ? (
              <div className="text-center py-8 text-slate-500">No students in this class yet</div>
            ) : (
              <table className="w-full">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-slate-900">Roll No.</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-slate-900">Name</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-slate-900">Email</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {classStudents.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2 text-sm text-slate-600">{s.rollNumber}</td>
                      <td className="px-4 py-2 text-sm text-slate-900">{s.user.name}</td>
                      <td className="px-4 py-2 text-sm text-slate-600">{s.user.email}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {showAddStudent && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Add Student to Your Class</h3>
            <form onSubmit={handleAddStudent} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Name</label>
                <input
                  type="text"
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Email</label>
                <input
                  type="email"
                  value={newStudentEmail}
                  onChange={(e) => setNewStudentEmail(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Temporary password</label>
                <input
                  type="text"
                  value={newStudentPassword}
                  onChange={(e) => setNewStudentPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                  required
                  minLength={6}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Roll number</label>
                <input
                  type="text"
                  value={newStudentRoll}
                  onChange={(e) => setNewStudentRoll(e.target.value)}
                  placeholder="e.g. 21CS045"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                  required
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddStudent(false)}
                  className="flex-1 rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingStudent}
                  className="flex-1 rounded-lg bg-slate-900 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {addingStudent ? "Adding..." : "Add Student"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
