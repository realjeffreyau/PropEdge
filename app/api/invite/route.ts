import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

// POST /api/invite — admin creates an invite
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { email, role = "MEMBER_READONLY" } = await req.json();
  if (!email) return Response.json({ error: "Email required" }, { status: 400 });

  // Check if user already exists
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return Response.json({ error: "User already exists" }, { status: 409 });

  const configuredBaseUrl = process.env.APP_BASE_URL?.trim();
  if (!configuredBaseUrl && process.env.NODE_ENV === "production") {
    return Response.json(
      { error: "APP_BASE_URL must be configured in production" },
      { status: 500 },
    );
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const invite = await prisma.invite.create({
    data: {
      email,
      role,
      token,
      expiresAt,
      createdByUserId: session.user.id,
    },
  });

  const baseUrl = configuredBaseUrl || req.nextUrl.origin;
  const inviteUrl = new URL(`/invite/${token}`, baseUrl).toString();

  return Response.json({ invite, inviteUrl });
}

// GET /api/invite?token=xxx — validate a token
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return Response.json({ error: "Token required" }, { status: 400 });

  const invite = await prisma.invite.findUnique({ where: { token } });
  if (!invite) return Response.json({ valid: false, error: "Invalid invite" });
  if (invite.acceptedAt) return Response.json({ valid: false, error: "Invite already used" });
  if (invite.expiresAt < new Date()) return Response.json({ valid: false, error: "Invite expired" });

  return Response.json({ valid: true, email: invite.email, role: invite.role });
}
