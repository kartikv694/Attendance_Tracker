"use client";

import { Pagination } from "@/components/shared/pagination";
import { useEffect, useState } from "react";
import { useSearch, matchesSearch } from "@/components/shared/search-context";
import { SearchBar } from "@/components/shared/search-bar";
import { useToast } from "@/components/shared/toast";
import { Skeleton, TableSkeleton } from "@/components/shared/skeleton";

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
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);

  useEffect(() => {
    setPage(1);
  }, [query]);

  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

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

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, code }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Failed to create subject", "error");
        return;
      }
      showToast("Subject created", "success");
      setShowForm(false);
      setName("");
      setCode("");
      loadSubjects();
    } catch {
      showToast("Failed to create subject", "error");
    } finally {
      setSaving(false);
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
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Subjects</h1>
        <button
          onClick={() => setShowForm(true)}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          + Add Subject
        </button>
      </div>

      <SearchBar placeholder="Search subjects..." />

      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Name</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Code</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {paginated.map((subject) => (
              <tr key={subject.id} className="hover:bg-slate-50">
                <td className="px-6 py-3 text-sm text-slate-900">{subject.name}</td>
                <td className="px-6 py-3 text-sm text-slate-600">{subject.code}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-8 text-slate-500">
          {subjects.length === 0 ? "No subjects found" : "No subjects match your search"}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} total={filtered.length} pageSize={pageSize} itemLabel="subjects" onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} />

      {showForm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Add Subject</h3>
            <form onSubmit={handleCreate} className="space-y-4">
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
                  {saving ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
