"use client";

// A searchable "class" picker used across the teacher side (Sessions,
// Live Attendance, Mark Attendance) wherever a teacher needs to pick one
// session out of a potentially long list. Replaces a plain <select> with:
//   - a text box that filters by subject name/code or section as you type
//   - separate Day / Date / Time filters tucked inside the dropdown panel
// All filtering happens client-side against the session list already
// loaded by the page, so no new API calls are needed.

import { useEffect, useMemo, useRef, useState } from "react";

export type DropdownSession = {
  id: string;
  sessionDate: string;
  isActive: boolean;
  subjectSection: {
    subject: { name: string; code: string };
    section: { name: string; year: number };
  };
};

const DAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function sessionLabel(s: DropdownSession) {
  const d = new Date(s.sessionDate);
  return `${s.subjectSection.subject.code} - ${s.subjectSection.subject.name} · ${
    s.subjectSection.section.name
  } (${s.subjectSection.section.year}) · ${d.toLocaleDateString()} ${d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })}${s.isActive ? " · active" : ""}`;
}

export function SessionSearchDropdown({
  sessions,
  value,
  onChange,
  label = "Class",
  placeholder = "Search by subject, section...",
  extraTimes = [],
}: {
  sessions: DropdownSession[];
  value: string;
  onChange: (id: string) => void;
  label?: string;
  placeholder?: string;
  // additional HH:MM lecture times to offer in the Time filter beyond what
  // already has a session created - e.g. every time slot on the teacher's
  // timetable, so the filter covers lectures that haven't been started yet
  extraTimes?: string[];
}) {
  const [open, setOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [dayFilter, setDayFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [timeFilter, setTimeFilter] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  // distinct HH:MM times for the Time filter - every session's actual time,
  // plus every scheduled timetable lecture time, so a teacher can filter by
  // a lecture slot even before a session has been created for it yet
  const timeOptions = useMemo(() => {
    const times = new Set<string>();
    sessions.forEach((s) => {
      const d = new Date(s.sessionDate);
      times.add(`${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`);
    });
    extraTimes.forEach((t) => times.add(t));
    return Array.from(times).sort();
  }, [sessions, extraTimes]);

  const filtered = useMemo(() => {
    return sessions.filter((s) => {
      const d = new Date(s.sessionDate);
      if (searchText) {
        const haystack = `${s.subjectSection.subject.name} ${s.subjectSection.subject.code} ${s.subjectSection.section.name}`.toLowerCase();
        if (!haystack.includes(searchText.toLowerCase())) return false;
      }
      if (dayFilter && String(d.getDay()) !== dayFilter) return false;
      if (dateFilter && d.toISOString().slice(0, 10) !== dateFilter) return false;
      if (timeFilter) {
        const hm = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
        if (hm !== timeFilter) return false;
      }
      return true;
    });
  }, [sessions, searchText, dayFilter, dateFilter, timeFilter]);

  const selected = sessions.find((s) => s.id === value);
  const hasActiveFilters = dayFilter || dateFilter || timeFilter;

  return (
    <div ref={rootRef} className="relative w-full">
      {label && <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-sm hover:border-slate-400 focus:border-slate-500 focus:outline-none"
      >
        <span className={selected ? "text-slate-900" : "text-slate-400"}>
          {selected ? sessionLabel(selected) : "Select a class..."}
        </span>
        <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-40 mt-1 w-full min-w-[22rem] rounded-lg border border-slate-200 bg-white shadow-lg">
          <div className="p-3 border-b border-slate-100">
            <input
              autoFocus
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder={placeholder}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            />
            <div className="mt-2 grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-0.5">Day</label>
                <select
                  value={dayFilter}
                  onChange={(e) => setDayFilter(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs focus:border-slate-500 focus:outline-none"
                >
                  <option value="">Any</option>
                  {DAY_LABELS.map((d, i) => (
                    <option key={d} value={i}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-0.5">Date</label>
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs focus:border-slate-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-0.5">Time</label>
                <select
                  value={timeFilter}
                  onChange={(e) => setTimeFilter(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs focus:border-slate-500 focus:outline-none"
                >
                  <option value="">Any</option>
                  {timeOptions.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => {
                  setDayFilter("");
                  setDateFilter("");
                  setTimeFilter("");
                }}
                className="mt-2 text-[11px] font-medium text-slate-500 hover:text-slate-800"
              >
                Clear filters
              </button>
            )}
          </div>

          <div className="max-h-64 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-slate-500">No classes match</div>
            ) : (
              filtered.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    onChange(s.id);
                    setOpen(false);
                  }}
                  className={`block w-full truncate px-3 py-2 text-left text-sm hover:bg-slate-50 ${
                    s.id === value ? "bg-slate-50 font-medium text-slate-900" : "text-slate-700"
                  }`}
                >
                  {sessionLabel(s)}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
