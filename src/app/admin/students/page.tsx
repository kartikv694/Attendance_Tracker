"use client";

import { useEffect, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useSearch } from "@/components/shared/search-context";
import { SearchBar } from "@/components/shared/search-bar";
import { useToast } from "@/components/shared/toast";
import { Skeleton, TableSkeleton } from "@/components/shared/skeleton";
import { DataTable, SortableHeader } from "@/components/ui/data-table";

type Student = {
  id: string;
  user: { name: string; email: string };
  rollNumber: string;
  sectionId: string;
  section: { name: string; year: number };
};

type Section = {
  id: string;
  name: string;
  year: number;
};

export default function StudentsPage() {
  const { query } = useSearch();
  const { showToast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // showForm doubles as the "Add Student" and "Edit Student" modal -
  // editingId tells the submit handler (and the title/labels) which mode
  // we're in. null = creating a new student.
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [sectionId, setSectionId] = useState("");

  async function loadStudents() {
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (query.trim()) params.set("search", query.trim());
      const res = await fetch(`/api/admin/students?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load students");
      setStudents(data.data || []);
      setTotal(data.pagination?.total ?? 0);
      setTotalPages(data.pagination?.totalPages ?? 1);
    } catch (err) {
      console.error("Failed to load students:", err);
      showToast("Failed to load students. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  }



  useEffect(() => { setPage(1); }, [query]);

  useEffect(() => {
    loadStudents();
  }, [page, pageSize, query]);


  async function openForm() {
    // Always fetch fresh sections before opening the student form. This avoids
    // relying on stale client state after a section was created on another page.
    try {
      const res = await fetch(`/api/admin/sections?page=1&pageSize=100`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to load sections");
      }

      const freshSections = data.data || [];
      setSections(freshSections);

      if (freshSections.length === 0) {
        showToast("Create a section first - a student needs one to belong to", "error");
        return;
      }

      setEditingId(null);
      setName("");
      setEmail("");
      setRollNumber("");
      setSectionId(freshSections[0].id);
      setShowForm(true);
    } catch (err) {
      console.error("Failed to load sections:", err);
      showToast("Failed to load sections. Please try again.", "error");
    }
  }

  async function openEditForm(student: Student) {
    // same reasoning as openForm - fetch fresh sections so the dropdown
    // isn't missing a section created on another page since page load
    try {
      const res = await fetch(`/api/admin/sections?page=1&pageSize=100`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to load sections");
      }
      setSections(data.data || []);
    } catch (err) {
      console.error("Failed to load sections:", err);
      showToast("Failed to load sections. Please try again.", "error");
      return;
    }

    setEditingId(student.id);
    setName(student.user.name);
    setEmail(student.user.email);
    setRollNumber(student.rollNumber);
    setSectionId(student.sectionId);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const isEditing = editingId !== null;
      const res = await fetch(
        isEditing ? `/api/admin/students/${editingId}` : "/api/admin/students",
        {
          method: isEditing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            isEditing
              ? { name, email, rollNumber, sectionId }
              : { name, email, rollNumber, sectionId }
          ),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || `Failed to ${isEditing ? "update" : "create"} student`, "error");
        return;
      }
      showToast(isEditing ? "Student updated" : "Student account created", "success");
      setShowForm(false);
      setEditingId(null);
      setName("");
      setEmail("");
      setRollNumber("");
      loadStudents();
    } catch {
      showToast(`Failed to ${editingId ? "update" : "create"} student`, "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(student: Student) {
    if (
      !window.confirm(
        `Delete ${student.user.name}? This removes their account and can't be undone.`
      )
    ) {
      return;
    }
    setDeletingId(student.id);
    try {
      const res = await fetch(`/api/admin/students/${student.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.error || "Failed to delete student", "error");
        return;
      }
      showToast("Student deleted", "success");
      loadStudents();
    } catch {
      showToast("Failed to delete student", "error");
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return (
      <div>
        <div className="mb-6 flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
        <TableSkeleton rows={7} columns={4} />
      </div>
    );
  }


  const columns: ColumnDef<Student, unknown>[] = [
    {
      id: "Name",
      accessorFn: (row) => row.user.name,
      header: ({ column }) => <SortableHeader column={column} label="Name" />,
      cell: ({ row }) => <span className="text-slate-900">{row.original.user.name}</span>,
    },
    {
      id: "Roll Number",
      accessorFn: (row) => row.rollNumber,
      header: ({ column }) => <SortableHeader column={column} label="Roll Number" />,
      cell: ({ row }) => row.original.rollNumber,
    },
    {
      id: "Email",
      accessorFn: (row) => row.user.email,
      header: ({ column }) => <SortableHeader column={column} label="Email" />,
      cell: ({ row }) => row.original.user.email,
    },
    {
      id: "Section",
      accessorFn: (row) => `${row.section.name} (${row.section.year})`,
      header: ({ column }) => <SortableHeader column={column} label="Section" />,
      cell: ({ row }) => `${row.original.section.name} (${row.original.section.year})`,
    },
    {
      id: "Actions",
      enableSorting: false,
      header: "",
      cell: ({ row }) => {
        const student = row.original;
        return (
          <div className="flex items-center gap-3">
            <button
              onClick={() => openEditForm(student)}
              className="text-xs font-medium text-slate-500 hover:text-slate-900"
            >
              Edit
            </button>
            <button
              onClick={() => handleDelete(student)}
              disabled={deletingId === student.id}
              className="text-xs font-medium text-slate-400 hover:text-red-600 disabled:opacity-50"
            >
              {deletingId === student.id ? "Deleting..." : "Delete"}
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Students</h1>
        <button
          onClick={openForm}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          + Add Student
        </button>
      </div>

      <SearchBar placeholder="Search students..." />

      <DataTable
        columns={columns}
        data={students}
        emptyMessage={students.length === 0 ? "No students found" : "No students match your search"}
        serverPagination={{
          page,
          totalPages,
          total,
          pageSize,
          onPageChange: setPage,
          onPageSizeChange: (size) => { setPageSize(size); setPage(1); },
        }}
      />

      {showForm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              {editingId ? "Edit Student" : "Add Student"}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                  required
                />
              </div>
              {!editingId && (
                <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                  Login password is generated automatically as{" "}
                  <span className="font-semibold">FirstName@1234</span>.
                  For example, Kartik Verma gets <span className="font-semibold">Kartik@1234</span>.
                </p>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Roll number
                </label>
                <input
                  type="text"
                  value={rollNumber}
                  onChange={(e) => setRollNumber(e.target.value)}
                  placeholder="e.g. 21CS045"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Section</label>
                <select
                  value={sectionId}
                  onChange={(e) => setSectionId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                  required
                >
                  {sections.map((section) => (
                    <option key={section.id} value={section.id}>
                      {section.name} ({section.year})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                  }}
                  className="flex-1 rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-lg bg-slate-900 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {saving ? (editingId ? "Saving..." : "Creating...") : editingId ? "Save" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
