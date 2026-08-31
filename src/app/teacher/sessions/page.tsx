"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/shared/toast";
import { useSearch, matchesSearch } from "@/components/shared/search-context";
import { Pagination } from "@/components/shared/pagination";
import { QRCountdown } from "@/components/teacher/qr-countdown";
import { Skeleton, FormFieldsSkeleton, TableSkeleton } from "@/components/shared/skeleton";

type TimetableSlot = { id: string; dayOfWeek: string; startTime: string; endTime: string };

type Assignment = {
  subjectSectionId: string;
  subject: { name: string; code: string };
  section: { name: string; year: number };
  timetableSlots: TimetableSlot[];
};

type Session = {
  id: string;
  qrToken: string;
  qrCodeDataUrl?: string;
  qrIssuedAt: string;
  sessionDate: string;
  expiresAt: string;
  isActive: boolean;
  subjectSection: {
    subject: { name: string; code: string };
    section: { name: string; year: number };
  };
  _count: { records: number };
};

type SessionDetail = Session & {
  records: {
    id: string;
    status: string;
    markedVia: string;
    markedAt: string;
    student: { rollNumber: string; user: { name: string } };
  }[];
};

const TODAY_DAY_NAMES = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];

function todayDateInputValue() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

export default function TeacherSessionsPage() {
  const { showToast } = useToast();
  const { query } = useSearch();

  useEffect(() => { setPage(1); setDetailPage(1); }, [query]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const [detailPage, setDetailPage] = useState(1);

  // start-session form
  const [subjectSectionId, setSubjectSectionId] = useState("");
  const [date, setDate] = useState(todayDateInputValue());
  const [time, setTime] = useState("");
  const [creating, setCreating] = useState(false);

  const [qrSession, setQrSession] = useState<Session | null>(null);
  const [viewingSession, setViewingSession] = useState<SessionDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  async function loadAll() {
    try {
      const [scheduleRes, sessionsRes] = await Promise.all([
        fetch("/api/teacher/schedule"),
        fetch("/api/teacher/sessions"),
      ]);
      const scheduleData = await scheduleRes.json();
      const sessionsData = await sessionsRes.json();
      setAssignments(scheduleData.assignments || []);
      setSessions(sessionsData.data || []);
    } catch {
      showToast("Failed to load sessions", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keeps every currently-active session's QR fresh in the background,
  // regardless of whether its modal happens to be open right now. This
  // means "Show QR" always displays a code that's actually still valid,
  // and a modal left open on screen keeps ticking over on its own -
  // exactly the "auto-refresh until the teacher ends the session"
  // behavior, not just "while this modal is visible".
  //
  // Each active session schedules its own refresh for exactly when its
  // current QR expires. On success we update both `sessions` (so the
  // list stays current) and `qrSession` (so a currently-open modal
  // updates immediately without needing to be reopened) - updating
  // `sessions` is what re-triggers this effect with the new expiresAt,
  // which is what makes the cycle repeat indefinitely.
  useEffect(() => {
    const activeOnes = sessions.filter((s) => s.isActive);
    if (activeOnes.length === 0) return;

    const timeouts = activeOnes.map((s) => {
      const delay = Math.max(new Date(s.expiresAt).getTime() - Date.now(), 0);

      return setTimeout(async () => {
        try {
          const res = await fetch(`/api/teacher/sessions/${s.id}/refresh`, { method: "POST" });
          const data = await res.json();

          if (!res.ok) {
            // 409 means the session was closed elsewhere in the meantime -
            // expected, not worth alarming the teacher about
            if (res.status !== 409) showToast(data.error || "Failed to refresh QR code", "error");
            return;
          }

          setSessions((current) => current.map((cs) => (cs.id === s.id ? { ...cs, ...data } : cs)));
          setQrSession((current) =>
            current && current.id === s.id ? { ...current, ...data } : current
          );
        } catch {
          showToast("Lost connection while refreshing the QR code", "error");
        }
      }, delay);
    });

    return () => timeouts.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessions]);

  const selectedAssignment = assignments.find((a) => a.subjectSectionId === subjectSectionId);

  // when a subject-section with a scheduled slot for today is picked,
  // default the time field to that slot's start time - saves a teacher
  // starting their 9am lecture from having to type "09:00" by hand
  useEffect(() => {
    if (!selectedAssignment) {
      setTime("");
      return;
    }
    const todayName = TODAY_DAY_NAMES[new Date(date + "T00:00:00").getDay()];
    const todaysSlot = selectedAssignment.timetableSlots.find((s) => s.dayOfWeek === todayName);
    setTime(todaysSlot ? todaysSlot.startTime : "");
  }, [subjectSectionId, date]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleCreateSession(e: React.FormEvent) {
    e.preventDefault();
    if (!subjectSectionId) return;
    setCreating(true);
    try {
      const sessionDate = time ? new Date(`${date}T${time}:00`) : new Date(`${date}T00:00:00`);
      const res = await fetch("/api/teacher/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjectSectionId, sessionDate: sessionDate.toISOString() }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Failed to start session", "error");
        return;
      }
      showToast("Session started", "success");
      setQrSession(data);
      await loadAll();
    } catch {
      showToast("Failed to start session", "error");
    } finally {
      setCreating(false);
    }
  }

  async function closeSession(id: string) {
    try {
      const res = await fetch(`/api/teacher/sessions/${id}`, { method: "PATCH" });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Failed to close session", "error");
        return;
      }
      showToast("Session closed", "success");
      if (qrSession?.id === id) setQrSession(null);
      await loadAll();
    } catch {
      showToast("Failed to close session", "error");
    }
  }

  // the sessions LIST endpoint doesn't include a QR image (it's only
  // generated on create or on the detail endpoint) - so re-fetch the
  // detail endpoint to get a fresh one before showing the modal
  async function showQr(id: string) {
    try {
      const res = await fetch(`/api/teacher/sessions/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load QR code");
      setQrSession(data);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to load QR code", "error");
    }
  }

  async function viewSession(id: string) {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/teacher/sessions/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load session");
      setViewingSession(data);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to load session", "error");
    } finally {
      setDetailLoading(false);
    }
  }

  if (loading) {
    return (
      <div>
        <Skeleton className="h-8 w-32 mb-6" />
        <div className="rounded-lg border border-slate-200 bg-white p-6 mb-8">
          <Skeleton className="h-5 w-40 mb-1" />
          <Skeleton className="h-4 w-96 mb-4" />
          <FormFieldsSkeleton fields={4} />
        </div>
        <TableSkeleton rows={6} columns={5} />
      </div>
    );
  }

  const activeSessions = sessions.filter((s) => s.isActive);
  const pastSessions = sessions.filter((s) => !s.isActive);
  const filteredPast = pastSessions.filter((s) =>
    matchesSearch(query, s.subjectSection.subject.name, s.subjectSection.subject.code, s.subjectSection.section.name)
  );
  const paginatedPast = filteredPast.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.max(1, Math.ceil(filteredPast.length / pageSize));
  const detailRecords = viewingSession?.records || [];
  const paginatedDetailRecords = detailRecords.slice(
    (detailPage - 1) * pageSize,
    detailPage * pageSize
  );
  const detailTotalPages = Math.max(1, Math.ceil(detailRecords.length / pageSize));

  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-900 mb-6">Sessions</h1>

      <div className="rounded-lg border border-slate-200 bg-white p-6 mb-8">
        <h2 className="text-lg font-semibold text-slate-900 mb-1">Start a session</h2>
        <p className="text-sm text-slate-500 mb-4">
          Pick the subject-section, then the lecture date and time. If your admin has scheduled
          this class for today, the time is filled in automatically.
        </p>

        {assignments.length === 0 ? (
          <p className="text-sm text-slate-500">
            You haven't been assigned to teach any subject-section yet - ask your admin.
          </p>
        ) : (
          <form onSubmit={handleCreateSession} className="grid gap-4 sm:grid-cols-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700">Subject - Section</label>
              <select
                value={subjectSectionId}
                onChange={(e) => setSubjectSectionId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                required
              >
                <option value="">Select...</option>
                {assignments.map((a) => (
                  <option key={a.subjectSectionId} value={a.subjectSectionId}>
                    {a.subject.code} - {a.subject.name} ({a.section.name})
                  </option>
                ))}
              </select>
              {selectedAssignment && selectedAssignment.timetableSlots.length > 0 && (
                <p className="mt-1 text-xs text-slate-400">
                  Scheduled:{" "}
                  {selectedAssignment.timetableSlots
                    .map((s) => `${s.dayOfWeek.slice(0, 3)} ${s.startTime}-${s.endTime}`)
                    .join(", ")}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Time</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                required
              />
            </div>
            <div className="sm:col-span-4">
              <button
                type="submit"
                disabled={creating || !subjectSectionId}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {creating ? "Starting..." : "Start session & generate QR"}
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6 mb-8">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Active Sessions</h2>
        {activeSessions.length === 0 ? (
          <div className="text-center py-6 text-slate-500 text-sm">No active sessions right now.</div>
        ) : (
          <div className="space-y-3">
            {activeSessions.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 p-4"
              >
                <div>
                  <div className="font-semibold text-slate-900">
                    {s.subjectSection.subject.code} - {s.subjectSection.subject.name}
                  </div>
                  <div className="text-sm text-slate-600">
                    {s.subjectSection.section.name} ({s.subjectSection.section.year}) &middot;{" "}
                    {new Date(s.sessionDate).toLocaleString()}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">{s._count.records} marked</div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => viewSession(s.id)}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-white"
                  >
                    View
                  </button>
                  <button
                    onClick={() => showQr(s.id)}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                  >
                    Show QR
                  </button>
                  <button
                    onClick={() => closeSession(s.id)}
                    className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                  >
                    Close
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Past Sessions</h2>
        {filteredPast.length === 0 ? (
          <div className="text-center py-6 text-slate-500 text-sm">
            {pastSessions.length === 0 ? "No past sessions yet." : "No sessions match your search."}
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-semibold text-slate-900">Date</th>
                <th className="px-4 py-2 text-left text-sm font-semibold text-slate-900">Subject</th>
                <th className="px-4 py-2 text-left text-sm font-semibold text-slate-900">Section</th>
                <th className="px-4 py-2 text-left text-sm font-semibold text-slate-900">Marked</th>
                <th className="px-4 py-2 text-left text-sm font-semibold text-slate-900"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {paginatedPast.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2 text-sm text-slate-600">
                    {new Date(s.sessionDate).toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-sm text-slate-900">
                    {s.subjectSection.subject.code} - {s.subjectSection.subject.name}
                  </td>
                  <td className="px-4 py-2 text-sm text-slate-600">{s.subjectSection.section.name}</td>
                  <td className="px-4 py-2 text-sm text-slate-600">{s._count.records}</td>
                  <td className="px-4 py-2 text-sm">
                    <button
                      onClick={() => viewSession(s.id)}
                      className="text-xs font-medium text-slate-500 hover:text-slate-800"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Pagination
        page={page}
        totalPages={totalPages}
        total={filteredPast.length}
        pageSize={pageSize}
        itemLabel="past sessions"
        onPageChange={setPage}
        onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
      />

      {qrSession && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-4">
          <div className="rounded-lg bg-white p-8 max-w-md w-full">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">QR Code</h3>
            <QRCountdown expiresAt={qrSession.expiresAt} />
            {qrSession.qrIssuedAt && (
              <p className="text-center text-xs text-slate-400 -mt-2 mb-4">
                Generated at {new Date(qrSession.qrIssuedAt).toLocaleTimeString()}
              </p>
            )}
            <div className="aspect-square bg-slate-100 rounded-lg flex items-center justify-center mb-4">
              {qrSession.qrCodeDataUrl && (
                <img src={qrSession.qrCodeDataUrl} alt="QR Code" className="w-full h-full" />
              )}
            </div>
            <p className="text-sm text-slate-600 mb-4">
              {qrSession.subjectSection.subject.code} - {qrSession.subjectSection.subject.name}
            </p>
            <button
              onClick={() => setQrSession(null)}
              className="w-full rounded-lg bg-slate-900 px-4 py-2 text-white font-medium hover:bg-slate-800"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {(viewingSession || detailLoading) && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-4"
          onClick={() => setViewingSession(null)}
        >
          <div
            className="w-full max-w-lg rounded-lg bg-white p-6 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Attendance for this session</h3>
            {detailLoading || !viewingSession ? (
              <TableSkeleton rows={4} columns={4} />
            ) : viewingSession.records.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm">No one has been marked yet.</div>
            ) : (
              <>
              <table className="w-full">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-slate-900">Roll No.</th>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-slate-900">Name</th>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-slate-900">Status</th>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-slate-900">Via</th>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-slate-900">Marked At</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {viewingSession.records.map((r) => (
                    <tr key={r.id}>
                      <td className="px-3 py-2 text-sm text-slate-600">{r.student.rollNumber}</td>
                      <td className="px-3 py-2 text-sm text-slate-900">{r.student.user.name}</td>
                      <td className="px-3 py-2 text-sm text-slate-600">{r.status}</td>
                      <td className="px-3 py-2 text-sm text-slate-600">{r.markedVia}</td>
                      <td className="px-3 py-2 text-sm text-slate-500">
                        {new Date(r.markedAt).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
                <Pagination
                  page={detailPage}
                  totalPages={detailTotalPages}
                  total={detailRecords.length}
                  pageSize={pageSize}
                  itemLabel="attendance records"
                  onPageChange={setDetailPage}
                  onPageSizeChange={(size) => { setPageSize(size); setPage(1); setDetailPage(1); }}
                />
              </>
            )}
            <button
              onClick={() => setViewingSession(null)}
              className="mt-4 w-full rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
