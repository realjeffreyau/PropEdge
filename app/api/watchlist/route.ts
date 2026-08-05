import { Prisma } from "@/lib/generated/prisma/client";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

const STORAGE_ERROR =
  "Watchlist storage is unavailable. Add the SavedProp table to the configured database before saving props.";

interface SavedPropRow {
  id: string;
  propId: string;
  sportKey: string;
  note: string | null;
  snapshot: unknown;
  createdAt: Date | string;
}

interface RawDatabase {
  $queryRaw<T>(query: Prisma.Sql): Promise<T>;
  $executeRaw(query: Prisma.Sql): Promise<number>;
}

async function getSessionUserId(): Promise<string | null> {
  try {
    const { auth } = await import("@/auth");
    const session = await auth();
    return session?.user?.id ?? null;
  } catch (error) {
    console.warn("/api/watchlist authentication or database setup is unavailable:", error);
    throw new Error(STORAGE_ERROR);
  }
}

async function getDatabase(): Promise<RawDatabase> {
  const { prisma } = await import("@/lib/prisma");
  return prisma as unknown as RawDatabase;
}

function storageUnavailable() {
  return Response.json({ available: false, error: STORAGE_ERROR, items: [] }, { status: 503 });
}

function serializeItem(row: SavedPropRow) {
  return {
    id: row.id,
    propId: row.propId,
    sportKey: row.sportKey,
    note: row.note,
    snapshot: row.snapshot,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

async function readBody(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await request.json();
    return isObject(body) ? body : null;
  } catch {
    return null;
  }
}

export async function GET() {
  let userId: string | null;
  try {
    userId = await getSessionUserId();
  } catch {
    return storageUnavailable();
  }

  if (!userId) {
    return Response.json({ error: "Authentication required.", items: [] }, { status: 401 });
  }

  try {
    const database = await getDatabase();
    const rows = await database.$queryRaw<SavedPropRow[]>(Prisma.sql`
      SELECT "id", "propId", "sportKey", "note", "snapshot", "createdAt"
      FROM "saved_props"
      WHERE "userId" = ${userId}
      ORDER BY "createdAt" DESC
    `);

    return Response.json({ available: true, items: rows.map(serializeItem) });
  } catch (error) {
    console.warn("/api/watchlist GET failed:", error);
    return storageUnavailable();
  }
}

export async function POST(request: NextRequest) {
  let userId: string | null;
  try {
    userId = await getSessionUserId();
  } catch {
    return storageUnavailable();
  }

  if (!userId) {
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }

  const body = await readBody(request);
  const propId = body?.propId;
  const sportKey = body?.sportKey;
  const snapshot = body?.snapshot;
  const note = body?.note;

  if (
    typeof propId !== "string" ||
    !propId.trim() ||
    typeof sportKey !== "string" ||
    !sportKey.trim() ||
    !isObject(snapshot)
  ) {
    return Response.json(
      { error: "propId, sportKey, and a prop snapshot are required." },
      { status: 400 }
    );
  }

  if (note !== undefined && note !== null && typeof note !== "string") {
    return Response.json({ error: "note must be text when provided." }, { status: 400 });
  }

  try {
    const database = await getDatabase();
    const rows = await database.$queryRaw<SavedPropRow[]>(Prisma.sql`
      INSERT INTO "saved_props" ("id", "userId", "propId", "sportKey", "note", "snapshot")
      VALUES (${crypto.randomUUID()}, ${userId}, ${propId.trim()}, ${sportKey.trim()},
        ${typeof note === "string" ? note.trim().slice(0, 500) || null : null},
        ${JSON.stringify(snapshot)}::jsonb)
      ON CONFLICT ("userId", "propId") DO UPDATE SET
        "sportKey" = EXCLUDED."sportKey",
        "note" = EXCLUDED."note",
        "snapshot" = EXCLUDED."snapshot"
      RETURNING "id", "propId", "sportKey", "note", "snapshot", "createdAt"
    `);

    return Response.json({ available: true, item: serializeItem(rows[0]) });
  } catch (error) {
    console.warn("/api/watchlist POST failed:", error);
    return storageUnavailable();
  }
}

export async function DELETE(request: NextRequest) {
  let userId: string | null;
  try {
    userId = await getSessionUserId();
  } catch {
    return storageUnavailable();
  }

  if (!userId) {
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }

  let propId = request.nextUrl.searchParams.get("propId");
  if (!propId) {
    const body = await readBody(request);
    propId = typeof body?.propId === "string" ? body.propId : null;
  }

  if (!propId?.trim()) {
    return Response.json({ error: "propId is required." }, { status: 400 });
  }

  try {
    const database = await getDatabase();
    const deleted = await database.$executeRaw(Prisma.sql`
      DELETE FROM "saved_props"
      WHERE "userId" = ${userId} AND "propId" = ${propId.trim()}
    `);

    return Response.json({ available: true, deleted });
  } catch (error) {
    console.warn("/api/watchlist DELETE failed:", error);
    return storageUnavailable();
  }
}
