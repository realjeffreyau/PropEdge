import { NextRequest } from "next/server";
import {
  ALERT_CONDITION_TYPES,
  type AlertConditionType,
} from "@/lib/hooks/alertRules";

export const dynamic = "force-dynamic";

const STORAGE_ERROR =
  "Alert storage is unavailable. Check the configured database before creating or changing rules.";

interface AlertRow {
  id: string;
  name: string;
  marketType: string | null;
  conditionType: string;
  threshold: number;
  active: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  sport: { key: string } | null;
}

interface AlertData {
  userId: string;
  name: string;
  sportId: string;
  marketType: string | null;
  conditionType: AlertConditionType;
  threshold: number;
  active: boolean;
}

interface AlertUpdate {
  name?: string;
  sportId?: string | null;
  marketType?: string | null;
  conditionType?: AlertConditionType;
  threshold?: number;
  active?: boolean;
}

interface AlertDelegate {
  findMany(args: {
    where: { userId: string };
    include: { sport: { select: { key: true } } };
    orderBy: { createdAt: "desc" };
  }): Promise<AlertRow[]>;
  create(args: { data: AlertData }): Promise<AlertRow>;
  updateMany(args: {
    where: { id: string; userId: string };
    data: AlertUpdate;
  }): Promise<{ count: number }>;
  deleteMany(args: { where: { id: string; userId: string } }): Promise<{ count: number }>;
}

interface SportDelegate {
  findUnique(args: { where: { key: string }; select: { id: true } }): Promise<{ id: string } | null>;
}

interface AlertDatabase {
  alert: AlertDelegate;
  sport: SportDelegate;
}

async function getSessionUserId(): Promise<string | null> {
  try {
    const { auth } = await import("@/auth");
    const session = await auth();
    return session?.user?.id ?? null;
  } catch (error) {
    console.warn("/api/alerts authentication or database setup is unavailable:", error);
    throw new Error(STORAGE_ERROR);
  }
}

async function getDatabase(): Promise<AlertDatabase> {
  const { prisma } = await import("@/lib/prisma");
  return prisma as unknown as AlertDatabase;
}

function storageUnavailable() {
  return Response.json({ available: false, error: STORAGE_ERROR, items: [] }, { status: 503 });
}

function isConditionType(value: unknown): value is AlertConditionType {
  return (
    typeof value === "string" &&
    (ALERT_CONDITION_TYPES as readonly string[]).includes(value)
  );
}

