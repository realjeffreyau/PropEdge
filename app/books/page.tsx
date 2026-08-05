"use client";

import { usePageTitle } from "@/lib/hooks/usePageTitle";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { MOCK_DATA_STATUS } from "@/lib/mock/mockData";
import { BOOKMAKERS } from "@/constants/bookmakers";

export default function BooksPage() {
  usePageTitle("Books & Platforms · PropEdge");

  const activeBooks = BOOKMAKERS.filter((b) => b.active);

  return (
    <AppShell isMockMode={MOCK_DATA_STATUS.isMockMode}>
      <div className="flex flex-col gap-1 mb-6">
        <h1 className="text-2xl font-display font-semibold tracking-tight">Books / Platforms</h1>
        <p className="text-sm text-muted-foreground">Select a book or platform to see its best available props</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {activeBooks.map((book) => (
          <Link
            key={book.key}
            href={`/books/${book.key}`}
            className="glass-card p-4 hover:border-amber-500/30 transition-all group"
          >
            <div className="flex items-start justify-between mb-2">
              <span className="font-display font-semibold text-sm group-hover:text-amber-400 transition-colors">
                {book.label}
              </span>
              <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                {book.type === "DFS" ? "DFS" : "SB"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {book.supportsProps ? "Props available" : "Main markets only"}
            </p>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
