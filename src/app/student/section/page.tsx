"use client";

import { Pagination } from "@/components/shared/pagination";
import { useEffect, useState } from "react";
import { useSearch, matchesSearch } from "@/components/shared/search-context";
import { Skeleton, TableSkeleton } from "@/components/shared/skeleton";

type Classmate = {
  id: string;
  rollNumber: string;
  user: { name: string; email: string };
};

type SectionData = {
  section: { name: string; year: number };
  students: Classmate[];
};

export default function StudentSectionPage() {
  const { query } = useSearch();
  const [data, setData] = useState<SectionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);

  useEffect(() => {
    setPage(1);
  }, [query]);


  useEffect(() => {
    async function loadSection() {
      try {
        const res = await fetch("/api/student/section");
        if (res.ok) setData(await res.json());
      } catch (err) {
        console.error("Failed to load section:", err);
      } finally {
        setLoading(false);
      }
    }
    loadSection();
  }, []);

  if (loading) {
    return (
      <div>
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-64 mb-6" />
        <TableSkeleton rows={6} columns={3} />
      </div>
    );
  }
  if (!data) return <div>Failed to load your section</div>;

  // this page only ever shows the ONE section the logged-in student
  // actually belongs to - every row below is a classmate in that same class
  const filtered = data.students.filter((student) =>
    matchesSearch(query, student.user.name, student.rollNumber, student.user.email)
  );

  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">My Section</h1>
        <p className="text-sm text-slate-600 mt-1">
          {data.section.name} ({data.section.year}) &middot; {data.students.length} student
          {data.students.length === 1 ? "" : "s"}
        </p>
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
            </tr>
          </thead>
          <tbody className="divide-y">
            {paginated.map((student) => (
              <tr key={student.id} className="hover:bg-slate-50">
                <td className="px-6 py-3 text-sm text-slate-900">{student.user.name}</td>
                <td className="px-6 py-3 text-sm text-slate-600">{student.rollNumber}</td>
                <td className="px-6 py-3 text-sm text-slate-600">{student.user.email}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-8 text-slate-500">
          {data.students.length === 0 ? "No classmates found" : "No students match your search"}
        </div>
      )}
      <Pagination page={page} totalPages={totalPages} total={filtered.length} pageSize={pageSize} itemLabel="students" onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} />

    </div>
  );
}
