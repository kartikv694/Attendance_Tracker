"use client";

import { useEffect, useState } from "react";
import { useSearch, matchesSearch } from "@/components/shared/search-context";
import { useToast } from "@/components/shared/toast";

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

  // Add Teacher form
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
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

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/teachers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, employeeCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Failed to create teacher", "error");
        return;
      }
      showToast("Teacher account created", "success");
      setShowForm(false);
      setName("");
      setEmail("");
      setPassword("");
      setEmployeeCode("");
      loadTeachers();
    } catch {
      showToast("Failed to create teacher", "error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div>Loading...</div>;

  const filtered = teachers.filter((teacher) =>
    matchesSearch(query, teacher.user.name, teacher.employeeCode, teacher.user.email)
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Teachers</h1>
        <button
          onClick={() => setShowForm(true)}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          + Add Teacher
        </button>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Name</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                Employee Code
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Email</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                Assigned Class
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map((teacher) => (
              <tr key={teacher.id} className="hover:bg-slate-50">
                <td className="px-6 py-3 text-sm text-slate-900">{teacher.user.name}</td>
                <td className="px-6 py-3 text-sm text-slate-600">{teacher.employeeCode}</td>
                <td className="px-6 py-3 text-sm text-slate-600">{teacher.user.email}</td>
                <td className="px-6 py-3 text-sm">
                  {teacher.classSection ? (
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
                      Assign
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-8 text-slate-500">
          {teachers.length === 0 ? "No teachers found" : "No teachers match your search"}
        </div>
      )}

      {/* Add Teacher form */}
      {showForm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Add Teacher</h3>
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
              {pickerLoading && <div className="text-sm text-slate-500">Loading...</div>}

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
