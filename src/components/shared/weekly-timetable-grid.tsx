import { DAYS, DAY_LABELS, LUNCH_BREAK, STANDARD_TIMETABLE_PERIODS } from "@/lib/timetable";

export type WeeklyTimetableEntry = {
  id?: string;
  day: string;
  startTime: string;
  endTime: string;
  subject: { code: string; name: string };
  section?: { name: string; year: number };
  teacher?: string;
};

export { DAYS, DAY_LABELS, LUNCH_BREAK, STANDARD_TIMETABLE_PERIODS };

export type TimetableBreak = {
  label: string;
  startTime: string;
  endTime: string;
};

function formatTime(value: string) {
  const [hourString, minute = "00"] = value.split(":");
  const hour = Number(hourString);
  if (!Number.isFinite(hour)) return value;
  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minute} ${suffix}`;
}

function comparePeriods(a: { startTime: string; endTime: string }, b: { startTime: string; endTime: string }) {
  return a.startTime.localeCompare(b.startTime) || a.endTime.localeCompare(b.endTime);
}

function getPeriods(entries: WeeklyTimetableEntry[], lunchBreak: TimetableBreak | null) {
  const map = new Map<string, { startTime: string; endTime: string }>();

  // Always start with the college's standard periods. This guarantees that
  // every timetable shows every time slot and uses "Free" where needed.
  for (const period of STANDARD_TIMETABLE_PERIODS) {
    map.set(`${period.startTime}-${period.endTime}`, {
      startTime: period.startTime,
      endTime: period.endTime,
    });
  }

  if (lunchBreak) {
    map.set(`${lunchBreak.startTime}-${lunchBreak.endTime}`, {
      startTime: lunchBreak.startTime,
      endTime: lunchBreak.endTime,
    });
  }

  return Array.from(map.values()).sort(comparePeriods);
}

function isLunch(period: { startTime: string; endTime: string }, lunchBreak: TimetableBreak | null) {
  return Boolean(
    lunchBreak &&
      period.startTime === lunchBreak.startTime &&
      period.endTime === lunchBreak.endTime
  );
}

function LectureCell({ lecture }: { lecture: WeeklyTimetableEntry }) {
  return (
    <div className="h-full min-h-24 rounded-lg border border-indigo-200 bg-indigo-50 p-3 shadow-sm">
      <div className="text-xs font-bold text-indigo-700">{lecture.subject.code}</div>
      <div className="mt-1 text-sm font-semibold leading-5 text-slate-900">
        {lecture.subject.name}
      </div>
      {lecture.section && (
        <div className="mt-2 text-xs text-slate-600">
          {lecture.section.name} ({lecture.section.year})
        </div>
      )}
      {lecture.teacher && (
        <div className="mt-1 truncate text-xs text-slate-500">{lecture.teacher}</div>
      )}
    </div>
  );
}

/**
 * Full Monday-Friday timetable. The college always uses the fixed 8-hour
 * schedule, so every one-hour slot is shown and an unused lecture slot is Free.
 */
export function WeeklyTimetableGrid({
  entries,
  emptyMessage = "No lectures scheduled yet",
  lunchBreak = LUNCH_BREAK,
}: {
  entries: WeeklyTimetableEntry[];
  emptyMessage?: string;
  lunchBreak?: TimetableBreak | null;
}) {
  const periods = getPeriods(entries, lunchBreak);

  if (entries.length === 0 && !lunchBreak) {
    return <div className="py-10 text-center text-sm text-slate-500">{emptyMessage}</div>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="min-w-[1050px] w-full border-collapse">
        <thead>
          <tr className="bg-slate-50">
            <th className="sticky left-0 z-10 w-36 border-b border-r border-slate-200 bg-slate-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
              Time
            </th>
            {DAYS.map((day) => (
              <th key={day} className="border-b border-slate-200 px-3 py-3 text-center text-sm font-semibold text-slate-900">
                {DAY_LABELS[day]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {periods.map((period) => {
            const lunch = isLunch(period, lunchBreak);
            return (
              <tr key={`${period.startTime}-${period.endTime}`} className="align-stretch">
                <td className={`sticky left-0 z-10 border-b border-r border-slate-200 px-4 py-3 ${lunch ? "bg-amber-50" : "bg-white"}`}>
                  <div className={`text-sm font-semibold ${lunch ? "text-amber-800" : "text-slate-900"}`}>
                    {formatTime(period.startTime)}
                  </div>
                  <div className={`text-xs ${lunch ? "text-amber-700" : "text-slate-500"}`}>
                    to {formatTime(period.endTime)}
                  </div>
                </td>

                {lunch ? (
                  <td colSpan={DAYS.length} className="border-b border-slate-200 bg-amber-100 px-4 py-5 text-center">
                    <span className="text-sm font-bold uppercase tracking-wide text-amber-800">
                      {lunchBreak?.label ?? "Lunch Break"}
                    </span>
                    <div className="mt-1 text-xs text-amber-700">
                      {formatTime(period.startTime)} - {formatTime(period.endTime)}
                    </div>
                  </td>
                ) : (
                  DAYS.map((day) => {
                    const lecture = entries.find(
                      (entry) =>
                        entry.day === day &&
                        entry.startTime === period.startTime &&
                        entry.endTime === period.endTime
                    );
                    return (
                      <td key={day} className="h-28 border-b border-r border-slate-200 bg-slate-50/40 p-2 last:border-r-0">
                        {lecture ? (
                          <LectureCell lecture={lecture} />
                        ) : (
                          <div className="flex h-full min-h-24 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white text-xs text-slate-400">
                            Free
                          </div>
                        )}
                      </td>
                    );
                  })
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
      {entries.length === 0 && (
        <div className="border-t border-slate-200 py-4 text-center text-sm text-slate-500">{emptyMessage}</div>
      )}
    </div>
  );
}

/** A compact row/card used when a user wants to inspect one day only. */
export function DayTimetable({
  day,
  entries,
  lunchBreak = LUNCH_BREAK,
  emptyMessage = "No lectures scheduled for this day.",
}: {
  day: string;
  entries: WeeklyTimetableEntry[];
  lunchBreak?: TimetableBreak | null;
  emptyMessage?: string;
}) {
  const dayEntries = entries
    .filter((entry) => entry.day === day)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const periods = getPeriods(dayEntries, lunchBreak);

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-slate-50">
            <th className="w-36 border-b border-r border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Time</th>
            <th className="border-b border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-900">{DAY_LABELS[day] ?? day}</th>
          </tr>
        </thead>
        <tbody>
          {periods.map((period) => {
            const lunch = isLunch(period, lunchBreak);
            const lecture = dayEntries.find(
              (entry) => entry.startTime === period.startTime && entry.endTime === period.endTime
            );
            return (
              <tr key={`${period.startTime}-${period.endTime}`}>
                <td className={`border-b border-r border-slate-200 px-4 py-4 align-top ${lunch ? "bg-amber-50" : "bg-white"}`}>
                  <div className="text-sm font-semibold text-slate-900">{formatTime(period.startTime)}</div>
                  <div className="text-xs text-slate-500">to {formatTime(period.endTime)}</div>
                </td>
                <td className={`border-b border-slate-200 p-3 ${lunch ? "bg-amber-100" : "bg-slate-50/40"}`}>
                  {lunch ? (
                    <div className="py-4 text-center">
                      <div className="text-sm font-bold uppercase tracking-wide text-amber-800">{lunchBreak?.label}</div>
                      <div className="mt-1 text-xs text-amber-700">{formatTime(period.startTime)} - {formatTime(period.endTime)}</div>
                    </div>
                  ) : lecture ? (
                    <LectureCell lecture={lecture} />
                  ) : (
                    <div className="flex min-h-16 items-center rounded-lg border border-dashed border-slate-200 bg-white px-4 text-sm text-slate-400">Free</div>
                  )}
                </td>
              </tr>
            );
          })}
          {dayEntries.length === 0 && !lunchBreak && (
            <tr>
              <td colSpan={2} className="py-10 text-center text-sm text-slate-500">{emptyMessage}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
