"use client";

import { useEffect, useState } from "react";

type ScheduleEntry = {
  subjectSectionId: string;
  subject: { name: string; code: string };
  section: { name: string; year: number };
  teacher: string;
  day: string;
  startTime: string;
  endTime: string;
};

const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];
const DAY_LABELS: Record<string, string> = {
  MONDAY: "Monday",
  TUESDAY: "Tuesday",
  WEDNESDAY: "Wednesday",
  THURSDAY: "Thursday",
  FRIDAY: "Friday",
};

// JS getDay(): 0=Sunday..6=Saturday - map onto our Mon-Fri keys, weekends fall through to null
const JS_DAY_TO_KEY: (string | null)[] = [null, "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", null];

export default function StudentTimetablePage() {
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const todayKey = JS_DAY_TO_KEY[new Date().getDay()];

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/student/timetable");
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

  if (loading) return <div>Loading...</div>;

  const today = schedule.filter((e) => e.day === todayKey);

  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-900 mb-6">My Timetable</h1>

      <div className="rounded-lg border border-slate-200 bg-white p-6 mb-8">
        <h2 className="text-lg font-semibold text-slate-900 mb-1">
          Today {todayKey ? `- ${DAY_LABELS[todayKey]}` : ""}
        </h2>
        {!todayKey ? (
          <p className="text-sm text-slate-500 mt-2">No lectures on weekends.</p>
        ) : today.length === 0 ? (
          <p className="text-sm text-slate-500 mt-2">No lectures scheduled for today.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {today
              .slice()
              .sort((a, b) => a.startTime.localeCompare(b.startTime))
              .map((entry, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3"
                >
                  <div>
                    <div className="font-medium text-slate-900">
                      {entry.subject.code} - {entry.subject.name}
                    </div>
                    <div className="text-xs text-slate-600">
                      {entry.section.name} ({entry.section.year}) &middot; {entry.teacher}
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-emerald-700">
                    {entry.startTime} - {entry.endTime}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Full Week</h2>

        {schedule.length === 0 ? (
          <div className="text-center py-8 text-slate-500">No timetable has been set up yet</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-5">
            {DAYS.map((day) => {
              const dayEntries = schedule
                .filter((e) => e.day === day)
                .sort((a, b) => a.startTime.localeCompare(b.startTime));
              return (
                <div
                  key={day}
                  className={`rounded-lg border p-3 ${
                    day === todayKey ? "border-emerald-300 bg-emerald-50/40" : "border-slate-200"
                  }`}
                >
                  <div className="text-sm font-semibold text-slate-900 mb-2">{DAY_LABELS[day]}</div>
                  {dayEntries.length === 0 ? (
                    <div className="text-xs text-slate-400">No lectures</div>
                  ) : (
                    <div className="space-y-2">
                      {dayEntries.map((entry, idx) => (
                        <div key={idx} className="rounded-md bg-slate-50 px-2.5 py-2">
                          <div className="text-xs font-medium text-slate-900">
                            {entry.subject.code}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {entry.startTime} - {entry.endTime}
                          </div>
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
