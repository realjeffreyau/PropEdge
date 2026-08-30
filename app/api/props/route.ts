import { NextRequest } from "next/server";
import { SPORTS } from "@/constants/sports";
import { fetchScoredProps } from "@/lib/odds/oddsService";

export async function GET(req: NextRequest) {
  const sport = req.nextUrl.searchParams.get("sport") ?? "basketball_nba";
  if (!SPORTS.some((candidate) => candidate.key === sport)) {
    return Response.json({ error: "sport must be a supported sport key." }, { status: 400 });
  }

  try {
    const result = await fetchScoredProps({ sportKey: sport });
    return Response.json(result);
  } catch (err) {
    console.error("/api/props error:", err);
    return Response.json({ error: "Failed to fetch props" }, { status: 500 });
  }
}
