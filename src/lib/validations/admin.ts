// Zod schemas for everything an Admin creates: accounts, sections, subjects,
// and the two join tables (who teaches what, who's enrolled in what).

import { z } from "zod";

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

// enrolling a student into that subject-section combo
export const createEnrollmentSchema = z.object({
  studentId: z.string().cuid(),
  subjectSectionId: z.string().cuid(),
});

// shared pagination/filtering query params - reused across every "list" endpoint
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
