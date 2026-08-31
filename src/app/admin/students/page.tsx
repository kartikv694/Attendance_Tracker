"use client";

import { Pagination } from "@/components/shared/pagination";
import { useEffect, useState } from "react";
import { useSearch, matchesSearch } from "@/components/shared/search-context";
import { useToast } from "@/components/shared/toast";
import { Skeleton, TableSkeleton } from "@/components/shared/skeleton";

type Student = {
  id: string;
  user: { name: string; email: string };
  rollNumber: string;
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

  useEffect(() => {
    setPage(1);
  }, [query]);

  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [sectionId, setSectionId] = useState("");

  async function loadStudents() {
    try {
      // pageSize bumped up so the search box below can filter across the
      // whole roster client-side instead of just the current page
      const res = await fetch(`/api/admin/students?page=1&pageSize=100`);
      const data = await res.json();
      setStudents(data.data || []);
    } catch (err) {
      console.error("Failed to load students:", err);
    } finally {
      setLoading(false);
    }
  }

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
    }
  }

  useEffect(() => {
    loadStudents();
    loadSections();
  }, []);

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

      setSectionId(freshSections[0].id);
      setShowForm(true);
    } catch (err) {
      console.error("Failed to load sections:", err);
      showToast("Failed to load sections. Please try again.", "error");
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, rollNumber, sectionId }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Failed to create student", "error");
        return;
      }
      showToast("Student account created", "success");
      setShowForm(false);
      setName("");
      setEmail("");
      setPassword("");
      setRollNumber("");
      loadStudents();
    } catch {
      showToast("Failed to create student", "error");
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
        <TableSkeleton rows={7} columns={4} />
      </div>
    );
  }

  const filtered = students.filter((student) =>
    matchesSearch(query, student.user.name, student.rollNumber, student.user.email, student.section.name)
  );

  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

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

      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Name</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                Roll Number
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Email</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Section</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {paginated.map((student) => (
              <tr key={student.id} className="hover:bg-slate-50">
                <td className="px-6 py-3 text-sm text-slate-900">{student.user.name}</td>
                <td className="px-6 py-3 text-sm text-slate-600">{student.rollNumber}</td>
                <td className="px-6 py-3 text-sm text-slate-600">{student.user.email}</td>
                <td className="px-6 py-3 text-sm text-slate-600">
                  {student.section.name} ({student.section.year})
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-8 text-slate-500">
          {students.length === 0 ? "No students found" : "No students match your search"}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} total={filtered.length} pageSize={pageSize} itemLabel="students" onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} />

      {showForm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Add Student</h3>
            <form onSubmit={handleCreate} className="space-y-4">
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
