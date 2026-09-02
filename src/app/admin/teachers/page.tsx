"use client";

import { useEffect, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useSearch, matchesSearch } from "@/components/shared/search-context";
import { SearchBar } from "@/components/shared/search-bar";
import { useToast } from "@/components/shared/toast";
import { Skeleton, TableSkeleton } from "@/components/shared/skeleton";
import { DataTable, SortableHeader } from "@/components/ui/data-table";

type Teacher = {
  id: string;
  employeeCode: string;
  user: { name: string; email: string };
  classSection: { id: string; name: string; year: number } | null;
};

type UnassignedSection = {
  id: string;
  name: string;
  year: number;
  _count: { students: number };
};

export default function TeachersPage() {
  const { query } = useSearch();
  const { showToast } = useToast();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);

  // the "Assign" picker - which teacher we're assigning a class to, and
  // the list of sections that don't have a class-teacher yet
  const [assigningTeacher, setAssigningTeacher] = useState<Teacher | null>(null);
  const [unassignedSections, setUnassignedSections] = useState<UnassignedSection[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);

  // Add/Edit Teacher form - editingId null means we're creating a new
  // teacher, otherwise it's the id of the teacher being edited
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [employeeCode, setEmployeeCode] = useState("");

  async function loadTeachers() {
    try {
      const res = await fetch(`/api/admin/teachers?page=1&pageSize=100`, {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });

      const text = await res.text();
      let data: { data?: Teacher[]; error?: string } = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        throw new Error(`Teachers API returned an invalid response (status ${res.status})`);
      }

      if (!res.ok) {
        throw new Error(data.error || `Failed to load teachers (status ${res.status})`);
      }

      setTeachers(data.data || []);
    } catch (err) {
      console.error("Failed to load teachers:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTeachers();
  }, []);

  async function openAssignPicker(teacher: Teacher) {
    setAssigningTeacher(teacher);
    setPickerLoading(true);
    try {
      const res = await fetch(`/api/admin/sections?unassigned=true&pageSize=100`);
      const data = await res.json();
      setUnassignedSections(data.data || []);
    } catch {
      showToast("Failed to load unassigned classes", "error");
    } finally {
      setPickerLoading(false);
    }
  }

  async function assignSection(sectionId: string) {
    if (!assigningTeacher) return;
    try {
      const res = await fetch(`/api/admin/teachers/${assigningTeacher.id}/assign-class`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectionId }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Failed to assign class", "error");
        return;
      }
      showToast("Class assigned", "success");
      setAssigningTeacher(null);
      loadTeachers();
    } catch {
      showToast("Failed to assign class", "error");
    }
  }

  async function unassignSection(teacher: Teacher) {
    try {
      const res = await fetch(`/api/admin/teachers/${teacher.id}/assign-class`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        showToast(data.error || "Failed to unassign", "error");
        return;
      }
      showToast("Class unassigned", "success");
      loadTeachers();
    } catch {
      showToast("Failed to unassign", "error");
    }
  }

  function openForm() {
    setEditingId(null);
    setName("");
    setEmail("");
    setPassword("");
    setEmployeeCode("");
    setShowForm(true);
  }

  function openEditForm(teacher: Teacher) {
    setEditingId(teacher.id);
    setName(teacher.user.name);
    setEmail(teacher.user.email);
    setPassword("");
    setEmployeeCode(teacher.employeeCode);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const isEditing = editingId !== null;
      const res = await fetch(
        isEditing ? `/api/admin/teachers/${editingId}` : "/api/admin/teachers",
        {
          method: isEditing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            isEditing ? { name, email, employeeCode } : { name, email, password, employeeCode }
          ),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || `Failed to ${isEditing ? "update" : "create"} teacher`, "error");
        return;
      }
      showToast(isEditing ? "Teacher updated" : "Teacher account created", "success");
      setShowForm(false);
      setEditingId(null);
      setName("");
      setEmail("");
      setPassword("");
      setEmployeeCode("");
      loadTeachers();
    } catch {
      showToast(`Failed to ${editingId ? "update" : "create"} teacher`, "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(teacher: Teacher) {
    if (
      !window.confirm(
        `Delete ${teacher.user.name}? This removes their account and can't be undone.`
      )
    ) {
      return;
    }
    setDeletingId(teacher.id);
    try {
      const res = await fetch(`/api/admin/teachers/${teacher.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.error || "Failed to delete teacher", "error");
        return;
      }
      showToast("Teacher deleted", "success");
      loadTeachers();
    } catch {
      showToast("Failed to delete teacher", "error");
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
        <TableSkeleton rows={6} columns={4} />
      </div>
    );
  }

  const filtered = teachers.filter((teacher) =>
    matchesSearch(query, teacher.user.name, teacher.employeeCode, teacher.user.email)
  );

  const columns: ColumnDef<Teacher>[] = [
    {
      id: "Name",
      accessorFn: (row) => row.user.name,
      header: ({ column }) => <SortableHeader column={column} label="Name" />,
      cell: ({ row }) => <span className="text-slate-900">{row.original.user.name}</span>,
    },
    {
      id: "Employee Code",
      accessorFn: (row) => row.employeeCode,
      header: ({ column }) => <SortableHeader column={column} label="Employee Code" />,
      cell: ({ row }) => row.original.employeeCode,
    },
    {
      id: "Email",
      accessorFn: (row) => row.user.email,
      header: ({ column }) => <SortableHeader column={column} label="Email" />,
      cell: ({ row }) => row.original.user.email,
    },
    {
      id: "Class Teacher",
      accessorFn: (row) => row.classSection?.name ?? "",
      header: "Class Teacher",
      enableSorting: false,
      cell: ({ row }) => {
        const teacher = row.original;
        return teacher.classSection ? (
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
              {teacher.classSection.name} ({teacher.classSection.year})
            </span>
            <button
              onClick={() => unassignSection(teacher)}
              className="text-xs text-slate-400 hover:text-red-600"
            >
              remove
            </button>
          </div>
        ) : (
          <button
            onClick={() => openAssignPicker(teacher)}
            className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
          >
            Assign Class Teacher
          </button>
        );
      },
    },
    {
      id: "Actions",
      enableSorting: false,
      header: "",
      cell: ({ row }) => {
        const teacher = row.original;
        return (
          <div className="flex items-center gap-3">
            <button
              onClick={() => openEditForm(teacher)}
              className="text-xs font-medium text-slate-500 hover:text-slate-900"
            >
              Edit
            </button>
            <button
              onClick={() => handleDelete(teacher)}
              disabled={deletingId === teacher.id}
              className="text-xs font-medium text-slate-400 hover:text-red-600 disabled:opacity-50"
            >
              {deletingId === teacher.id ? "Deleting..." : "Delete"}
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Teachers</h1>
        <button
          onClick={openForm}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          + Add Teacher
        </button>
      </div>

      <SearchBar placeholder="Search teachers..." />

      <DataTable
        columns={columns}
        data={filtered}
        emptyMessage={teachers.length === 0 ? "No teachers found" : "No teachers match your search"}
      />

      {/* Add/Edit Teacher form */}

      {showForm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              {editingId ? "Edit Teacher" : "Add Teacher"}
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
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Temporary password
                  </label>
                  <input
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                    required
                    minLength={6}
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Employee code
                </label>
                <input
                  type="text"
                  value={employeeCode}
                  onChange={(e) => setEmployeeCode(e.target.value)}
                  placeholder="e.g. EMP-104"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                  required
                />
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

      {/* Assign picker modal */}
      {assigningTeacher && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6">
            <h3 className="text-lg font-semibold text-slate-900">
              Assign a class to {assigningTeacher.user.name}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Only classes without a class-teacher are shown. A teacher can only
              be class-teacher of one class at a time.
            </p>

            <div className="mt-4 max-h-72 overflow-y-auto space-y-2">
              {pickerLoading && (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              )}

              {!pickerLoading && unassignedSections.length === 0 && (
                <div className="text-sm text-slate-500 py-4 text-center">
                  Every class already has a class-teacher assigned.
                </div>
              )}

              {!pickerLoading &&
                unassignedSections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => assignSection(section.id)}
                    className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-4 py-2.5 text-left hover:border-slate-400 hover:bg-slate-50"
                  >
                    <span className="text-sm font-medium text-slate-900">
                      {section.name} ({section.year})
                    </span>
                    <span className="text-xs text-slate-500">
                      {section._count.students} student(s)
                    </span>
                  </button>
                ))}
            </div>

            <button
              onClick={() => setAssigningTeacher(null)}
              className="mt-5 w-full rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
