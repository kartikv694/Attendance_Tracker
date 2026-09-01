"use client";

import { useEffect, useRef, useState } from "react";
import { Pagination } from "@/components/shared/pagination";
import { useToast } from "@/components/shared/toast";
import { QRCountdown } from "@/components/teacher/qr-countdown";
import { WeeklyTimetableGrid } from "@/components/shared/weekly-timetable-grid";
import type { WeeklyTimetableEntry } from "@/components/shared/weekly-timetable-grid";
import { Skeleton, StatCardsSkeleton, CardGridSkeleton, ListRowsSkeleton, TableSkeleton } from "@/components/shared/skeleton";

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
    section: { id: string; name: string; year: number };
    studentsEnrolled: number;
    timetableSlots: Array<{ id: string; dayOfWeek: string; startTime: string; endTime: string }>;
  }>;
};

type ClassStudent = {
  id: string;
  rollNumber: string;
  user: { name: string; email: string };
};


function dayNumber(day: string): number {
  const map: Record<string, number> = { MONDAY: 1, TUESDAY: 2, WEDNESDAY: 3, THURSDAY: 4, FRIDAY: 5 };
  return map[day] ?? 0;
}

function formatClock(value: string) {
  const [h, m] = value.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return value;
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

function formatUpcomingDay(day: string, daysAhead: number) {
  if (daysAhead === 0) return "Today";
  if (daysAhead === 1) return "Tomorrow";
  return day.charAt(0) + day.slice(1).toLowerCase();
}

function getUpcomingLecture(schedule: ScheduleEntry[], now: Date) {
  const weekday = now.getDay();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const candidates = schedule
    .map((entry) => {
      const targetDay = dayNumber(entry.day);
      if (!targetDay) return null;
      const [hours, minutes] = entry.startTime.split(":").map(Number);
      const lectureMinutes = hours * 60 + minutes;
      let daysAhead = targetDay - weekday;
      if (weekday === 0) daysAhead = targetDay + 1;
      else if (weekday === 6) daysAhead = targetDay + 2;
      else if (daysAhead < 0 || (daysAhead === 0 && lectureMinutes <= currentMinutes)) daysAhead += 7;
      return { entry, daysAhead, lectureMinutes };
    })
    .filter((item): item is { entry: ScheduleEntry; daysAhead: number; lectureMinutes: number } => Boolean(item))
    .sort((a, b) => a.daysAhead - b.daysAhead || a.lectureMinutes - b.lectureMinutes);

  return candidates[0] ?? null;
}

export default function TeacherDashboard() {
  const { showToast } = useToast();

  const [sessions, setSessions] = useState<Session[]>([]);
  const [scheduleData, setScheduleData] = useState<ScheduleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [classPage, setClassPage] = useState(1);
  const [tablePageSize, setTablePageSize] = useState(8);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [showLectureAssignments, setShowLectureAssignments] = useState(false);
  const [selectedClassSection, setSelectedClassSection] = useState<{ id: string; name: string; year: number } | null>(null);
  const [classTimetable, setClassTimetable] = useState<WeeklyTimetableEntry[]>([]);
  const [classTimetableLoading, setClassTimetableLoading] = useState(false);
  const [qrLoading, setQrLoading] = useState(false);
  const [refreshingDashboard, setRefreshingDashboard] = useState(false);
  const [now, setNow] = useState(() => new Date());
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

  async function openClassTimetable(section: { id: string; name: string; year: number }) {
    setSelectedClassSection(section);
    setClassTimetableLoading(true);
    try {
      const res = await fetch(`/api/admin/timetable?sectionId=${encodeURIComponent(section.id)}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load class timetable");

      setClassTimetable(
        (data.data || []).map((slot: {
          id: string;
          dayOfWeek: string;
          startTime: string;
          endTime: string;
          subjectSection: {
            subject: { code: string; name: string };
            section: { name: string; year: number };
            teacher: { user: { name: string } };
          };
        }) => ({
          id: slot.id,
          day: slot.dayOfWeek,
          startTime: slot.startTime,
          endTime: slot.endTime,
          subject: slot.subjectSection.subject,
          section: slot.subjectSection.section,
          teacher: slot.subjectSection.teacher.user.name,
        }))
      );
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Failed to load class timetable", "error");
      setSelectedClassSection(null);
    } finally {
      setClassTimetableLoading(false);
    }
  }

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
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  async function handleRefreshDashboard() {
    setRefreshingDashboard(true);
    await loadDashboard();
    setRefreshingDashboard(false);
  }

  // Keeps each active session's QR fresh so "Show QR" always displays a
  // code that's still valid, without polling the server on a timer. Each
  // active session schedules exactly one refresh for the moment its
  // current QR expires - updating `sessions` re-triggers this effect with
  // the new expiresAt, which is what makes the cycle repeat.
  useEffect(() => {
    const activeOnes = sessions.filter((s) => s.isActive);
    if (activeOnes.length === 0) return;

    const timeouts = activeOnes.map((session) => {
      const delay = Math.max(new Date(session.expiresAt).getTime() - Date.now(), 0);

      return setTimeout(async () => {
        if (refreshingIdsRef.current.has(session.id)) return;
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
          // A stale QR here just means the teacher needs to reopen "Show
          // QR" to get a fresh one - not worth surfacing an error for.
        } finally {
          refreshingIdsRef.current.delete(session.id);
        }
      }, delay);
    });

    return () => timeouts.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  if (loading) {
    return (
      <div>
        <Skeleton className="h-8 w-52 mb-6" />
        <StatCardsSkeleton count={4} columnsClassName="grid-cols-2 md:grid-cols-3 lg:grid-cols-4" />
        <div className="rounded-lg border border-slate-200 bg-white p-6 mb-6">
          <Skeleton className="h-6 w-48 mb-4" />
          <CardGridSkeleton count={2} columnsClassName="md:grid-cols-2" />
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <Skeleton className="h-6 w-40 mb-4" />
          <ListRowsSkeleton count={2} />
        </div>
      </div>
    );
  }

  const activeSessions = sessions.filter((s) => s.isActive);
  const expiredSessions = sessions.filter((s) => !s.isActive);

  const paginatedClassStudents = classStudents.slice(
    (classPage - 1) * tablePageSize,
    classPage * tablePageSize
  );
  const classTotalPages = Math.max(1, Math.ceil(classStudents.length / tablePageSize));
  const assignments = scheduleData?.assignments || [];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-900">Teacher Dashboard</h1>
        <button
          onClick={handleRefreshDashboard}
          disabled={refreshingDashboard}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {refreshingDashboard ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
        {(() => {
          const upcoming = getUpcomingLecture(scheduleData?.schedule ?? [], now);
          return (
            <div className="rounded-lg border border-slate-200 bg-white p-5">
              <div className="text-sm font-semibold text-slate-600">Upcoming Lecture</div>
              {upcoming ? (
                <>
                  <div className="mt-2 truncate text-lg font-bold text-indigo-600">{upcoming.entry.subject.code}</div>
                  <div className="mt-1 truncate text-sm font-semibold text-slate-900">{upcoming.entry.subject.name}</div>
                  <div className="mt-2 text-xs text-slate-500">
                    {upcoming.entry.section.name} ({upcoming.entry.section.year})
                  </div>
                  <div className="mt-1 text-xs font-medium text-indigo-600">
                    {formatUpcomingDay(upcoming.entry.day, upcoming.daysAhead)} • {formatClock(upcoming.entry.startTime)} - {formatClock(upcoming.entry.endTime)}
                  </div>
                </>
              ) : (
                <div className="mt-3 text-sm text-slate-500">No upcoming lectures scheduled.</div>
              )}
            </div>
          );
        })()}

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
            {assignments.map((assignment) => (
              <button
                key={assignment.subjectSectionId}
                type="button"
                onClick={() => {
                  setShowLectureAssignments(true);
                  openClassTimetable({
                    id: assignment.section.id,
                    name: assignment.section.name,
                    year: assignment.section.year,
                  });
                }}
                className="rounded-lg border border-slate-200 p-4 text-left transition hover:border-indigo-300 hover:bg-indigo-50/40 hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="font-semibold text-slate-900">
                    {assignment.subject.code} - {assignment.subject.name}
                  </div>
                  <span className="text-indigo-600">→</span>
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
                <div className="mt-2 text-xs font-medium text-indigo-600">View class weekly timetable</div>
              </button>
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

      {showLectureAssignments && !selectedClassSection && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowLectureAssignments(false)}
        >
          <div
            className="w-full max-w-3xl rounded-xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-1 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Lectures Assigned</h3>
              <button
                onClick={() => setShowLectureAssignments(false)}
                aria-label="Close"
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
            <p className="mb-5 text-sm text-slate-500">
              Select a class to open its complete weekly timetable. Every lecture will appear in its exact day and time slot.
            </p>

            {assignments.length === 0 ? (
              <div className="rounded-lg bg-slate-50 p-6 text-center text-sm text-slate-500">
                No lectures have been assigned to you yet.
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {Array.from(
                  new Map(
                    assignments.map((assignment) => [
                      assignment.section.id,
                      {
                        section: assignment.section,
                        subjects: assignments.filter((item) => item.section.id === assignment.section.id),
                      },
                    ])
                  ).values()
                ).map(({ section, subjects }) => {
                  const scheduledCount = subjects.reduce((total, item) => total + item.timetableSlots.length, 0);
                  return (
                    <button
                      key={section.id}
                      onClick={() => openClassTimetable(section)}
                      className="rounded-xl border border-slate-200 bg-white p-5 text-left transition hover:border-indigo-300 hover:bg-indigo-50/40 hover:shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-base font-semibold text-slate-900">
                            {section.name} ({section.year})
                          </div>
                          <div className="mt-1 text-sm text-slate-500">
                            {subjects.length} assigned subject{subjects.length === 1 ? "" : "s"}
                          </div>
                        </div>
                        <span className="text-indigo-600">→</span>
                      </div>
                      <div className="mt-4 text-xs text-slate-500">
                        {scheduledCount} scheduled lecture{scheduledCount === 1 ? "" : "s"}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {showLectureAssignments && selectedClassSection && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setSelectedClassSection(null)}
        >
          <div
            className="w-full max-w-6xl rounded-xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-1 flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedClassSection(null)}
                    className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                  >
                    ← Classes
                  </button>
                  <h3 className="text-lg font-semibold text-slate-900">
                    {selectedClassSection.name} ({selectedClassSection.year}) Timetable
                  </h3>
                </div>
                <p className="mt-2 text-sm text-slate-500">
                  Time is the row and Monday-Friday are columns. Lectures are placed directly in their scheduled slot.
                </p>
              </div>
              <button
                onClick={() => { setSelectedClassSection(null); setShowLectureAssignments(false); }}
                aria-label="Close"
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="mt-5">
              {classTimetableLoading ? (
                <div className="py-12 text-center text-sm text-slate-500">Loading class timetable...</div>
              ) : (
                <WeeklyTimetableGrid
                  entries={classTimetable}
                  emptyMessage="No timetable has been scheduled for this class yet."
                />
              )}
            </div>
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
              <TableSkeleton rows={4} columns={3} />
            ) : classStudents.length === 0 ? (
              <div className="text-center py-8 text-slate-500">No students in this class yet</div>
            ) : (
              <>
              <table className="w-full">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-slate-900">Roll No.</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-slate-900">Name</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-slate-900">Email</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {paginatedClassStudents.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2 text-sm text-slate-600">{s.rollNumber}</td>
                      <td className="px-4 py-2 text-sm text-slate-900">{s.user.name}</td>
                      <td className="px-4 py-2 text-sm text-slate-600">{s.user.email}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Pagination
                page={classPage}
                totalPages={classTotalPages}
                total={classStudents.length}
                pageSize={tablePageSize}
                itemLabel="students"
                onPageChange={setClassPage}
                onPageSizeChange={(size) => { setTablePageSize(size); setClassPage(1); }}
              />
              </>
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
