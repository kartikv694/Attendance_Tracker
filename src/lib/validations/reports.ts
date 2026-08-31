// Zod schemas for report/history endpoints - built on top of the shared
// pagination and date-range schemas since every report needs both.

import { z } from "zod";
import { paginationSchema, dateRangeSchema } from "./common";

// student's own attendance history - narrower than teacher/admin reports
// since a student can only ever see their own records
export const studentHistoryFilterSchema = paginationSchema.extend({
  subjectSectionId: z.string().cuid().optional(),
  ...dateRangeSchema.shape,
});

// teacher report - always scoped to one subjectSection they own (checked
// in the route itself, not here), can drill into one student or one status
export const teacherReportFilterSchema = paginationSchema.extend({
  subjectSectionId: z.string().cuid(),
  studentId: z.string().cuid().optional(),
  status: z.enum(["PRESENT", "ABSENT", "LATE"]).optional(),
  ...dateRangeSchema.shape,
});

// admin report - same idea but nothing is mandatory, admin can see everything
export const adminReportFilterSchema = paginationSchema.extend({
  sectionId: z.string().cuid().optional(),
  subjectId: z.string().cuid().optional(),
  teacherId: z.string().cuid().optional(),
  studentId: z.string().cuid().optional(),
  status: z.enum(["PRESENT", "ABSENT", "LATE"]).optional(),
  ...dateRangeSchema.shape,
});

// audit log - every manual/auto status change across the system, filterable
// by the same slice-and-dice params as the admin report plus who made the change
export const auditLogFilterSchema = paginationSchema.extend({
  sectionId: z.string().cuid().optional(),
  subjectId: z.string().cuid().optional(),
  teacherId: z.string().cuid().optional(),
  studentId: z.string().cuid().optional(),
  changedByUserId: z.string().cuid().optional(),
  search: z.string().trim().optional(),
  ...dateRangeSchema.shape,
});
