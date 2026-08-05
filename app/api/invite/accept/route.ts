import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// POST /api/invite/accept — accept invite and set password
export async function POST(req: NextRequest) {
  const { token, name, password } = await req.json();

  if (!token || !password) {
    return Response.json({ error: "Token and password required" }, { status: 400 });
  }
  if (password.length < 8) {
    return Response.json({ error: "Password must be at least 8 characters" }, { status: 400 });
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
