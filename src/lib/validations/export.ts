// Zod schema for export requests - lets callers specify format (CSV or Excel)
// and optionally which columns to include.

import { z } from "zod";

export const exportFormatSchema = z.object({
  format: z.enum(["csv", "xlsx"]),
  includeAuditLog: z.boolean().default(false),
});
