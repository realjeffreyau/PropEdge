import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

function adminOnly() {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

// GET /api/admin/users — list all users
export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") return adminOnly();

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      inviteStatus: true,
      createdAt: true,
      lastLoginAt: true,
    },
  });

  return Response.json({ users });
}

// PATCH /api/admin/users — revoke or restore a user
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") return adminOnly();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "A valid JSON body is required" }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return Response.json({ error: "The request body must be an object" }, { status: 400 });
  }

  const { id, action } = body as { id?: unknown; action?: unknown };
  if (typeof id !== "string" || !id.trim() || typeof action !== "string" || !action) {
    return Response.json({ error: "id and action required" }, { status: 400 });
  }
  if (!["revoke", "restore"].includes(action)) {
    return Response.json({ error: "action must be revoke or restore" }, { status: 400 });
  }

  // Prevent admin from revoking themselves
  if (id.trim() === session.user.id) {
    return Response.json({ error: "Cannot modify your own account" }, { status: 400 });
  }

  const newStatus = action === "revoke" ? "REVOKED" : "ACTIVE";
  const user = await prisma.user.update({
    where: { id: id.trim() },
    data: { inviteStatus: newStatus as "ACTIVE" | "REVOKED" },
    select: { id: true, email: true, inviteStatus: true },
  });

  return Response.json({ user });
}
