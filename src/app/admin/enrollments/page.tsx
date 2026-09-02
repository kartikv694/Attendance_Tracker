"use client";

// The other half of the loop: a SubjectSection existing doesn't mean any
// student can be marked present in it - each student needs an Enrollment
// row first. This is what /api/student/attendance/scan checks before
// letting a scan count.

import { useEffect, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useSearch, matchesSearch } from "@/components/shared/search-context";
import { SearchBar } from "@/components/shared/search-bar";
import { useToast } from "@/components/shared/toast";
import { Skeleton, TableSkeleton } from "@/components/shared/skeleton";
import { DataTable, SortableHeader } from "@/components/ui/data-table";

type Enrollment = {
  id: string;
  student: { user: { name: string } };
  subjectSection: {
    subject: { name: string; code: string };
    section: { name: string; year: number };
  };
};

type AssignmentOption = {
  id: string;
  label: string;
};

type StudentOption = {
  id: string;
  label: string;
};

export default function EnrollmentsPage() {
  const { query } = useSearch();
  const { showToast } = useToast();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [assignments, setAssignments] = useState<AssignmentOption[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [subjectSectionId, setSubjectSectionId] = useState("");
  const [studentId, setStudentId] = useState("");

  async function loadEnrollments() {
    try {
      const res = await fetch("/api/admin/enrollments");
      const data = await res.json();
      setEnrollments(data.data || []);
    } catch (err) {
      console.error("Failed to load enrollments:", err);
    } finally {
      setLoading(false);
    }
  }

  async function loadOptions() {
    try {
      const [assignmentsRes, studentsRes] = await Promise.all([
        fetch("/api/admin/subject-sections"),
        fetch("/api/admin/students?page=1&pagesize=100"),
      ]);
      const assignmentsData = await assignmentsRes.json();
      const studentsData = await studentsRes.json();

      setAssignments(
        (assignmentsData.data || []).map(
          (a: {
            id: string;
            subject: { name: string; code: string };
            section: { name: string; year: number };
          }) => ({
            id: a.id,
            label: `${a.subject.code} - ${a.subject.name} · ${a.section.name} (${a.section.year})`,
          })
        )
      );
      setStudents(
        (studentsData.data || []).map(
          (s: { id: string; user: { name: string }; rollNumber: string }) => ({
            id: s.id,
            label: `${s.user.name} (${s.rollNumber})`,
          })
        )
      );
    } catch (err) {
      console.error("Failed to load options:", err);
    }
  }

  useEffect(() => {
    loadEnrollments();
    loadOptions();
  }, []);

  function openForm() {
    if (assignments.length === 0 || students.length === 0) {
      showToast("You need at least one assignment and one student first", "error");
      return;
    }
    setSubjectSectionId(assignments[0].id);
    setStudentId(students[0].id);
    setShowForm(true);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, subjectSectionId }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Failed to enroll student", "error");
        return;
      }
      showToast("Student enrolled", "success");
      setShowForm(false);
      loadEnrollments();
    } catch {
      showToast("Failed to enroll student", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(enrollment: Enrollment) {
    if (
      !window.confirm(
        `Unenroll ${enrollment.student.user.name} from ${enrollment.subjectSection.subject.code}? This can't be undone.`
      )
    ) {
      return;
    }
    setDeletingId(enrollment.id);
    try {
      const res = await fetch(`/api/admin/enrollments/${enrollment.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.error || "Failed to unenroll student", "error");
        return;
      }
      showToast("Student unenrolled", "success");
      loadEnrollments();
    } catch {
      showToast("Failed to unenroll student", "error");
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return (
      <div>
        <div className="mb-6 flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-36" />
        </div>
        <TableSkeleton rows={6} columns={3} />
      </div>
    );
  }

  const columns: ColumnDef<Enrollment>[] = [
    {
      id: "Student",
      accessorFn: (row) => row.student.user.name,
      header: ({ column }) => <SortableHeader column={column} label="Student" />,
      cell: ({ row }) => <span className="text-slate-900">{row.original.student.user.name}</span>,
    },
    {
      id: "Subject",
      accessorFn: (row) => `${row.subjectSection.subject.code} - ${row.subjectSection.subject.name}`,
      header: ({ column }) => <SortableHeader column={column} label="Subject" />,
      cell: ({ row }) =>
        `${row.original.subjectSection.subject.code} - ${row.original.subjectSection.subject.name}`,
    },
    {
      id: "Section",
      accessorFn: (row) => `${row.subjectSection.section.name} (${row.subjectSection.section.year})`,
      header: ({ column }) => <SortableHeader column={column} label="Section" />,
      cell: ({ row }) =>
        `${row.original.subjectSection.section.name} (${row.original.subjectSection.section.year})`,
    },
    {
      id: "Actions",
      enableSorting: false,
      header: "",
      cell: ({ row }) => {
        const enrollment = row.original;
        return (
          <button
            onClick={() => handleDelete(enrollment)}
            disabled={deletingId === enrollment.id}
            className="text-xs font-medium text-slate-400 hover:text-red-600 disabled:opacity-50"
          >
            {deletingId === enrollment.id ? "Removing..." : "Remove"}
          </button>
        );
      },
    },
  ];

  const filtered = enrollments.filter((e) =>
    matchesSearch(
      query,
      e.student.user.name,
      e.subjectSection.subject.name,
      e.subjectSection.subject.code,
      e.subjectSection.section.name
    )
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Enrollments</h1>
          <p className="text-sm text-slate-500 mt-1">
            Which students are eligible to be marked present in which class.
          </p>
        </div>
        <button
          onClick={openForm}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          + Add Enrollment
        </button>
      </div>

      <SearchBar placeholder="Search enrollments..." />

      <DataTable
        columns={columns}
        data={filtered}
        emptyMessage={enrollments.length === 0 ? "No enrollments yet" : "No enrollments match your search"}
      />

      {showForm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Add Enrollment</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Student</label>
                <select
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Class (subject + section)
                </label>
                <select
                  value={subjectSectionId}
                  onChange={(e) => setSubjectSectionId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                >
                  {assignments.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-lg bg-slate-900 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {saving ? "Enrolling..." : "Enroll"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
