"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type SessionOption = {
  id: string;
  sessionDate: string;
  isActive: boolean;
  subjectSection: {
    subject: { name: string; code: string };
    section: { name: string; year: number };
  };
};

function label(s: SessionOption) {
  return `${s.subjectSection.subject.code} - ${s.subjectSection.subject.name} · ${s.subjectSection.section.name} (${s.subjectSection.section.year})`;
}

export function LiveClassSearch({
  sessions,
  value,
  onChange,
}: {
  sessions: SessionOption[];
  value: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const selected = sessions.find((s) => s.id === value);

  useEffect(() => {
    if (!open && selected) setText(label(selected));
  }, [selected, open]);

  const filtered = useMemo(() => {
    const q = text.trim().toLowerCase();
    return sessions.filter((s) => !q || `${label(s)} ${s.sessionDate}`.toLowerCase().includes(q));
  }, [sessions, text]);

  return (
    <div ref={ref} className="relative min-w-0 flex-1">
      <label className="mb-1 block text-sm font-medium text-slate-700">Search class</label>
      <div className="relative">
        <input
          value={text}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setText(e.target.value);
            setOpen(true);
          }}
          placeholder={selected ? label(selected) : "Search or select a class..."}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 pr-9 text-sm focus:border-slate-500 focus:outline-none"
        />
        <button
          type="button"
          aria-label="Show all classes"
          onClick={() => setOpen((v) => !v)}
          className="absolute right-0 top-0 flex h-full w-9 items-center justify-center text-slate-400 hover:text-slate-700"
        >
          <svg className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m6 9 6 6 6-6" />
          </svg>
        </button>
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
          <div className="max-h-64 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-slate-500">No classes match your search</div>
            ) : (
              filtered.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    onChange(s.id);
                    setText(label(s));
                    setOpen(false);
                  }}
                  className={`block w-full px-3 py-2 text-left text-sm hover:bg-slate-50 ${s.id === value ? "bg-slate-50 font-medium" : ""}`}
                >
                  <div className="truncate text-slate-900">{label(s)}</div>
                  <div className="text-xs text-slate-500">
                    {new Date(s.sessionDate).toLocaleDateString()} · {new Date(s.sessionDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    {s.isActive ? " · Active" : ""}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
