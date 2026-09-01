// Single source of truth for the college timetable.
// The college day is exactly 8 hours: 09:00 AM - 05:00 PM.
// There is one 60-minute lunch break and seven equally sized 60-minute lecture slots.

export const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"] as const;

export const DAY_LABELS: Record<string, string> = {
  MONDAY: "Monday",
  TUESDAY: "Tuesday",
  WEDNESDAY: "Wednesday",
  THURSDAY: "Thursday",
  FRIDAY: "Friday",
};

export const LUNCH_BREAK = {
  label: "Lunch Break",
  startTime: "13:00",
  endTime: "14:00",
} as const;

export const STANDARD_TIMETABLE_PERIODS = [
  { startTime: "09:00", endTime: "10:00" },
  { startTime: "10:00", endTime: "11:00" },
  { startTime: "11:00", endTime: "12:00" },
  { startTime: "12:00", endTime: "13:00" },
  { startTime: "13:00", endTime: "14:00" }, // lunch
  { startTime: "14:00", endTime: "15:00" },
  { startTime: "15:00", endTime: "16:00" },
  { startTime: "16:00", endTime: "17:00" },
] as const;

export const LECTURE_PERIODS = STANDARD_TIMETABLE_PERIODS.filter(
  (period) => !(period.startTime === LUNCH_BREAK.startTime && period.endTime === LUNCH_BREAK.endTime)
);

export const TIMETABLE_START = "09:00";
export const TIMETABLE_END = "17:00";

export function isStandardLecturePeriod(startTime: string, endTime: string) {
  return LECTURE_PERIODS.some(
    (period) => period.startTime === startTime && period.endTime === endTime
  );
}
