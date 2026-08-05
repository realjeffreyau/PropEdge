"use client";

import { useState, useEffect, useCallback } from "react";
import { AppShell } from "@/components/layout/AppShell";
import {
  UsersIcon,
  SendIcon,
  CheckCircleIcon,
  ShieldAlertIcon,
  RefreshCwIcon,
  CopyIcon,
  CheckIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type UserRole = "MEMBER_READONLY" | "MEMBER_FULL" | "ADMIN";
type InviteStatus = "INVITED" | "ACTIVE" | "REVOKED";

interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  inviteStatus: InviteStatus;
  createdAt: string;
  lastLoginAt: string | null;
}

const ROLE_LABELS: Record<UserRole, string> = {
  MEMBER_READONLY: "Read only",
  MEMBER_FULL: "Full access",
  ADMIN: "Admin",
};

const STATUS_STYLES: Record<InviteStatus, string> = {
  INVITED: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  ACTIVE: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  REVOKED: "bg-red-500/10 text-red-400 border-red-500/20",
};

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short", day: "numeric", year: "numeric",
  }).format(new Date(iso));
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handle = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handle}
      className="p-1.5 rounded hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-500"
      title="Copy"
      aria-label={copied ? "Copied to clipboard" : "Copy invite link"}
    >
      {copied ? <CheckIcon className="w-3.5 h-3.5 text-emerald-400" /> : <CopyIcon className="w-3.5 h-3.5" />}
    </button>
  );
}

export default function AdminPage() {
  const [tab, setTab] = useState<"users" | "invite">("users");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Invite form
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<UserRole>("MEMBER_READONLY");
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState<{ url: string; email: string } | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      setUsers(data.users ?? []);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => { void Promise.resolve().then(() => loadUsers()); }, [loadUsers]);

  const handleRevoke = async (user: AdminUser) => {
    const action = user.inviteStatus === "REVOKED" ? "restore" : "revoke";
    const confirm = window.confirm(
      action === "revoke"
        ? `Revoke access for ${user.email}? They won't be able to sign in.`
        : `Restore access for ${user.email}?`
    );
    if (!confirm) return;

    setActionLoading(user.id);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: user.id, action }),
      });
      if (res.ok) await loadUsers();
    } finally {
      setActionLoading(null);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);
    setInviteError(null);
    setInviteResult(null);

    const res = await fetch("/api/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
    });
    const data = await res.json();

    if (!res.ok) {
      setInviteError(data.error ?? "Something went wrong.");
    } else {
      setInviteResult({ url: data.inviteUrl, email: inviteEmail });
      setInviteEmail("");
      await loadUsers();
    }
    setInviting(false);
  };

  return (
    <AppShell>
      <div className="max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-display font-semibold tracking-tight">Admin</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage users and send invites</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-border">
          {(["users", "invite"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                tab === t
                  ? "border-amber-500 text-amber-400"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {t === "users" ? (
                <span className="flex items-center gap-1.5"><UsersIcon className="w-3.5 h-3.5" />Users</span>
              ) : (
                <span className="flex items-center gap-1.5"><SendIcon className="w-3.5 h-3.5" />Invite</span>
              )}
            </button>
          ))}
        </div>

        {/* Users tab */}
        {tab === "users" && (
          <div className="glass-card overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <p className="text-sm font-medium">{users.length} user{users.length !== 1 ? "s" : ""}</p>
              <button
                onClick={loadUsers}
                disabled={loadingUsers}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <RefreshCwIcon className={cn("w-3 h-3", loadingUsers && "animate-spin")} />
                Refresh
              </button>
            </div>

            {loadingUsers ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">Loading…</div>
            ) : users.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">No users yet.</div>
            ) : (
              <div className="divide-y divide-border">
                {users.map((user) => (
                  <div key={user.id} className="flex items-center justify-between gap-4 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-foreground truncate">
                          {user.name ?? user.email}
                        </p>
                        <span className={cn(
                          "text-xs px-2 py-0.5 rounded-full border font-medium",
                          STATUS_STYLES[user.inviteStatus]
                        )}>
                          {user.inviteStatus.toLowerCase()}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                        <span className="text-xs text-muted-foreground/50">·</span>
                        <p className="text-xs text-muted-foreground">{ROLE_LABELS[user.role]}</p>
                        <span className="text-xs text-muted-foreground/50">·</span>
                        <p className="text-xs text-muted-foreground">
                          Last login: {formatDate(user.lastLoginAt)}
                        </p>
                      </div>
                    </div>

                    {user.role !== "ADMIN" && (
                      <button
                        onClick={() => handleRevoke(user)}
                        disabled={actionLoading === user.id}
                        className={cn(
                          "shrink-0 text-xs px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50",
                          user.inviteStatus === "REVOKED"
                            ? "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                            : "border-red-500/30 text-red-400 hover:bg-red-500/10"
                        )}
                      >
                        {actionLoading === user.id
                          ? "…"
                          : user.inviteStatus === "REVOKED"
                          ? "Restore"
                          : "Revoke"}
                      </button>
                    )}

                    {user.role === "ADMIN" && (
                      <span className="shrink-0 flex items-center gap-1 text-xs text-amber-400/70">
                        <ShieldAlertIcon className="w-3 h-3" />
                        Admin
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Invite tab */}
        {tab === "invite" && (
          <div className="max-w-md">
            <div className="glass-card p-5">
              <h2 className="text-sm font-display font-semibold mb-4">Send an invite</h2>

              <form onSubmit={handleInvite} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Email address</label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                    placeholder="friend@example.com"
                    className="w-full px-3 py-2.5 rounded-lg bg-muted/60 border border-border text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500/50"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Access level</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2.5 rounded-lg bg-muted/60 border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500/50"
                  >
                    <option value="MEMBER_READONLY">Read only — can view props, no refresh</option>
                    <option value="MEMBER_FULL">Full access — can refresh odds</option>
                    <option value="ADMIN">Admin — full access + user management</option>
                  </select>
                </div>

                {inviteError && (
                  <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                    {inviteError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={inviting}
                  className="w-full py-2.5 rounded-lg bg-amber-500 text-black text-sm font-semibold hover:bg-amber-400 transition-all active:scale-[0.98] disabled:opacity-50 btn-amber-glow"
                >
                  {inviting ? "Creating invite…" : "Create invite link"}
                </button>
              </form>

              {inviteResult && (
                <div className="mt-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircleIcon className="w-4 h-4 text-emerald-400 shrink-0" />
                    <p className="text-xs font-medium text-emerald-400">
                      Invite created for {inviteResult.email}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    Share this link — it expires in 7 days:
                  </p>
                  <div className="flex items-center gap-1 bg-muted/60 rounded-lg px-3 py-2">
                    <p className="text-xs font-data text-foreground truncate flex-1 min-w-0">
                      {inviteResult.url}
                    </p>
                    <CopyButton text={inviteResult.url} />
                  </div>
                </div>
              )}
            </div>

            <p className="mt-3 text-xs text-muted-foreground/60">
              Invite links expire after 7 days. Copy and share the link manually — no email is sent.
            </p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
