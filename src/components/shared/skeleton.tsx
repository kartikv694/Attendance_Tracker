// Reusable "skeleton" placeholders shown while a page's data is loading,
// shaped to roughly match the content that will replace them once the
// fetch resolves. Swapping a bare "Loading..." string for one of these
// keeps the layout stable and gives the user something to look at.

type ClassName = { className?: string };

/** Base pulsing block. Compose className to control size/shape. */
export function Skeleton({ className = "" }: ClassName) {
  return <div className={`animate-pulse rounded-md bg-slate-200 ${className}`} />;
}

/** A bordered table-shaped skeleton: header row + N body rows. */
export function TableSkeleton({
  rows = 6,
  columns = 4,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-200 bg-slate-50 px-6 py-3">
        <div className="flex gap-6">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} className="h-4 flex-1" />
          ))}
        </div>
      </div>
      <div className="divide-y divide-slate-100">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex gap-6 px-6 py-4">
            {Array.from({ length: columns }).map((_, c) => (
              <Skeleton
                key={c}
                className={`h-4 flex-1 ${c === 0 ? "max-w-[40%]" : ""}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Grid of small stat cards, e.g. dashboard summary counters. */
export function StatCardsSkeleton({
  count = 4,
  columnsClassName = "grid-cols-2 sm:grid-cols-4",
}: {
  count?: number;
  columnsClassName?: string;
}) {
  return (
    <div className={`mb-8 grid gap-4 ${columnsClassName}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-lg border border-slate-200 bg-white p-6">
          <Skeleton className="mb-3 h-8 w-16" />
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </div>
  );
}

/** Grid of larger content cards, e.g. assigned classes, session cards. */
export function CardGridSkeleton({
  count = 4,
  columnsClassName = "md:grid-cols-2",
}: {
  count?: number;
  columnsClassName?: string;
}) {
  return (
    <div className={`grid gap-3 ${columnsClassName}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-2 rounded-lg border border-slate-200 p-4">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      ))}
    </div>
  );
}

/** Vertical list of rows, e.g. active sessions, subject breakdown. */
export function ListRowsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-between rounded-lg border border-slate-200 p-4"
        >
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/4" />
          </div>
          <Skeleton className="h-8 w-20 shrink-0" />
        </div>
      ))}
    </div>
  );
}

/** Labelled progress-bar rows, for statistics-style breakdowns. */
export function BarsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-5">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i}>
          <div className="mb-2 flex items-center justify-between">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="h-2.5 w-full rounded-full" />
        </div>
      ))}
    </div>
  );
}

/** A row of form-field-shaped placeholders. */
export function FormFieldsSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-4">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-1.5">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-9 w-full" />
        </div>
      ))}
    </div>
  );
}

/** N day-columns of a weekly timetable, each with a couple of entries. */
export function WeekGridSkeleton({
  days = 5,
  entriesPerDay = 2,
}: {
  days?: number;
  entriesPerDay?: number;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-5">
      {Array.from({ length: days }).map((_, d) => (
        <div key={d} className="space-y-2 rounded-lg border border-slate-200 p-3">
          <Skeleton className="mb-2 h-4 w-20" />
          {Array.from({ length: entriesPerDay }).map((_, e) => (
            <Skeleton key={e} className="h-12 w-full" />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Large percentage/summary card, e.g. the student dashboard headline. */
export function SummaryCardSkeleton() {
  return (
    <div className="mb-8 rounded-lg border border-slate-200 bg-slate-50 p-8">
      <div className="flex flex-col items-center gap-3">
        <Skeleton className="h-14 w-32" />
        <Skeleton className="h-3 w-48" />
        <Skeleton className="h-3 w-40" />
      </div>
    </div>
  );
}

/** Avatar + a couple of labelled fields, for the profile modal. */
export function ProfileSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3">
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-14" />
          <Skeleton className="h-4 w-28" />
        </div>
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      <Skeleton className="h-16 w-full" />
    </div>
  );
}

/** Full sidebar + top bar + content shell, shown while the session/auth
 *  check on the dashboard layout is in flight (replaces the old bare
 *  spinner so the whole app doesn't flash blank on every navigation). */
export function AppShellSkeleton() {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <div className="flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white p-6">
        <div className="mb-8 space-y-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
        <div className="flex-1 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
        <Skeleton className="h-14 w-full" />
      </div>
      <div className="flex flex-1 flex-col">
        <div className="flex h-16 shrink-0 items-center border-b border-slate-200 bg-white px-8">
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="flex-1 space-y-6 p-8">
          <Skeleton className="h-8 w-56" />
          <StatCardsSkeleton count={4} />
          <TableSkeleton rows={5} columns={4} />
        </div>
      </div>
    </div>
  );
}
