"use client";

import { use, useState, useMemo } from "react";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { SportTabs } from "@/components/dashboard/SportTabs";
import { PropRankTable } from "@/components/dashboard/PropRankTable";
import { getMockProps, MOCK_DATA_STATUS } from "@/lib/mock/mockData";
import { getBookmakerByKey } from "@/constants/bookmakers";
import { usePageTitle } from "@/lib/hooks/usePageTitle";

interface BookPageProps {
  params: Promise<{ bookmakerKey: string }>;
}

export default function BookPage({ params }: BookPageProps) {
  const { bookmakerKey } = use(params);
  const [sportKey, setSportKey] = useState("basketball_nba");

  const book = getBookmakerByKey(bookmakerKey);
  usePageTitle(`${book?.label ?? "Book"} · PropEdge`);

  const props = useMemo(() => {
    const all = getMockProps(sportKey);
    return all
      .filter((p) => p.bookOdds.some((b) => b.bookmakerKey === bookmakerKey))
      .sort((a, b) => b.scores.confidenceScore.value - a.scores.confidenceScore.value);
  }, [sportKey, bookmakerKey]);

  return (
    <AppShell isMockMode={MOCK_DATA_STATUS.isMockMode} lastRefreshed={MOCK_DATA_STATUS.lastRefreshed}>
      <Link
        href="/books"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-5 transition-colors"
      >
        <ArrowLeftIcon className="w-3 h-3" />
        All Books
      </Link>

      <div className="flex flex-col gap-1 mb-6">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-display font-semibold tracking-tight">
            {book?.label ?? bookmakerKey}
          </h1>
          {book && (
            <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">
              {book.type === "DFS" ? "DFS / Pick'em" : "Sportsbook"}
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Best available {sportKey === "basketball_nba" ? "NBA" : "WNBA"} props at {book?.label ?? bookmakerKey}
        </p>
      </div>

      <div className="mb-6">
        <SportTabs value={sportKey} onChange={setSportKey} />
      </div>

      <PropRankTable props={props} selectedBookKey={bookmakerKey} />
    </AppShell>
  );
}
