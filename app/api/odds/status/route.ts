import { auth } from "@/auth";
import { getOddsApiProvider } from "@/lib/odds/theOddsApiProvider";

interface RefreshLogRecord {
  id: string;
  sportKey: string;
  status: string;
  creditsUsed: number | null;
  startedAt: Date;
  finishedAt: Date | null;
  errorMessage: string | null;
}

const refreshLogFields = {
  id: true,
  sportKey: true,
  status: true,
  creditsUsed: true,
  startedAt: true,
  finishedAt: true,
  errorMessage: true,
} as const;

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }

  const isAdmin = session.user.role === "ADMIN";
  let logs: RefreshLogRecord[] = [];
  let todayLogs: RefreshLogRecord[] = [];

  let prismaClient: typeof import("@/lib/prisma")["prisma"] | null = null;
  try {
    ({ prisma: prismaClient } = await import("@/lib/prisma"));
  } catch (error) {
    console.warn("/api/odds/status database unavailable; returning status without logs:", error);
  }

  if (prismaClient) {
    try {
      logs = await prismaClient.refreshLog.findMany({
        orderBy: { startedAt: "desc" },
        take: 10,
        select: refreshLogFields,
      });
    } catch (error) {
      console.warn("/api/odds/status could not read refresh logs:", error);
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    try {
      todayLogs = await prismaClient.refreshLog.findMany({
        where: { startedAt: { gte: todayStart } },
        select: refreshLogFields,
      });
    } catch (error) {
      console.warn("/api/odds/status could not read today's refresh logs:", error);
    }
  }

  const creditsUsedToday = todayLogs.reduce((sum, log) => sum + (log.creditsUsed ?? 0), 0);
  const creditsRemainingLive = isAdmin
    ? getOddsApiProvider().usage.requestsRemaining
    : null;

  return Response.json({
    creditsUsedToday,
    creditsRemainingLive,
    recentLogs: logs.map((log) => ({
      id: log.id,
      sportKey: log.sportKey,
      status: log.status,
      creditsUsed: log.creditsUsed,
      startedAt: log.startedAt,
      finishedAt: log.finishedAt,
      errorMessage: log.errorMessage,
    })),
  });
}
