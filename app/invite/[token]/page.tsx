"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ZapIcon, CheckCircleIcon } from "lucide-react";

interface InvitePageProps {
  params: Promise<{ token: string }>;
}

export default function InvitePage({ params }: InvitePageProps) {
  const { token } = use(params);
  const router = useRouter();

  const [invite, setInvite] = useState<{ valid: boolean; email?: string; error?: string } | null>(null);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    fetch(`/api/invite?token=${token}`)
      .then((r) => r.json())
      .then(setInvite);
  }, [token]);

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError("Passwords don't match."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }

    setIsLoading(true);
    setError(null);

    const res = await fetch("/api/invite/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, name, password }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      setIsLoading(false);
    } else {
      setDone(true);
      setTimeout(() => router.push("/login"), 2000);
    }
  };

  if (!invite) {
    return <InviteShell><p className="text-sm text-muted-foreground">Validating invite…</p></InviteShell>;
  }

  if (!invite.valid) {
    return (
      <InviteShell>
        <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400 text-center">
          {invite.error ?? "This invite is not valid."}
        </div>
        <p className="text-xs text-muted-foreground text-center mt-3">Contact your admin for a new invite.</p>
      </InviteShell>
    );
  }

  if (done) {
    return (
      <InviteShell>
        <div className="flex flex-col items-center gap-3 text-center py-2">
          <CheckCircleIcon className="w-8 h-8 text-emerald-400" />
          <p className="text-sm font-medium text-foreground">Account created!</p>
          <p className="text-xs text-muted-foreground">Redirecting to login…</p>
        </div>
      </InviteShell>
    );
  }

  return (
    <InviteShell>
      <p className="text-xs text-muted-foreground mb-4">
        You&apos;ve been invited as <span className="text-foreground font-medium">{invite.email}</span>. Set a password to activate your account.
      </p>
      <form onSubmit={handleAccept} className="space-y-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Your name (optional)</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="w-full px-3 py-2.5 rounded-lg bg-muted/60 border border-border text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500/50"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="Min. 8 characters"
            className="w-full px-3 py-2.5 rounded-lg bg-muted/60 border border-border text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500/50"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Confirm password</label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            placeholder="Repeat password"
            className="w-full px-3 py-2.5 rounded-lg bg-muted/60 border border-border text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500/50"
          />
        </div>
        {error && (
          <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">{error}</div>
        )}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-2.5 rounded-lg bg-amber-500 text-black text-sm font-semibold hover:bg-amber-400 transition-all active:scale-[0.98] disabled:opacity-50 btn-amber-glow"
        >
          {isLoading ? "Creating account…" : "Activate account"}
        </button>
      </form>
    </InviteShell>
  );
}

function InviteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-3xl" />
      </div>
      <div className="w-full max-w-sm relative">
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <ZapIcon className="w-5 h-5 text-black" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-display font-semibold tracking-tight">PropEdge</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Accept your invite</p>
          </div>
        </div>
        <div className="glass-card p-6">{children}</div>
      </div>
    </div>
  );
}
