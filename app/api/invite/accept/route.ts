import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// POST /api/invite/accept — accept invite and set password
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "A valid JSON body is required" }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return Response.json({ error: "The request body must be an object" }, { status: 400 });
  }

  const raw = body as { token?: unknown; name?: unknown; password?: unknown };
  const token = typeof raw.token === "string" ? raw.token.trim() : "";
  const name = typeof raw.name === "string" ? raw.name.trim().slice(0, 100) : "";
  const password = typeof raw.password === "string" ? raw.password : "";

  if (!/^[a-f0-9]{64}$/i.test(token) || !password) {
    return Response.json({ error: "Token and password required" }, { status: 400 });
  }
  if (password.length < 8 || password.length > 256) {
    return Response.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  if (raw.name !== undefined && typeof raw.name !== "string") {
    return Response.json({ error: "name must be text when provided" }, { status: 400 });
  }

  const invite = await prisma.invite.findUnique({ where: { token } });
  if (!invite) return Response.json({ error: "Invalid invite" }, { status: 400 });
  if (invite.acceptedAt) return Response.json({ error: "Invite already used" }, { status: 400 });
  if (invite.expiresAt < new Date()) return Response.json({ error: "Invite expired" }, { status: 400 });

  const passwordHash = await bcrypt.hash(password, 12);

  // Create the user and mark invite accepted in a transaction
  await prisma.$transaction([
    prisma.user.create({
      data: {
        email: invite.email,
        name: name || invite.email.split("@")[0],
        passwordHash,
        role: invite.role,
        inviteStatus: "ACTIVE",
      },
    }),
    prisma.invite.update({
      where: { token },
      data: { acceptedAt: new Date() },
    }),
  ]);

  return Response.json({ success: true });
}
