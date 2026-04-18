import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Link, useLocation } from "wouter";
import { NotificationsBell } from "./NotificationsBell";
import { GlobalSearchTrigger } from "./GlobalSearch";
import { createContext, useContext } from "react";
import {
  LayoutGrid, LogOut, Shield, Building2, Users, UserPlus, Kanban, CheckSquare, BarChart3,
  Settings, Calendar, FileText, Phone, Megaphone, Briefcase, AlertTriangle, Folder, MapPin,
  ChevronDown, UserCheck, Menu, X
} from "lucide-react";

type NavLeaf = { href: string; label: string; icon: React.ElementType };
type NavGroup = { label: string; icon: React.ElementType; children: NavLeaf[] };
type NavEntry = NavLeaf | NavGroup;

function isGroup(e: NavEntry): e is NavGroup { return (e as NavGroup).children !== undefined; }

const NAV_ITEMS: NavEntry[] = [
  { href: "/crm", label: "Contacts", icon: Users },
  { href: "/crm/leads", label: "Leads", icon: UserPlus },
  { href: "/crm/pipeline", label: "Pipeline", icon: Kanban },
  { href: "/crm/phone-chat", label: "Phone & Chat", icon: Phone },
  { href: "/crm/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/crm/locations", label: "Locations", icon: MapPin },
  { label: "HR & Operations", icon: Briefcase, children: [
    { href: "/crm/employees", label: "Employees", icon: Briefcase },
    { href: "/crm/incidents", label: "Incident Reports", icon: AlertTriangle },
    { href: "/crm/write-ups", label: "Write-Ups", icon: FileText },
    { href: "/crm/intake", label: "Employee Intake", icon: UserCheck },
    { href: "/crm/files", label: "File Management", icon: Folder },
  ]},
  { href: "/crm/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/crm/calendar", label: "Calendar", icon: Calendar },
  { href: "/crm/reports", label: "Reports", icon: BarChart3 },
  { href: "/crm/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/crm/templates", label: "Templates", icon: FileText },
  { href: "/crm/settings", label: "Settings", icon: Settings },
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
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
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

function NavGroupMenu({ item, Icon, active, currentLocation }: {
  item: NavGroup; Icon: React.ElementType; active: boolean; currentLocation: string;
}) {
  const [open, setOpen] = useState(active);
  
  return (
    <div className="mb-1.5">
      <button onClick={() => setOpen((v) => !v)}
        className={`w-full group flex items-center justify-between px-3 py-2.5 rounded-[10px] text-sm font-medium transition-all duration-200 ${
          active 
            ? "text-primary bg-primary/5" 
            : "text-muted-foreground hover:text-foreground hover:bg-white/5"
        }`}>
        <div className="flex items-center gap-3">
          <Icon className={`w-[18px] h-[18px] ${active ? "text-primary" : "group-hover:text-foreground"}`} />
          <span className="tracking-wide">{item.label}</span>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
      </button>
      
      {open && (
        <div className="flex flex-col gap-1 mt-1 pl-11 pr-2">
          {item.children.map((child) => {
            const ChildIcon = child.icon;
            const childActive = currentLocation === child.href || currentLocation.startsWith(child.href);
            return (
              <Link key={child.href} href={child.href}
                className={`group flex items-center gap-2.5 py-2 px-3 rounded-[8px] text-[13px] font-medium transition-all duration-200 relative overflow-hidden ${
                  childActive 
                    ? "bg-primary/10 border border-primary/30 shadow-[0_0_10px_oklch(0.78_0.12_75/5%)] text-gold-gradient" 
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                }`}>
                {childActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-primary shadow-[0_0_8px_oklch(0.78_0.12_75)]" />
                )}
                <ChildIcon className={`w-3.5 h-3.5 ${childActive ? "text-primary" : ""}`} />
                <span>{child.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

const CrmLayoutMountedContext = createContext(false);

export function CrmLayout({ children }: { children: ReactNode }) {
  const alreadyMounted = useContext(CrmLayoutMountedContext);
  if (alreadyMounted) {
    // Already rendered by a parent; just forward children so page-level
    // wrappers become no-ops and the real layout persists across navigation.
    return <>{children}</>;
  }

  const { user, loading: authLoading, isAuthenticated, signOut } = useAuth();
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const orgQuery = trpc.org.current.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 rounded-xl mx-auto mb-5 flex items-center justify-center"
            style={{ background: "oklch(0.78 0.12 75 / 15%)", border: "1px solid oklch(0.78 0.12 75 / 30%)" }}>
            <Shield className="w-7 h-7 text-foreground" />
          </div>
          <h2 className="text-foreground text-2xl font-bold mb-2">Sign In to Access CRM</h2>
          <p className="text-muted-foreground text-sm mb-6">Sign in to access the GridWorker OS CRM dashboard.</p>
          <Link href="/login"
            className="inline-block px-6 py-3 rounded-lg font-semibold text-sm transition-all hover:scale-105"
            style={{ background: "oklch(0.78 0.12 75)", color: "oklch(0.10 0.008 265)", boxShadow: "0 0 20px oklch(0.78 0.12 75 / 30%)" }}>
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  if (orgQuery.isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!orgQuery.data) {
    return <OnboardingFlow />;
  }

  const SidebarContent = (
    <>
      <div className="h-16 flex items-center px-6 border-b border-white/5 shrink-0">
        <Link href="/" className="flex items-center gap-3 w-full group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-[oklch(0.62_0.18_250)] flex items-center justify-center shadow-[0_0_15px_oklch(0.78_0.12_75/20%)] group-hover:shadow-[0_0_20px_oklch(0.78_0.12_75/40%)] transition-all duration-300 relative">
            <div className="absolute inset-[1px] bg-background rounded-md flex items-center justify-center">
              <LayoutGrid className="w-4 h-4 text-primary group-hover:scale-110 transition-transform duration-300" />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="font-display text-sm leading-none text-foreground tracking-[0.2em]">
              GRIDWORKER <span className="text-primary">OS</span>
            </span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest mt-0.5">Control Panel</span>
          </div>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-6 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
        <div className="flex flex-col gap-1.5">
          <p className="px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Main Navigation</p>
          {NAV_ITEMS.map((item, idx) => {
            if (isGroup(item)) {
              const Icon = item.icon;
              const groupActive = item.children.some((c) => location === c.href || location.startsWith(c.href));
              return (
                <NavGroupMenu key={idx} item={item} Icon={Icon} active={groupActive} currentLocation={location} />
              );
            }
            
            const isActive = location === item.href || (item.href !== "/crm" && location.startsWith(item.href));
            const Icon = item.icon;
            
            return (
              <Link key={item.href} href={item.href}
                className={`group flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-sm font-medium transition-all duration-200 mb-1.5 relative overflow-hidden ${
                  isActive
                    ? "bg-primary/10 border border-primary/20 shadow-[0_0_15px_oklch(0.78_0.12_75/10%)] text-gold-gradient font-semibold tracking-wide"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5 tracking-wide"
                }`}>
                {isActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-primary shadow-[0_0_10px_oklch(0.78_0.12_75)] rounded-r-full" />
                )}
                <Icon className={`w-[18px] h-[18px] transition-colors ${isActive ? "text-primary" : "group-hover:text-foreground"}`} />
                <span>{item.label}</span>
                {isActive && (
                  <div className="absolute top-0 right-0 bottom-0 w-24 bg-gradient-to-l from-primary/10 to-transparent pointer-events-none" />
                )}
              </Link>
            );
          })}
        </div>
      </div>
      
      <div className="p-4 border-t border-white/5 shrink-0 bg-white/[0.02]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center border border-white/10 shrink-0 shadow-lg relative overflow-hidden">
             <div className="absolute inset-0 bg-primary/10" />
             <Shield className="w-5 h-5 text-primary relative z-10" />
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-medium text-foreground truncate">{user?.email?.split('@')[0]}</span>
            <span className="text-[11px] text-primary truncate uppercase tracking-widest">{orgQuery.data?.name}</span>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <CrmLayoutMountedContext.Provider value={true}>
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden selection:bg-primary/30">
      {/* Decorative Grid Background for whole app */}
      <div className="absolute inset-0 z-0 pointer-events-none bg-[radial-gradient(circle_at_50%_0%,oklch(0.16_0.01_265),transparent_70%)] opacity-30" />

      {/* Desktop Sidebar */}
      <aside className="relative z-20 hidden md:flex flex-col w-[260px] lg:w-[280px] h-full bg-surface/80 backdrop-blur-3xl border-r border-white/5 shadow-[4px_0_24px_-4px_rgba(0,0,0,0.5)]">
        {SidebarContent}
      </aside>

      {/* Mobile Drawer (simplified toggle) */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <aside className="relative z-10 w-[280px] h-full bg-surface border-r border-white/5 shadow-2xl flex flex-col">
             <button onClick={() => setMobileMenuOpen(false)} className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground bg-white/5 rounded-full z-50">
               <X className="w-4 h-4" />
             </button>
            {SidebarContent}
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full min-w-0 relative z-10">
        {/* Top Header */}
        <header className="h-16 flex items-center justify-between px-6 bg-background/60 backdrop-blur-xl border-b border-white/5 shrink-0 sticky top-0 z-30">
          <div className="flex items-center gap-3">
             <button onClick={() => setMobileMenuOpen(true)} className="md:hidden p-2 -ml-2 text-muted-foreground hover:text-foreground">
               <Menu className="w-5 h-5" />
             </button>
             <h1 className="text-xl font-display tracking-wide text-foreground/90 capitalize hidden sm:block">
               {location.split('/').pop()?.replace('-', ' ') || 'CRM'} <span className="text-primary text-[10px] tracking-widest uppercase ml-2 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 align-middle inline-block -mt-1">{orgQuery.data?.name}</span>
             </h1>
          </div>
          
          <div className="flex items-center gap-3 sm:gap-4">
            <GlobalSearchTrigger />
            <NotificationsBell />
            <div className="w-[1px] h-6 bg-white/10 mx-1 md:block hidden" />
            <button onClick={() => signOut()}
              className="flex items-center gap-2 text-muted-foreground hover:text-[oklch(0.98_0_0)] transition-colors text-sm px-3 py-1.5 rounded-lg hover:bg-[oklch(0.98_0_0/10%)]">
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:block font-medium">Safe Exit</span>
            </button>
          </div>
        </header>

        {/* Scrollable Page Wrapper */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 lg:p-8 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
          <div className="max-w-[1400px] mx-auto w-full relative">
            {children}
          </div>
        </main>
      </div>
    </div>
    </CrmLayoutMountedContext.Provider>
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
