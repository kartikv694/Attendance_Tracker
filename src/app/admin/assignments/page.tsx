"use client";

// Closes the loop between Sections/Subjects/Teachers: this is where an
// admin says "this teacher teaches this subject to this section". Without
// a row here, a teacher has nothing to create an attendance session for -
// AttendanceSession always attaches to a SubjectSection, not a bare subject.

import { useEffect, useState } from "react";
import { useSearch, matchesSearch } from "@/components/shared/search-context";
import { useToast } from "@/components/shared/toast";

type Assignment = {
  id: string;
  subject: { name: string; code: string };
  section: { name: string; year: number };
  teacher: { user: { name: string } };
};

type Option = { id: string; label: string };

export default function AssignmentsPage() {
  const { query } = useSearch();
  const { showToast } = useToast();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [subjects, setSubjects] = useState<Option[]>([]);
  const [sections, setSections] = useState<Option[]>([]);
  const [teachers, setTeachers] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [subjectId, setSubjectId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [teacherId, setTeacherId] = useState("");

  async function loadAssignments() {
    try {
      const res = await fetch("/api/admin/subject-sections");
      const data = await res.json();
      setAssignments(data.data || []);
    } catch (err) {
      console.error("Failed to load assignments:", err);
    } finally {
      setLoading(false);
    }
  }

  async function loadOptions() {
    try {
      const [subjectsRes, sectionsRes, teachersRes] = await Promise.all([
        fetch("/api/admin/subjects?page=1&pagesize=100"),
        fetch("/api/admin/sections?page=1&pagesize=100"),
        fetch("/api/admin/teachers?page=1&pagesize=100"),
      ]);
      const subjectsData = await subjectsRes.json();
      const sectionsData = await sectionsRes.json();
      const teachersData = await teachersRes.json();

      setSubjects(
        (subjectsData.data || []).map((s: { id: string; name: string; code: string }) => ({
          id: s.id,
          label: `${s.code} - ${s.name}`,
        }))
      );
      setSections(
        (sectionsData.data || []).map((s: { id: string; name: string; year: number }) => ({
          id: s.id,
          label: `${s.name} (${s.year})`,
        }))
      );
      setTeachers(
        (teachersData.data || []).map(
          (t: { id: string; user: { name: string } }) => ({ id: t.id, label: t.user.name })
        )
      );
    } catch (err) {
      console.error("Failed to load options:", err);
    }
  }

  useEffect(() => {
    loadAssignments();
    loadOptions();
  }, []);

  function openForm() {
    if (subjects.length === 0 || sections.length === 0 || teachers.length === 0) {
      showToast("You need at least one subject, section, and teacher first", "error");
      return;
    }
    setSubjectId(subjects[0].id);
    setSectionId(sections[0].id);
    setTeacherId(teachers[0].id);
    setShowForm(true);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/subject-sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjectId, sectionId, teacherId }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Failed to create assignment", "error");
        return;
      }
      showToast("Teacher assigned to this class", "success");
      setShowForm(false);
      loadAssignments();
    } catch {
      showToast("Failed to create assignment", "error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div>Loading...</div>;

  const filtered = assignments.filter((a) =>
    matchesSearch(query, a.subject.name, a.subject.code, a.section.name, a.teacher.user.name)
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Assignments</h1>
          <p className="text-sm text-slate-500 mt-1">
            Which teacher teaches which subject to which class.
          </p>
        </div>
        <button
          onClick={openForm}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          + Add Assignment
        </button>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Subject</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Section</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Teacher</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map((a) => (
              <tr key={a.id} className="hover:bg-slate-50">
                <td className="px-6 py-3 text-sm text-slate-900">
                  {a.subject.code} - {a.subject.name}
                </td>
                <td className="px-6 py-3 text-sm text-slate-600">
                  {a.section.name} ({a.section.year})
                </td>
                <td className="px-6 py-3 text-sm text-slate-600">{a.teacher.user.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-8 text-slate-500">
          {assignments.length === 0 ? "No assignments yet" : "No assignments match your search"}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Add Assignment</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Subject</label>
                <select
                  value={subjectId}
                  onChange={(e) => setSubjectId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Section</label>
                <select
                  value={sectionId}
                  onChange={(e) => setSectionId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                >
                  {sections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Teacher</label>
                <select
                  value={teacherId}
                  onChange={(e) => setTeacherId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                >
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
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
