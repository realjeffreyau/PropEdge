import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

const INVITABLE_ROLES = ["MEMBER_READONLY", "MEMBER_FULL"] as const;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /api/invite — admin creates an invite
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "A valid JSON body is required" }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return Response.json({ error: "The request body must be an object" }, { status: 400 });
  }

  const rawEmail = (body as { email?: unknown }).email;
  const rawRole = (body as { role?: unknown }).role ?? "MEMBER_READONLY";
  const email = typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";
  if (!email || email.length > 320 || !EMAIL_PATTERN.test(email)) {
    return Response.json({ error: "A valid email is required" }, { status: 400 });
  }
  if (typeof rawRole !== "string" || !INVITABLE_ROLES.includes(rawRole as typeof INVITABLE_ROLES[number])) {
    return Response.json({ error: "Only member roles can be invited" }, { status: 400 });
  }
  const role = rawRole as typeof INVITABLE_ROLES[number];

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

  return Response.json({
    inviteUrl,
    email: invite.email,
    role: invite.role,
    expiresAt: invite.expiresAt,
  });
}

// GET /api/invite?token=xxx — validate a token
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return Response.json({ error: "Token required" }, { status: 400 });
  if (!/^[a-f0-9]{64}$/i.test(token)) {
    return Response.json({ valid: false, error: "Invalid invite" }, { headers: { "Cache-Control": "no-store" } });
  }

  const invite = await prisma.invite.findUnique({ where: { token } });
  if (!invite) return Response.json({ valid: false, error: "Invalid invite" }, { headers: { "Cache-Control": "no-store" } });
  if (invite.acceptedAt) return Response.json({ valid: false, error: "Invite already used" }, { headers: { "Cache-Control": "no-store" } });
  if (invite.expiresAt < new Date()) return Response.json({ valid: false, error: "Invite expired" }, { headers: { "Cache-Control": "no-store" } });

  return Response.json({ valid: true, email: invite.email, role: invite.role }, { headers: { "Cache-Control": "no-store" } });
}
