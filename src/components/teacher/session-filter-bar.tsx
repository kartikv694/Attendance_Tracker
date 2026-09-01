"use client";

import { useMemo } from "react";

type SessionLike = {
  id: string;
  sessionDate: string;
  subjectSection: {
    subject: { name: string; code: string };
    section: { name: string; year: number };
  };
};

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function localDateValue(value: string) {
  const d = new Date(value);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function SessionFilterBar({
  sessions,
  search,
  onSearchChange,
  day,
  onDayChange,
  date,
  onDateChange,
  time,
  onTimeChange,
  onClear,
  showLabel = true,
}: {
  sessions: SessionLike[];
  search: string;
  onSearchChange: (value: string) => void;
  day: string;
  onDayChange: (value: string) => void;
  date: string;
  onDateChange: (value: string) => void;
  time: string;
  onTimeChange: (value: string) => void;
  onClear: () => void;
  showLabel?: boolean;
}) {
  const timeOptions = useMemo(() => {
    return Array.from(
      new Set(
        sessions.map((s) => {
          const d = new Date(s.sessionDate);
          return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
        })
      )
    ).sort();
  }, [sessions]);

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
      <div className="min-w-0 flex-1 lg:min-w-[18rem]">
        {showLabel && <label className="mb-1 block text-sm font-medium text-slate-700">Search</label>}
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search subject, code or section..."
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
        />
      </div>

      <div className="w-full lg:w-40">
        {showLabel && <label className="mb-1 block text-sm font-medium text-slate-700">Day</label>}
        <select
          value={day}
          onChange={(e) => onDayChange(e.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
        >
          <option value="">Select...</option>
          {DAYS.map((name, index) => <option key={name} value={String(index)}>{name}</option>)}
        </select>
      </div>

      <div className="w-full lg:w-44">
        {showLabel && <label className="mb-1 block text-sm font-medium text-slate-700">Date</label>}
        <input
          type="date"
          value={date}
          onChange={(e) => onDateChange(e.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
        />
      </div>

      <div className="w-full lg:w-36">
        {showLabel && <label className="mb-1 block text-sm font-medium text-slate-700">Time</label>}
        <select
          value={time}
          onChange={(e) => onTimeChange(e.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
        >
          <option value="">Select...</option>
          {timeOptions.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <button
        type="button"
        onClick={onClear}
        className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
      >
        Clear
      </button>
    </div>
  );
}

export function matchesSessionFilters(
  session: SessionLike,
  search: string,
  day: string,
  date: string,
  time: string
) {
  const d = new Date(session.sessionDate);
  const haystack = `${session.subjectSection.subject.name} ${session.subjectSection.subject.code} ${session.subjectSection.section.name}`.toLowerCase();
  if (search.trim() && !haystack.includes(search.trim().toLowerCase())) return false;
  if (day && String(d.getDay()) !== day) return false;
  if (date && localDateValue(session.sessionDate) !== date) return false;
  if (time) {
    const hm = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    if (hm !== time) return false;
  }
  return true;
}
