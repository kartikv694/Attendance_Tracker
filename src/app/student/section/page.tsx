"use client";

import { useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { SearchBar } from "@/components/shared/search-bar";
import { useSearch, matchesSearch } from "@/components/shared/search-context";
import { Skeleton, TableSkeleton } from "@/components/shared/skeleton";
import { DataTable, SortableHeader } from "@/components/ui/data-table";

type Classmate = {
  id: string;
  rollNumber: string;
  user: { name: string; email: string };
};

type SectionData = {
  section: { name: string; year: number };
  students: Classmate[];
};

const columns: ColumnDef<Classmate, unknown>[] = [
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
];

export default function StudentSectionPage() {
  const { query } = useSearch();
  const [data, setData] = useState<SectionData | null>(null);
  const [loading, setLoading] = useState(true);

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

  // this page only ever shows the ONE section the logged-in student
  // actually belongs to - every row below is a classmate in that same class
  const filtered = useMemo(
    () =>
      (data?.students ?? []).filter((student) =>
        matchesSearch(query, student.user.name, student.rollNumber, student.user.email)
      ),
    [data, query]
  );

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

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">My Section</h1>
        <p className="text-sm text-slate-600 mt-1">
          {data.section.name} ({data.section.year}) &middot; {data.students.length} student
          {data.students.length === 1 ? "" : "s"}
        </p>
      </div>

      <SearchBar placeholder="Search students by name, roll number or email..." />

      <DataTable
        columns={columns}
        data={filtered}
        emptyMessage={data.students.length === 0 ? "No classmates found" : "No students match your search"}
      />
    </div>
  );
}
