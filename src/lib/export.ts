// Export helper - generates CSV or Excel from attendance records.
// Both formats return a Buffer that can be piped straight to the response.

import { createReadStream, createWriteStream, unlinkSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import ExcelJS from "exceljs";

type AttendanceRecord = {
  student: { user: { name: string } };
  status: string;
  markedAt: Date;
  session: {
    sessionDate: Date;
    subjectSection: {
      subject: { name: string; code: string };
      section: { name: string; year: number };
    };
  };
};

function formatDate(d: Date) {
  return d.toLocaleDateString("en-IN"); // DD/MM/YYYY
}

export async function generateCSV(records: AttendanceRecord[]): Promise<Buffer> {
  const lines = [
    ["Student", "Subject", "Section", "Date", "Status", "Marked At"].join(","),
    ...records.map((r) =>
      [
        r.student.user.name,
        `${r.session.subjectSection.subject.code} - ${r.session.subjectSection.subject.name}`,
        `${r.session.subjectSection.section.name} (${r.session.subjectSection.section.year})`,
        formatDate(r.session.sessionDate),
        r.status,
        formatDate(r.markedAt),
      ]
        .map((field) => `"${String(field).replace(/"/g, '""')}"`) // escape quotes
        .join(",")
    ),
  ];

  return Buffer.from(lines.join("\n"), "utf-8");
}

export async function generateExcel(records: AttendanceRecord[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Attendance");

  // header row with styling
  const headerRow = worksheet.addRow([
    "Student",
    "Subject",
    "Section",
    "Date",
    "Status",
    "Marked At",
  ]);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF366092" } };
  headerRow.alignment = { horizontal: "center", vertical: "middle" };

  // data rows
  records.forEach((r) => {
    worksheet.addRow([
      r.student.user.name,
      `${r.session.subjectSection.subject.code} - ${r.session.subjectSection.subject.name}`,
      `${r.session.subjectSection.section.name} (${r.session.subjectSection.section.year})`,
      formatDate(r.session.sessionDate),
      r.status,
      formatDate(r.markedAt),
    ]);
  });

  // auto-fit columns
  worksheet.columns.forEach((col) => {
    let maxLength = 0;
    col.eachCell?.({ includeEmpty: true }, (cell) => {
      const length = String(cell.value || "").length;
      if (length > maxLength) maxLength = length;
    });
    col.width = Math.min(maxLength + 2, 50);
  });

  // write to temp file, read as buffer, clean up
  const tmpPath = join(tmpdir(), `attendance-${Date.now()}.xlsx`);
  await workbook.xlsx.writeFile(tmpPath);

  const fileContent = createReadStream(tmpPath);
  const chunks: Buffer[] = [];

  return new Promise((resolve, reject) => {
      fileContent.on("data", (chunk: Buffer | string) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      });
    fileContent.on("end", () => {
      unlinkSync(tmpPath); // clean up temp file
      resolve(Buffer.concat(chunks));
    });
    fileContent.on("error", reject);
  });
}
