"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/shared/toast";
import { Skeleton } from "@/components/shared/skeleton";
import { DAY_LABELS, DAYS, STANDARD_TIMETABLE_PERIODS, LUNCH_BREAK, WeeklyTimetableGrid, type WeeklyTimetableEntry } from "@/components/shared/weekly-timetable-grid";

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

type SelectedSection = { id: string; name: string; year: number };

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
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedSection, setSelectedSection] = useState<SelectedSection | null>(null);

  async function loadAll() {
    try {
      const [assignRes, slotsRes] = await Promise.all([fetch("/api/admin/subject-sections"), fetch("/api/admin/timetable")]);
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
      showToast("Failed to load timetable", "error");
    }
  }

  if (loading) {
    return (
      <div>
        <Skeleton className="mb-6 h-8 w-40" />
        <div className="mb-8 rounded-lg border border-slate-200 bg-white p-6"><Skeleton className="mb-4 h-5 w-48" /><Skeleton className="h-32 w-full" /></div>
        <div className="rounded-lg border border-slate-200 bg-white p-6"><Skeleton className="mb-4 h-5 w-40" /><Skeleton className="h-80 w-full" /></div>
      </div>
    );
  }

  const dayClasses = selectedDay
    ? Array.from(
        new Map(
          slots
            .filter((slot) => slot.dayOfWeek === selectedDay)
            .map((slot) => [slot.subjectSection.section.id, slot.subjectSection.section])
        ).values()
      ).sort((a, b) => a.name.localeCompare(b.name) || a.year - b.year)
    : [];
  const selectedSectionSlots = selectedSection
    ? slots.filter((slot) => slot.subjectSection.section.id === selectedSection.id)
    : [];
  const selectedSectionEntries: WeeklyTimetableEntry[] = selectedSectionSlots.map((slot) => ({
    id: slot.id,
    day: slot.dayOfWeek,
    startTime: slot.startTime,
    endTime: slot.endTime,
    subject: slot.subjectSection.subject,
    section: slot.subjectSection.section,
    teacher: slot.subjectSection.teacher.user.name,
  }));

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold text-slate-900">Timetable</h1>

      <div className="mb-8 rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="mb-1 text-lg font-semibold text-slate-900">Schedule a lecture</h2>
        <p className="mb-4 text-sm text-slate-500">Select the class and lecture slot. The college day is 09:00 AM - 05:00 PM with equally sized 60-minute periods and a fixed 01:00 PM - 02:00 PM lunch break.</p>
        {assignments.length === 0 ? (
          <p className="text-sm text-slate-500">No subject has been assigned to a section yet - do that from the Sections page first.</p>
        ) : (
          <form onSubmit={handleAddSlot} className="grid gap-4 sm:grid-cols-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700">Subject - Section</label>
              <select value={subjectSectionId} onChange={(e) => setSubjectSectionId(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none" required>
                <option value="">Select...</option>
                {assignments.map((a) => <option key={a.id} value={a.id}>{a.subject.code} - {a.subject.name} → {a.section.name} ({a.teacher.user.name})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Day</label>
              <select value={dayOfWeek} onChange={(e) => setDayOfWeek(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none">
                {DAYS.map((day) => <option key={day} value={day}>{DAY_LABELS[day]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Lecture Time</label>
              <select
                value={`${startTime}-${endTime}`}
                onChange={(e) => {
                  const [start, end] = e.target.value.split("-");
                  setStartTime(start);
                  setEndTime(end);
                }}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                required
              >
                {STANDARD_TIMETABLE_PERIODS.filter(
                  (period) => !(period.startTime === LUNCH_BREAK.startTime && period.endTime === LUNCH_BREAK.endTime)
                ).map((period) => (
                  <option key={`${period.startTime}-${period.endTime}`} value={`${period.startTime}-${period.endTime}`}>
                    {period.startTime} - {period.endTime}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-slate-400">Lunch: 13:00 - 14:00</p>
            </div>
            <div className="sm:col-span-4"><button type="submit" disabled={saving || !subjectSectionId} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50">{saving ? "Scheduling..." : "Add to timetable"}</button></div>
          </form>
        )}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="mb-5">
          <h2 className="text-xl font-semibold text-slate-900">College Timetable</h2>
          <p className="mt-1 text-sm text-slate-500">
            Choose a day, then a class, to see that class&apos;s complete Monday-Friday timetable.
          </p>
        </div>

        {/* Filters sit where a search bar normally would - a day/class pair
            instead of free text, since a timetable is browsed, not searched. */}
        <div className="mb-6 flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[16rem]">
            <label className="block text-sm font-medium text-slate-700 mb-1">Day</label>
            <select
              value={selectedDay ?? ""}
              onChange={(e) => {
                const day = e.target.value || null;
                setSelectedDay(day);
                // the class list depends on the day, so a stale class
                // selection from a different day can't stay selected
                setSelectedSection(null);
              }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            >
              <option value="">Select a day...</option>
              {DAYS.map((day) => {
                const count = slots.filter((slot) => slot.dayOfWeek === day).length;
                return (
                  <option key={day} value={day}>
                    {DAY_LABELS[day]} ({count} lecture{count === 1 ? "" : "s"})
                  </option>
                );
              })}
            </select>
          </div>
          <div className="flex-1 min-w-[16rem]">
            <label className="block text-sm font-medium text-slate-700 mb-1">Class</label>
            <select
              value={selectedSection?.id ?? ""}
              onChange={(e) => {
                const section = dayClasses.find((s) => s.id === e.target.value) ?? null;
                setSelectedSection(section);
              }}
              disabled={!selectedDay}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
            >
              <option value="">
                {!selectedDay
                  ? "Select a day first"
                  : dayClasses.length === 0
                    ? "No classes on this day"
                    : "Select a class..."}
              </option>
              {dayClasses.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.name} ({section.year})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* The grid itself is always on screen - an empty (all "Free") week
            before a day/class is picked, then filled in once both are chosen. */}
        <WeeklyTimetableGrid
          entries={selectedSection ? selectedSectionEntries : []}
          emptyMessage={
            !selectedDay
              ? "Choose a day and a class above to view its timetable."
              : !selectedSection
                ? "Choose a class above to view its timetable."
                : "No timetable has been scheduled for this class yet."
          }
        />

        {selectedSection && selectedSectionEntries.length > 0 && (
          <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <h4 className="text-sm font-semibold text-slate-900">Manage lectures</h4>
            <div className="mt-3 space-y-2">
              {selectedSectionSlots
                .slice()
                .sort((a, b) => a.dayOfWeek.localeCompare(b.dayOfWeek) || a.startTime.localeCompare(b.startTime))
                .map((slot) => (
                  <div key={slot.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-white px-4 py-3">
                    <div className="text-sm text-slate-700">
                      <span className="font-semibold">{DAY_LABELS[slot.dayOfWeek]}</span>
                      <span className="mx-2 text-slate-300">•</span>
                      {slot.startTime} - {slot.endTime}
                      <span className="mx-2 text-slate-300">•</span>
                      {slot.subjectSection.subject.code} - {slot.subjectSection.subject.name}
                      <span className="mx-2 text-slate-300">•</span>
                      {slot.subjectSection.teacher.user.name}
                    </div>
                    <button type="button" onClick={() => handleDeleteSlot(slot.id)} className="text-xs font-medium text-slate-400 hover:text-red-600">
                      Remove
                    </button>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
