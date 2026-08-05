import { NextRequest } from "next/server";
import { fetchScoredProps } from "@/lib/odds/oddsService";

export async function GET(req: NextRequest) {
  const sport = req.nextUrl.searchParams.get("sport") ?? "basketball_nba";

  try {
    const result = await fetchScoredProps({ sportKey: sport });
    return Response.json(result);
  } catch (err) {
    console.error("/api/props error:", err);
    return Response.json({ error: "Failed to fetch props" }, { status: 500 });
  }
}