function serializeDate(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

function serializeRule(rule: AlertRow) {
  return {
    id: rule.id,
    name: rule.name,
    sportKey: rule.sport?.key ?? null,
    marketKey: rule.marketType,
    conditionType: rule.conditionType,
    threshold: rule.threshold,
    active: rule.active,
    createdAt: serializeDate(rule.createdAt),
    updatedAt: serializeDate(rule.updatedAt),
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

async function resolveSportId(database: AlertDatabase, sportValue: unknown): Promise<string | null> {
  if (typeof sportValue !== "string" || !sportValue.trim()) return null;
  const sport = await database.sport.findUnique({
    where: { key: sportValue.trim() },
    select: { id: true },
  });
  return sport?.id ?? null;
}

function getSportValue(body: Record<string, unknown>) {
  return body.sportKey ?? body.sport;
}

function getMarketValue(body: Record<string, unknown>) {
  return body.marketKey ?? body.market;
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
    const rules = await database.alert.findMany({
      where: { userId },
      include: { sport: { select: { key: true } } },
      orderBy: { createdAt: "desc" },
    });
    return Response.json({ available: true, items: rules.map(serializeRule) });
  } catch (error) {
    console.warn("/api/alerts GET failed:", error);
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
  if (!body) return Response.json({ error: "A JSON rule object is required." }, { status: 400 });

  const name = body.name;
  const conditionType = body.conditionType;
  const threshold = body.threshold;
  const sportValue = getSportValue(body);
  const marketValue = getMarketValue(body);

  if (typeof name !== "string" || !name.trim()) {
    return Response.json({ error: "Rule name is required." }, { status: 400 });
  }
  if (!isConditionType(conditionType)) {
    return Response.json({ error: "Choose a supported alert condition." }, { status: 400 });
  }
  if (typeof threshold !== "number" || !Number.isFinite(threshold)) {
    return Response.json({ error: "A finite numeric threshold is required." }, { status: 400 });
  }
  if (typeof marketValue !== "undefined" && marketValue !== null && typeof marketValue !== "string") {
    return Response.json({ error: "marketKey must be text when provided." }, { status: 400 });
  }

  try {
    const database = await getDatabase();
    const sportId = await resolveSportId(database, sportValue);
    if (!sportId) {
      return Response.json({ error: "Choose a sport that exists in the database." }, { status: 400 });
    }

    const rule = await database.alert.create({
      data: {
        userId,
        name: name.trim().slice(0, 120),
        sportId,
        marketType: typeof marketValue === "string" ? marketValue || null : null,
        conditionType,
        threshold,
        active: typeof body.active === "boolean" ? body.active : true,
      },
    });

    return Response.json({ available: true, item: serializeRule(rule) }, { status: 201 });
  } catch (error) {
    console.warn("/api/alerts POST failed:", error);
    return storageUnavailable();
  }
}

export async function PATCH(request: NextRequest) {
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
  const id = body?.id;
  if (!body || typeof id !== "string" || !id.trim()) {
    return Response.json({ error: "Rule id and a JSON update are required." }, { status: 400 });
  }

  const data: AlertUpdate = {};
  if (Object.prototype.hasOwnProperty.call(body, "name")) {
    if (typeof body.name !== "string" || !body.name.trim()) {
      return Response.json({ error: "Rule name is required." }, { status: 400 });
    }
    data.name = body.name.trim().slice(0, 120);
  }
  if (Object.prototype.hasOwnProperty.call(body, "conditionType")) {
    if (!isConditionType(body.conditionType)) {
      return Response.json({ error: "Choose a supported alert condition." }, { status: 400 });
    }
    data.conditionType = body.conditionType;
  }
  if (Object.prototype.hasOwnProperty.call(body, "threshold")) {
    if (typeof body.threshold !== "number" || !Number.isFinite(body.threshold)) {
      return Response.json({ error: "A finite numeric threshold is required." }, { status: 400 });
    }
    data.threshold = body.threshold;
  }
  if (Object.prototype.hasOwnProperty.call(body, "active")) {
    if (typeof body.active !== "boolean") {
      return Response.json({ error: "active must be boolean." }, { status: 400 });
    }
    data.active = body.active;
  }
  if (Object.prototype.hasOwnProperty.call(body, "marketKey") || Object.prototype.hasOwnProperty.call(body, "market")) {
    const marketValue = getMarketValue(body);
    if (marketValue !== null && typeof marketValue !== "string") {
      return Response.json({ error: "marketKey must be text when provided." }, { status: 400 });
    }
    data.marketType = typeof marketValue === "string" ? marketValue || null : null;
  }

  try {
    const database = await getDatabase();
    if (Object.prototype.hasOwnProperty.call(body, "sportKey") || Object.prototype.hasOwnProperty.call(body, "sport")) {
      const sportId = await resolveSportId(database, getSportValue(body));
      if (!sportId) {
        return Response.json({ error: "Choose a sport that exists in the database." }, { status: 400 });
      }
      data.sportId = sportId;
    }

    if (Object.keys(data).length === 0) {
      return Response.json({ error: "No editable rule fields were provided." }, { status: 400 });
    }

    const result = await database.alert.updateMany({
      where: { id: id.trim(), userId },
      data,
    });
    if (result.count === 0) {
      return Response.json({ error: "Alert rule not found." }, { status: 404 });
    }

    return Response.json({ available: true, updated: true });
  } catch (error) {
    console.warn("/api/alerts PATCH failed:", error);
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

  let id = request.nextUrl.searchParams.get("id");
  if (!id) {
    const body = await readBody(request);
    id = typeof body?.id === "string" ? body.id : null;
  }
  if (!id?.trim()) return Response.json({ error: "Rule id is required." }, { status: 400 });

  try {
    const database = await getDatabase();
    const result = await database.alert.deleteMany({ where: { id: id.trim(), userId } });
    if (result.count === 0) {
      return Response.json({ error: "Alert rule not found." }, { status: 404 });
    }
    return Response.json({ available: true, deleted: true });
  } catch (error) {
    console.warn("/api/alerts DELETE failed:", error);
    return storageUnavailable();
  }
}
