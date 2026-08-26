"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/shared/toast";

type SubjectSectionOption = {
  id: string;
  subject: { name: string; code: string };
  section: { id: string; name: string; year: number };
  teacher: { user: { name: string } };
};

type Slot = {
  id: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  subjectSection: {
    subject: { name: string; code: string };
    section: { id: string; name: string; year: number };
    teacher: { user: { name: string } };
  };
};

const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];
const DAY_LABELS: Record<string, string> = {
  MONDAY: "Monday",
  TUESDAY: "Tuesday",
  WEDNESDAY: "Wednesday",
  THURSDAY: "Thursday",
  FRIDAY: "Friday",
};

export default function AdminTimetablePage() {
  const { showToast } = useToast();
  const [assignments, setAssignments] = useState<SubjectSectionOption[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [subjectSectionId, setSubjectSectionId] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState("MONDAY");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");

  // filter the grid to one section at a time so it stays readable once
  // there are many subject-sections in the system
  const [filterSectionId, setFilterSectionId] = useState("");

  async function loadAll() {
    try {
      const [assignRes, slotsRes] = await Promise.all([
        fetch("/api/admin/subject-sections"),
        fetch("/api/admin/timetable"),
      ]);
      const assignData = await assignRes.json();
      const slotsData = await slotsRes.json();
      if (!assignRes.ok) throw new Error(assignData.error || "Failed to load subject-sections");
      if (!slotsRes.ok) throw new Error(slotsData.error || "Failed to load timetable");
      setAssignments(assignData.data || []);
      setSlots(slotsData.data || []);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to load timetable", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleAddSlot(e: React.FormEvent) {
    e.preventDefault();
    if (!subjectSectionId) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/timetable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjectSectionId, dayOfWeek, startTime, endTime }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Failed to add slot", "error");
        return;
      }
      showToast("Lecture scheduled", "success");
      setSubjectSectionId("");
      await loadAll();
    } catch {
      showToast("Failed to add slot", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteSlot(id: string) {
    try {
      const res = await fetch(`/api/admin/timetable/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        showToast(data.error || "Failed to remove slot", "error");
        return;
      }
      showToast("Slot removed", "success");
      await loadAll();
    } catch {
      showToast("Failed to remove slot", "error");
    }
  }

  if (loading) return <div>Loading...</div>;

  const sectionOptions = Array.from(
    new Map(assignments.map((a) => [a.section.id, a.section])).values()
  );

  const visibleSlots = filterSectionId
    ? slots.filter((s) => s.subjectSection.section.id === filterSectionId)
    : slots;

  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-900 mb-6">Timetable</h1>

      <div className="rounded-lg border border-slate-200 bg-white p-6 mb-8">
        <h2 className="text-lg font-semibold text-slate-900 mb-1">Schedule a lecture</h2>
        <p className="text-sm text-slate-500 mb-4">
          Assign a subject-section to a weekly day and time. A section can't have two lectures at
          the same time, and neither can a teacher.
        </p>

        {assignments.length === 0 ? (
          <p className="text-sm text-slate-500">
            No subject has been assigned to a section yet - do that from the Sections page first.
          </p>
        ) : (
          <form onSubmit={handleAddSlot} className="grid gap-4 sm:grid-cols-4">
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
                  <option key={a.id} value={a.id}>
                    {a.subject.code} - {a.subject.name} &rarr; {a.section.name} ({a.teacher.user.name})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Day</label>
              <select
                value={dayOfWeek}
                onChange={(e) => setDayOfWeek(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              >
                {DAYS.map((d) => (
                  <option key={d} value={d}>
                    {DAY_LABELS[d]}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium text-slate-700">Start</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm focus:border-slate-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">End</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm focus:border-slate-500 focus:outline-none"
                  required
                />
              </div>
            </div>
            <div className="sm:col-span-4">
              <button
                type="submit"
                disabled={saving || !subjectSectionId}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {saving ? "Scheduling..." : "Add to timetable"}
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Weekly Timetable</h2>
          <select
            value={filterSectionId}
            onChange={(e) => setFilterSectionId(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-slate-500 focus:outline-none"
          >
            <option value="">All sections</option>
            {sectionOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.year})
              </option>
            ))}
          </select>
        </div>

        {visibleSlots.length === 0 ? (
          <div className="text-center py-8 text-slate-500">No lectures scheduled yet</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-5">
            {DAYS.map((day) => {
              const dayEntries = visibleSlots
                .filter((s) => s.dayOfWeek === day)
                .sort((a, b) => a.startTime.localeCompare(b.startTime));
              return (
                <div key={day} className="rounded-lg border border-slate-200 p-3">
                  <div className="text-sm font-semibold text-slate-900 mb-2">{DAY_LABELS[day]}</div>
                  {dayEntries.length === 0 ? (
                    <div className="text-xs text-slate-400">No lectures</div>
                  ) : (
                    <div className="space-y-2">
                      {dayEntries.map((slot) => (
                        <div key={slot.id} className="rounded-md bg-slate-50 px-2.5 py-2 group relative">
                          <div className="text-xs font-medium text-slate-900">
                            {slot.subjectSection.subject.code}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {slot.subjectSection.section.name} &middot; {slot.startTime}-{slot.endTime}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {slot.subjectSection.teacher.user.name}
                          </div>
                          <button
                            onClick={() => handleDeleteSlot(slot.id)}
                            className="absolute top-1 right-1 text-slate-300 opacity-0 group-hover:opacity-100 hover:text-red-600 text-xs"
                            aria-label="Remove slot"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
