// Zod schemas for everything an Admin creates: accounts, sections, subjects,
// and the two join tables (who teaches what, who's enrolled in what).

import { z } from "zod";
export { paginationSchema } from "./common";

export const createSectionSchema = z.object({
  name: z.string().min(1, "section name is required"), // e.g. "CSE-3A"
  year: z.number().int().min(2000).max(2100),
});

export const createSubjectSchema = z.object({
  name: z.string().min(1, "subject name is required"),
  code: z.string().min(1, "subject code is required"), // e.g. "CS301"
});

export const createTeacherSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6, "password must be at least 6 characters"),
  employeeCode: z.string().min(1),
});

export const createStudentSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6, "password must be at least 6 characters"),
  rollNumber: z.string().min(1),
  sectionId: z.string().cuid(),
});

// assigning a teacher to teach a subject to a specific section
export const assignSubjectSectionSchema = z.object({
  subjectId: z.string().cuid(),
  sectionId: z.string().cuid(),
  teacherId: z.string().cuid(),
});

// assigning a teacher as the class-teacher of a section - one section,
// one teacher, exclusively in both directions
export const assignClassTeacherSchema = z.object({
  sectionId: z.string().cuid(),
});

// enrolling a student into that subject-section combo
export const createEnrollmentSchema = z.object({
  studentId: z.string().cuid(),
  subjectSectionId: z.string().cuid(),
});

// a single weekly lecture slot for a subject-section, e.g. "CS301 for
// CSE-3A, Monday 09:00-10:00" - admin-only, this is what builds the
// timetable both students and teachers see
const timeString = z
  .string()
  .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "time must be in HH:mm 24-hour format");

const LECTURE_PERIODS = [
  ["09:00", "10:00"],
  ["10:00", "11:00"],
  ["11:00", "12:00"],
  ["12:00", "13:00"],
  ["14:00", "15:00"],
  ["15:00", "16:00"],
  ["16:00", "17:00"],
] as const;

export const createTimetableSlotSchema = z
  .object({
    subjectSectionId: z.string().cuid(),
    dayOfWeek: z.enum(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"]),
    startTime: timeString,
    endTime: timeString,
  })
  .refine((data) => data.endTime > data.startTime, {
    message: "end time must be after start time",
    path: ["endTime"],
  })
  .refine(
    (data) => LECTURE_PERIODS.some(([start, end]) => start === data.startTime && end === data.endTime),
    {
      message: "lecture must use one of the standard 60-minute timetable slots (09:00-13:00 or 14:00-17:00)",
      path: ["startTime"],
    }
  );
