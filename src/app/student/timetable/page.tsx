"use client";

import { useEffect, useState } from "react";
import { Skeleton, ListRowsSkeleton } from "@/components/shared/skeleton";
import {
  DayTimetable,
  DAY_LABELS,
  DAYS,
  WeeklyTimetableGrid,
  type WeeklyTimetableEntry,
} from "@/components/shared/weekly-timetable-grid";

type ScheduleEntry = WeeklyTimetableEntry & { subjectSectionId: string };

const JS_DAY_TO_KEY: (string | null)[] = [null, "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", null];

export default function StudentTimetablePage() {
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/student/timetable", { cache: "no-store" });
        const data = await res.json();
        setSchedule(data.schedule || []);
      } catch (err) {
        console.error("Failed to load timetable:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div>
        <Skeleton className="mb-6 h-8 w-44" />
        <div className="mb-8 rounded-lg border border-slate-200 bg-white p-6">
          <Skeleton className="mb-3 h-5 w-40" />
          <ListRowsSkeleton count={2} />
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <Skeleton className="mb-4 h-5 w-28" />
          <Skeleton className="h-80 w-full" />
        </div>
      </div>
    );
  }

  const todayKey = JS_DAY_TO_KEY[now.getDay()];
  const todayEntries = todayKey ? schedule.filter((entry) => entry.day === todayKey) : [];

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold text-slate-900">My Timetable</h1>

      {/* The Today card intentionally contains no lecture details. It is a
          navigation card; clicking it opens every lecture for that day. */}
      <div className="mb-8 rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">Today</h2>
        {todayKey ? (
          <button
            type="button"
            onClick={() => setSelectedDay(todayKey)}
            className="mt-3 flex w-full items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-left transition hover:border-emerald-400 hover:bg-emerald-100 hover:shadow-sm"
          >
            <div>
              <div className="text-base font-semibold text-slate-900">{DAY_LABELS[todayKey]}</div>
              <div className="mt-1 text-sm text-slate-600">
                {todayEntries.length} {todayEntries.length === 1 ? "lecture" : "lectures"} scheduled
              </div>
            </div>
            <span className="text-sm font-semibold text-emerald-700">View day timetable →</span>
          </button>
        ) : (
          <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-500">
            No lectures on weekends.
          </div>
        )}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-slate-900">Full Week</h2>
          <p className="mt-1 text-sm text-slate-500">
            Lectures are placed in their exact time slot. Lunch break is shown as a separate timetable period.
          </p>
        </div>
        <WeeklyTimetableGrid entries={schedule} />
      </div>

      {selectedDay && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setSelectedDay(null)}
        >
          <div
            className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 p-6 pb-4">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">{DAY_LABELS[selectedDay]} Timetable</h3>
                <p className="mt-1 text-sm text-slate-500">All lectures scheduled for this day.</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDay(null)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-6 pt-4">
              <DayTimetable day={selectedDay} entries={schedule} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
