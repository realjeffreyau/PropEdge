import { BOOKMAKERS } from "@/constants/bookmakers";
import type { BookOdds, Prop } from "@/types";

export interface OddsMatrixBook {
  bookmakerKey: string;
  bookmakerLabel: string;
  bookmakerType: BookOdds["bookmakerType"];
}

export interface OddsMatrixCell {
  bookmakerKey: string;
  oddsAmerican: number | null;
  line: number | null;
  bookmakerType: BookOdds["bookmakerType"] | null;
  lineDiffers: boolean;
  isBest: boolean;
}

export interface OddsMatrixRow {
  key: string;
  prop: Prop;
  cells: Record<string, OddsMatrixCell>;
}

export interface OddsMatrix {
  books: OddsMatrixBook[];
  rows: OddsMatrixRow[];
}

/** Convert the feed's per-book odds into a row/column comparison matrix. */
export function buildOddsMatrix(props: Prop[]): OddsMatrix {
  const bookMap = new Map<string, OddsMatrixBook>();

  for (const prop of props) {
    for (const book of prop.bookOdds) {
      if (!bookMap.has(book.bookmakerKey)) {
        bookMap.set(book.bookmakerKey, {
          bookmakerKey: book.bookmakerKey,
          bookmakerLabel: book.bookmakerLabel,
          bookmakerType: book.bookmakerType,
        });
      }
    }
  }

  const configuredOrder = new Map(BOOKMAKERS.map((book) => [book.key, book.displayOrder]));
  const books = Array.from(bookMap.values()).sort(
    (left, right) =>
      (configuredOrder.get(left.bookmakerKey) ?? Number.MAX_SAFE_INTEGER) -
        (configuredOrder.get(right.bookmakerKey) ?? Number.MAX_SAFE_INTEGER) ||
      left.bookmakerLabel.localeCompare(right.bookmakerLabel)
  );

  const rows = props.map((prop) => {
    const byBook = new Map(prop.bookOdds.map((book) => [book.bookmakerKey, book]));
    const available = prop.bookOdds.filter(
      (book) => Number.isFinite(book.oddsDecimal) && Number.isFinite(book.oddsAmerican) && book.oddsAmerican !== 0
    );
    const bestDecimal = available.length
      ? Math.max(...available.map((book) => book.oddsDecimal))
      : null;

    const cells = Object.fromEntries(
      books.map((book) => {
        const odds = byBook.get(book.bookmakerKey);
        const line = odds?.line ?? null;
        const lineDiffers =
          line !== null && Number.isFinite(prop.line) && Math.abs(line - prop.line) > 0.0001;

        return [
          book.bookmakerKey,
          {
            bookmakerKey: book.bookmakerKey,
            oddsAmerican: odds && odds.oddsAmerican !== 0 ? odds.oddsAmerican : null,
            line,
            bookmakerType: odds?.bookmakerType ?? null,
            lineDiffers,
            isBest: Boolean(
              odds &&
                bestDecimal !== null &&
                Number.isFinite(odds.oddsDecimal) &&
                odds.oddsDecimal === bestDecimal
            ),
          } satisfies OddsMatrixCell,
        ];
      })
    ) as Record<string, OddsMatrixCell>;

    return { key: prop.id, prop, cells };
  });

  return { books, rows };
}
