import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { SPORTS } from "@/constants/sports";
import { fetchScoredProps } from "@/lib/odds/oddsService";

const REFRESH_ACCESS_ERROR = "Refreshing odds spends API credits and requires full access.";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !["ADMIN", "MEMBER_FULL"].includes(session.user.role)) {
    return Response.json({ error: REFRESH_ACCESS_ERROR }, { status: 403 });
  }

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "A valid JSON request body is required." }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return Response.json({ error: "The request body must be an object." }, { status: 400 });
  }

  const hasSport = Object.prototype.hasOwnProperty.call(body, "sport");
  const sport = hasSport
    ? (body as { sport?: unknown }).sport
    : "basketball_nba";
  const knownSport = SPORTS.some((candidate) => candidate.key === sport);

  if (typeof sport !== "string" || !knownSport) {
    return Response.json({ error: "sport must be a known sport key." }, { status: 400 });
  }

  try {
    const { props, status } = await fetchScoredProps({ sportKey: sport, forceRefresh: true });
    return Response.json({ success: true, propsCount: props.length, status });
  } catch (err) {
    console.error("/api/odds/refresh error:", err);
    const error = err instanceof Error && err.message.trim()
      ? err.message
      : "Unable to refresh odds right now. Please try again.";
    return Response.json({ success: false, error }, { status: 502 });
  }
}
