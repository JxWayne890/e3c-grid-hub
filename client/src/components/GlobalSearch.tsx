import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Search, Users, UserPlus, Briefcase, Phone, AlertTriangle, X } from "lucide-react";
import { trpc } from "@/lib/trpc";

function useDebounced<T>(value: T, delay: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

export function GlobalSearchTrigger() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors border border-border">
        <Search className="w-3.5 h-3.5" />
        <span className="hidden lg:inline">Search leads, customers, employees...</span>
        <kbd className="ml-1 px-1.5 py-0.5 rounded text-[9px] bg-muted border border-border hidden lg:inline">⌘K</kbd>
      </button>
      {open && <GlobalSearchModal onClose={() => setOpen(false)} />}
    </>
  );
}

function GlobalSearchModal({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState("");
  const debounced = useDebounced(q, 250);
  const { data, isFetching } = trpc.search.global.useQuery(
    { query: debounced },
    { enabled: debounced.trim().length > 1 }
  );

  const hasResults =
    data &&
    ((data.contacts?.length ?? 0) + (data.leads?.length ?? 0) + (data.employees?.length ?? 0) +
     (data.calls?.length ?? 0) + (data.incidents?.length ?? 0) > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl rounded-xl bg-surface border border-border overflow-hidden shadow-2xl">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Search leads, customers, employees, calls, incidents..."
            className="flex-1 bg-transparent outline-none text-foreground text-sm" />
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto">
          {!debounced.trim() ? (
            <p className="text-muted-foreground text-xs text-center py-8">Start typing to search...</p>
          ) : isFetching ? (
            <p className="text-muted-foreground text-xs text-center py-8">Searching...</p>
          ) : !hasResults ? (
            <p className="text-muted-foreground text-xs text-center py-8">No results for "{debounced}".</p>
          ) : (
            <>
              <ResultGroup label="Contacts" icon={Users}>
                {data!.contacts.map((c: any) => (
                  <Link key={c.id} href="/crm" onClick={onClose}
                    className="block px-4 py-2 hover:bg-white/5">
                    <p className="text-foreground text-sm">{c.first_name} {c.last_name}</p>
                    <p className="text-muted-foreground text-xs">{c.email} · {c.stage}</p>
                  </Link>
                ))}
              </ResultGroup>
              <ResultGroup label="Leads" icon={UserPlus}>
                {data!.leads.map((l: any) => (
                  <Link key={l.id} href="/crm/leads" onClick={onClose}
                    className="block px-4 py-2 hover:bg-white/5">
                    <p className="text-foreground text-sm">{l.first_name} {l.last_name}</p>
                    <p className="text-muted-foreground text-xs">{l.phone} · {l.stage}</p>
                  </Link>
                ))}
              </ResultGroup>
              <ResultGroup label="Employees" icon={Briefcase}>
                {data!.employees.map((e: any) => (
                  <Link key={e.id} href="/crm/employees" onClick={onClose}
                    className="block px-4 py-2 hover:bg-white/5">
                    <p className="text-foreground text-sm">{e.first_name} {e.last_name}</p>
                    <p className="text-muted-foreground text-xs capitalize">{e.role}</p>
                  </Link>
                ))}
              </ResultGroup>
              <ResultGroup label="Calls" icon={Phone}>
                {data!.calls.map((c: any) => (
                  <Link key={c.id} href="/crm/phone-chat" onClick={onClose}
                    className="block px-4 py-2 hover:bg-white/5">
                    <p className="text-foreground text-sm">{c.caller_name}</p>
                    <p className="text-muted-foreground text-xs">{c.caller_phone} · {c.call_type}</p>
                  </Link>
                ))}
              </ResultGroup>
              <ResultGroup label="Incidents" icon={AlertTriangle}>
                {data!.incidents.map((i: any) => (
                  <Link key={i.id} href="/crm/incidents" onClick={onClose}
                    className="block px-4 py-2 hover:bg-white/5">
                    <p className="text-foreground text-sm truncate">{i.description}</p>
                    <p className="text-muted-foreground text-xs">{i.severity} · {i.status}</p>
                  </Link>
                ))}
              </ResultGroup>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ResultGroup({ label, icon: Icon, children }: {
  label: string; icon: React.ElementType; children: React.ReactNode;
}) {
  const arr = Array.isArray(children) ? children : [children];
  const hasAny = arr.some((c) => !!c);
  if (!hasAny) return null;
  return (
    <div className="py-1">
      <p className="px-4 py-1.5 text-muted-foreground text-[10px] uppercase tracking-widest font-semibold bg-muted flex items-center gap-1.5">
        <Icon className="w-3 h-3" /> {label}
      </p>
      {children}
    </div>
  );
}
