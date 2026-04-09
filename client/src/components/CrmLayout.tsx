import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Link, useLocation } from "wouter";
import { LayoutGrid, LogOut, Shield, Building2, Users, Kanban, CheckSquare, BarChart3 } from "lucide-react";

const NAV_ITEMS = [
  { href: "/crm", label: "Contacts", icon: Users },
  { href: "/crm/pipeline", label: "Pipeline", icon: Kanban },
  { href: "/crm/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/crm/dashboard", label: "Dashboard", icon: BarChart3 },
];

function OnboardingFlow() {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [error, setError] = useState<string | null>(null);

  const createOrg = trpc.org.create.useMutation({
    onSuccess: () => window.location.reload(),
    onError: (err) => setError(err.message),
  });

  return (
    <div className="min-h-screen bg-[oklch(0.10_0.007_265)] flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-xl mx-auto mb-5 flex items-center justify-center"
            style={{ background: "oklch(0.78 0.12 75 / 15%)", border: "1px solid oklch(0.78 0.12 75 / 30%)" }}>
            <Building2 className="w-7 h-7 text-foreground" />
          </div>
          <h2 className="text-foreground text-2xl font-bold mb-2">Create Your Organization</h2>
          <p className="text-muted-foreground text-sm">Set up your organization to start using the CRM.</p>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); setError(null); createOrg.mutate({ name: name.trim(), slug: slug.trim().toLowerCase() }); }} className="flex flex-col gap-4">
          <div className="rounded-xl p-6 flex flex-col gap-4">
            <div>
              <label className="block text-muted-foreground text-xs uppercase tracking-widest mb-1.5">Organization Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} required
                className="w-full px-3 py-2.5 rounded-lg text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-[oklch(0.78_0.12_75/50%)] bg-background border border-border"
                placeholder="My Company" />
            </div>
            <div>
              <label className="block text-muted-foreground text-xs uppercase tracking-widest mb-1.5">Slug</label>
              <input type="text" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} required pattern="^[a-z0-9-]+$"
                className="w-full px-3 py-2.5 rounded-lg text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-[oklch(0.78_0.12_75/50%)] bg-background border border-border"
                placeholder="my-company" />
              <p className="text-muted-foreground text-xs mt-1">Lowercase letters, numbers, and hyphens only</p>
            </div>
            {error && <p className="text-red-400 text-xs">{error}</p>}
            <button type="submit" disabled={createOrg.isPending}
              className="w-full py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50"
              style={{ background: "oklch(0.78 0.12 75)", color: "oklch(0.10 0.008 265)" }}>
              {createOrg.isPending ? <div className="w-4 h-4 mx-auto rounded-full border-2 border-current border-t-transparent animate-spin" /> : "Create Organization"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

import { useState, type ReactNode } from "react";

export function CrmLayout({ children }: { children: ReactNode }) {
  const { user, loading: authLoading, isAuthenticated, signOut } = useAuth();
  const [location] = useLocation();

  const orgQuery = trpc.org.current.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[oklch(0.10_0.007_265)] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[oklch(0.78_0.12_75)] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[oklch(0.10_0.007_265)] flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 rounded-xl mx-auto mb-5 flex items-center justify-center"
            style={{ background: "oklch(0.78 0.12 75 / 15%)", border: "1px solid oklch(0.78 0.12 75 / 30%)" }}>
            <Shield className="w-7 h-7 text-foreground" />
          </div>
          <h2 className="text-foreground text-2xl font-bold mb-2">Sign In to Access CRM</h2>
          <p className="text-muted-foreground text-sm mb-6">Sign in to access the GridWorker OS CRM dashboard.</p>
          <Link href="/login"
            className="inline-block px-6 py-3 rounded-lg font-semibold text-sm"
            style={{ background: "oklch(0.78 0.12 75)", color: "oklch(0.10 0.008 265)" }}>
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  if (orgQuery.isLoading) {
    return (
      <div className="min-h-screen bg-[oklch(0.10_0.007_265)] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[oklch(0.78_0.12_75)] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!orgQuery.data) {
    return <OnboardingFlow />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-sm bg-gradient-to-br from-[oklch(0.78_0.12_75)] to-[oklch(0.62_0.18_250)] flex items-center justify-center">
                <LayoutGrid className="w-3.5 h-3.5 text-[oklch(0.10_0.008_265)]" />
              </div>
              <span className="font-display text-sm text-foreground tracking-[0.2em] hidden sm:block">
                GRIDWORKER <span className="text-primary">OS</span>
              </span>
            </Link>
            {/* CRM Tabs */}
            <div className="flex items-center gap-1">
              {NAV_ITEMS.map((item) => {
                const isActive = location === item.href || (item.href !== "/crm" && location.startsWith(item.href));
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      isActive
                        ? "bg-primary/15 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                    }`}>
                    <Icon className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-muted-foreground text-sm hidden sm:block">{user?.email}</span>
            <button onClick={() => signOut()}
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-sm">
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:block">Sign Out</span>
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 pt-20 pb-16">
        {children}
      </div>
    </div>
  );
}

export function useCrmOrg() {
  const { isAuthenticated } = useAuth();
  const orgQuery = trpc.org.current.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
  });
  return orgQuery;
}
