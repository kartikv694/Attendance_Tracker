"use client";

import { useEffect, useState } from "react";
import { useSearch, matchesSearch } from "@/components/shared/search-context";
import { useToast } from "@/components/shared/toast";

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
  const [saving, setSaving] = useState(false);

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

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, year: Number(year) }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Failed to create section", "error");
        return;
      }
      showToast("Section created", "success");
      setShowForm(false);
      setName("");
      await loadSections();
    } catch {
      showToast("Failed to create section", "error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div>Loading...</div>;

  const filtered = sections.filter((section) => matchesSearch(query, section.name, section.year));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Sections</h1>
        <button
          onClick={() => setShowForm(true)}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          + Add Section
        </button>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Name</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Year</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Students</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map((section) => (
              <tr key={section.id} className="hover:bg-slate-50">
                <td className="px-6 py-3 text-sm text-slate-900">{section.name}</td>
                <td className="px-6 py-3 text-sm text-slate-600">{section.year}</td>
                <td className="px-6 py-3 text-sm text-slate-600">{section._count.students}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-8 text-slate-500">
          {sections.length === 0 ? "No sections found" : "No sections match your search"}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Add Section</h3>
            <form onSubmit={handleCreate} className="space-y-4">
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
