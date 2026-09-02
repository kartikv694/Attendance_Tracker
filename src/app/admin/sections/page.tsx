"use client";

import { useEffect, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useSearch, matchesSearch } from "@/components/shared/search-context";
import { SearchBar } from "@/components/shared/search-bar";
import { useToast } from "@/components/shared/toast";
import { Skeleton, TableSkeleton } from "@/components/shared/skeleton";
import { DataTable, SortableHeader } from "@/components/ui/data-table";

type Section = {
  id: string;
  name: string;
  year: number;
  _count: { students: number };
};

export default function SectionsPage() {
  const { query } = useSearch();
  const { showToast } = useToast();
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [year, setYear] = useState(new Date().getFullYear().toString());

  async function loadSections() {
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
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSections();
  }, []);

  function openForm() {
    setEditingId(null);
    setName("");
    setYear(new Date().getFullYear().toString());
    setShowForm(true);
  }

  function openEditForm(section: Section) {
    setEditingId(section.id);
    setName(section.name);
    setYear(section.year.toString());
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const isEditing = editingId !== null;
      const res = await fetch(
        isEditing ? `/api/admin/sections/${editingId}` : "/api/admin/sections",
        {
          method: isEditing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, year: Number(year) }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || `Failed to ${isEditing ? "update" : "create"} section`, "error");
        return;
      }
      showToast(isEditing ? "Section updated" : "Section created", "success");
      setShowForm(false);
      setEditingId(null);
      setName("");
      await loadSections();
    } catch {
      showToast(`Failed to ${editingId ? "update" : "create"} section`, "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(section: Section) {
    if (!window.confirm(`Delete ${section.name} (${section.year})? This can't be undone.`)) return;
    setDeletingId(section.id);
    try {
      const res = await fetch(`/api/admin/sections/${section.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.error || "Failed to delete section", "error");
        return;
      }
      showToast("Section deleted", "success");
      await loadSections();
    } catch {
      showToast("Failed to delete section", "error");
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
        <TableSkeleton rows={6} columns={3} />
      </div>
    );
  }

  const filtered = sections.filter((section) => matchesSearch(query, section.name, section.year));

  const columns: ColumnDef<Section>[] = [
    {
      id: "Name",
      accessorFn: (row) => row.name,
      header: ({ column }) => <SortableHeader column={column} label="Name" />,
      cell: ({ row }) => <span className="text-slate-900">{row.original.name}</span>,
    },
    {
      id: "Year",
      accessorFn: (row) => row.year,
      header: ({ column }) => <SortableHeader column={column} label="Year" />,
      cell: ({ row }) => row.original.year,
    },
    {
      id: "Students",
      accessorFn: (row) => row._count.students,
      header: ({ column }) => <SortableHeader column={column} label="Students" />,
      cell: ({ row }) => row.original._count.students,
    },
    {
      id: "Actions",
      enableSorting: false,
      header: "",
      cell: ({ row }) => {
        const section = row.original;
        return (
          <div className="flex items-center gap-3">
            <button
              onClick={() => openEditForm(section)}
              className="text-xs font-medium text-slate-500 hover:text-slate-900"
            >
              Edit
            </button>
            <button
              onClick={() => handleDelete(section)}
              disabled={deletingId === section.id}
              className="text-xs font-medium text-slate-400 hover:text-red-600 disabled:opacity-50"
            >
              {deletingId === section.id ? "Deleting..." : "Delete"}
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Sections</h1>
        <button
          onClick={openForm}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          + Add Section
        </button>
      </div>

      <SearchBar placeholder="Search sections..." />

      <DataTable
        columns={columns}
        data={filtered}
        emptyMessage={sections.length === 0 ? "No sections found" : "No sections match your search"}
      />

      {showForm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              {editingId ? "Edit Section" : "Add Section"}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Section name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. CSE-3A"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Batch year
                </label>
                <input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
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
