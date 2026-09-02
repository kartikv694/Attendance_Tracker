"use client";

import { useEffect, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useSearch, matchesSearch } from "@/components/shared/search-context";
import { SearchBar } from "@/components/shared/search-bar";
import { useToast } from "@/components/shared/toast";
import { Skeleton, TableSkeleton } from "@/components/shared/skeleton";
import { DataTable, SortableHeader } from "@/components/ui/data-table";

type Subject = {
  id: string;
  name: string;
  code: string;
};

export default function SubjectsPage() {
  const { query } = useSearch();
  const { showToast } = useToast();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");

  async function loadSubjects() {
    try {
      const res = await fetch(`/api/admin/subjects?page=1&pageSize=100`);
      const data = await res.json();
      setSubjects(data.data || []);
    } catch (err) {
      console.error("Failed to load subjects:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSubjects();
  }, []);

  function openForm() {
    setEditingId(null);
    setName("");
    setCode("");
    setShowForm(true);
  }

  function openEditForm(subject: Subject) {
    setEditingId(subject.id);
    setName(subject.name);
    setCode(subject.code);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const isEditing = editingId !== null;
      const res = await fetch(
        isEditing ? `/api/admin/subjects/${editingId}` : "/api/admin/subjects",
        {
          method: isEditing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, code }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || `Failed to ${isEditing ? "update" : "create"} subject`, "error");
        return;
      }
      showToast(isEditing ? "Subject updated" : "Subject created", "success");
      setShowForm(false);
      setEditingId(null);
      setName("");
      setCode("");
      loadSubjects();
    } catch {
      showToast(`Failed to ${editingId ? "update" : "create"} subject`, "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(subject: Subject) {
    if (!window.confirm(`Delete ${subject.name}? This can't be undone.`)) return;
    setDeletingId(subject.id);
    try {
      const res = await fetch(`/api/admin/subjects/${subject.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.error || "Failed to delete subject", "error");
        return;
      }
      showToast("Subject deleted", "success");
      loadSubjects();
    } catch {
      showToast("Failed to delete subject", "error");
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
        <TableSkeleton rows={6} columns={2} />
      </div>
    );
  }

  const filtered = subjects.filter((subject) => matchesSearch(query, subject.name, subject.code));

  const columns: ColumnDef<Subject>[] = [
    {
      id: "Name",
      accessorFn: (row) => row.name,
      header: ({ column }) => <SortableHeader column={column} label="Name" />,
      cell: ({ row }) => <span className="text-slate-900">{row.original.name}</span>,
    },
    {
      id: "Code",
      accessorFn: (row) => row.code,
      header: ({ column }) => <SortableHeader column={column} label="Code" />,
      cell: ({ row }) => row.original.code,
    },
    {
      id: "Actions",
      enableSorting: false,
      header: "",
      cell: ({ row }) => {
        const subject = row.original;
        return (
          <div className="flex items-center gap-3">
            <button
              onClick={() => openEditForm(subject)}
              className="text-xs font-medium text-slate-500 hover:text-slate-900"
            >
              Edit
            </button>
            <button
              onClick={() => handleDelete(subject)}
              disabled={deletingId === subject.id}
              className="text-xs font-medium text-slate-400 hover:text-red-600 disabled:opacity-50"
            >
              {deletingId === subject.id ? "Deleting..." : "Delete"}
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Subjects</h1>
        <button
          onClick={openForm}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          + Add Subject
        </button>
      </div>

      <SearchBar placeholder="Search subjects..." />

      <DataTable
        columns={columns}
        data={filtered}
        emptyMessage={subjects.length === 0 ? "No subjects found" : "No subjects match your search"}
      />

      {showForm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              {editingId ? "Edit Subject" : "Add Subject"}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Subject name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Data Structures"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Subject code
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="e.g. CS301"
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
    </div>
  );
}
