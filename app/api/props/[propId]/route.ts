import { NextRequest } from "next/server";
import { getOddsApiProvider } from "@/lib/odds/theOddsApiProvider";
import { findPropInCache } from "@/lib/propCache";
import { MOCK_NBA_PROPS, MOCK_WNBA_PROPS } from "@/lib/mock/mockData";

const ALL_MOCK_PROPS = [...MOCK_NBA_PROPS, ...MOCK_WNBA_PROPS];

interface PropRouteContext {
  params: Promise<{ propId: string }>;
}

export async function GET(_req: NextRequest, { params }: PropRouteContext) {
  const { propId } = await params;
  const cachedProp = await findPropInCache(propId);
  const prop = cachedProp ?? (
    getOddsApiProvider().isConfigured
      ? null
      : ALL_MOCK_PROPS.find((candidate) => candidate.id === propId) ?? null
  );

  if (!prop) {
    return Response.json({ error: "Prop not found." }, { status: 404 });
  }

  return Response.json({ prop });
}
