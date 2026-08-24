// Validation schemas shared across more than one route group -
// currently just pagination, moved here instead of living inside
// admin.ts so reports.ts doesn't have to reach into an unrelated file.

import { z } from "zod";

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

// reusable date-range filter - "from"/"to" as query params, both optional
export const dateRangeSchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});
