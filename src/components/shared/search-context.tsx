"use client";

// Small context that backs the search bar in the top navbar. Any page can
// call useSearch() to read the current query and filter whatever list it's
// rendering (students, teachers, sections...), without every page having to
// re-implement its own search input. The query resets automatically on
// route change so it doesn't carry over stale text from one page to another.

import { createContext, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type SearchContextValue = {
  query: string;
  setQuery: (query: string) => void;
};

const SearchContext = createContext<SearchContextValue | null>(null);

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [query, setQuery] = useState("");
  const pathname = usePathname();

  // clear the search box whenever the admin/teacher/student navigates to a
  // different page - a leftover query silently hiding rows on a new page
  // would be confusing
  useEffect(() => {
    setQuery("");
  }, [pathname]);

  return (
    <SearchContext.Provider value={{ query, setQuery }}>{children}</SearchContext.Provider>
  );
}

export function useSearch() {
  const ctx = useContext(SearchContext);
  if (!ctx) throw new Error("useSearch must be used inside SearchProvider");
  return ctx;
}

// Small helper used by list pages: does this query match any of the given
// fields (case-insensitive, substring match)?
export function matchesSearch(query: string, ...fields: (string | number | null | undefined)[]) {
  if (!query.trim()) return true;
  const q = query.trim().toLowerCase();
  return fields.some((field) => field !== null && field !== undefined && String(field).toLowerCase().includes(q));
}
