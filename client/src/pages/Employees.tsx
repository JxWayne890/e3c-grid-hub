import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { CrmLayout, useCrmOrg } from "@/components/CrmLayout";
import type { Employee, EmployeeRole, EmployeeStatus } from "@shared/types";
import { Flag, Plus, Search, ArrowUp, ArrowDown, ArrowUpDown, Briefcase } from "lucide-react";
import { PageHeader, PrimaryButton, Pill } from "@/components/ui/page";

const ROLE_LABELS: Record<EmployeeRole, string> = {
  manager: "Manager", supervisor: "Supervisor", attendant: "Attendant", valet: "Valet", admin: "Admin",
};

const STATUS_STYLES: Record<EmployeeStatus, { label: string; bg: string; text: string }> = {
  active:     { label: "Active",     bg: "oklch(0.55 0.15 145 / 18%)", text: "oklch(0.70 0.18 145)" },
  on_leave:   { label: "On leave",   bg: "oklch(0.72 0.15 75 / 18%)",  text: "oklch(0.78 0.12 75)" },
  terminated: { label: "Terminated", bg: "oklch(0.55 0.15 25 / 18%)",  text: "oklch(0.70 0.18 25)" },
};

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

type SortKey = "name" | "role" | "location" | "hire" | "status";

function EmployeesContent() {
  const orgQuery = useCrmOrg();
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [locFilter, setLocFilter] = useState<string>("all");
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "name", dir: "asc" });
  const [createOpen, setCreateOpen] = useState(false);

  const { data: employees } = trpc.hr.listEmployees.useQuery(undefined, { enabled: !!orgQuery.data });
  const { data: locations } = trpc.locations.list.useQuery(undefined, { enabled: !!orgQuery.data });
  const { data: allWriteUps } = trpc.hr.listWriteUps.useQuery(undefined, { enabled: !!orgQuery.data });

  const writeUpCount = useMemo(() => {
    const counts: Record<number, number> = {};
    for (const w of allWriteUps ?? []) counts[w.employee_id] = (counts[w.employee_id] ?? 0) + 1;
    return counts;
  }, [allWriteUps]);

  const filtered = useMemo(() => {
    const all = (employees ?? []) as Employee[];
    const q = search.trim().toLowerCase();
    const out = all.filter((e) => {
      if (roleFilter !== "all" && e.role !== roleFilter) return false;
      if (statusFilter !== "all" && e.status !== statusFilter) return false;
      if (locFilter !== "all" && String(e.location_id ?? "") !== locFilter) return false;
      if (q) {
        const hay = `${e.first_name} ${e.last_name} ${e.email} ${e.phone}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    out.sort((a, b) => {
      let av = "", bv = "";
      switch (sort.key) {
        case "name": av = `${a.first_name} ${a.last_name}`; bv = `${b.first_name} ${b.last_name}`; break;
        case "role": av = a.role; bv = b.role; break;
        case "location": av = String(a.location_id ?? ""); bv = String(b.location_id ?? ""); break;
        case "hire": av = a.hire_date ?? ""; bv = b.hire_date ?? ""; break;
        case "status": av = a.status; bv = b.status; break;
      }
      const c = av < bv ? -1 : av > bv ? 1 : 0;
      return sort.dir === "asc" ? c : -c;
    });
    return out;
  }, [employees, search, roleFilter, statusFilter, locFilter, sort]);

  const locationMap = useMemo(() => {
    const m: Record<number, string> = {};
    for (const l of locations ?? []) m[(l as any).id] = (l as any).name;
    return m;
  }, [locations]);

  const totalCount = (employees ?? []).length;
  const locCount = locations?.length ?? 0;

  const toggleSort = (key: SortKey) =>
    setSort((s) => s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" });
  const SortIcon = ({ active }: { active: boolean }) =>
    !active ? <ArrowUpDown className="w-3 h-3 opacity-40" />
    : sort.dir === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />;

  const cols: { key: SortKey; label: string }[] = [
    { key: "name", label: "Name" },
    { key: "role", label: "Role" },
    { key: "location", label: "Location" },
    { key: "hire", label: "Hire Date" },
    { key: "status", label: "Status" },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="HR & Ops"
        eyebrowIcon={Briefcase}
        title="Employees"
        subtitle={`${filtered.length} of ${totalCount} employees across ${locCount} locations`}
        actions={<PrimaryButton icon={Plus} onClick={() => setCreateOpen(true)}>Add Employee</PrimaryButton>}
      />

      <div className="rounded-xl p-4 mb-4 bg-surface/60 backdrop-blur-sm border border-white/5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="w-full pl-8 pr-3 py-1.5 rounded text-sm text-foreground outline-none bg-background border border-border" />
          </div>
          <select value={locFilter} onChange={(e) => setLocFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded text-sm text-foreground outline-none bg-background border border-border">
            <option value="all">All locations</option>
            {(locations ?? []).map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded text-sm text-foreground outline-none bg-background border border-border">
            <option value="all">All roles</option>
            {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded text-sm text-foreground outline-none bg-background border border-border">
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="on_leave">On leave</option>
            <option value="terminated">Terminated</option>
          </select>
        </div>
      </div>

      <div className="rounded-xl overflow-hidden bg-surface/60 backdrop-blur-sm border border-white/5">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              {cols.map((c) => (
                <th key={c.key} onClick={() => toggleSort(c.key)}
                  className="px-4 py-3 text-left text-muted-foreground text-[11px] font-semibold cursor-pointer select-none">
                  <span className="inline-flex items-center gap-1.5">
                    {c.label}
                    <SortIcon active={sort.key === c.key} />
                  </span>
                </th>
              ))}
              <th className="px-4 py-3 text-left text-muted-foreground text-[11px] font-semibold hidden md:table-cell">Phone</th>
              <th className="px-4 py-3 text-left text-muted-foreground text-[11px] font-semibold">Flags</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground text-sm">No employees match.</td></tr>
            ) : filtered.map((e) => {
              const ss = STATUS_STYLES[e.status];
              const wuCount = writeUpCount[e.id] ?? 0;
              const flagged = wuCount >= 3;
              return (
                <tr key={e.id} className="border-b border-white/[0.04] last:border-b-0 hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {flagged && <Flag className="w-3.5 h-3.5 text-[oklch(0.70_0.18_25)]" />}
                      <span className="text-foreground text-sm font-medium">{e.first_name} {e.last_name}</span>
                    </div>
                    <span className="text-muted-foreground text-xs">{e.email}</span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-sm">{ROLE_LABELS[e.role]}</td>
                  <td className="px-4 py-3 text-muted-foreground text-sm">
                    {e.location_id ? (locationMap[e.location_id] ?? `#${e.location_id}`) : "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{fmtDate(e.hire_date)}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold"
                      style={{ background: ss.bg, color: ss.text }}>
                      {ss.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs hidden md:table-cell">{e.phone}</td>
                  <td className="px-4 py-3">
                    {wuCount > 0 && (
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                        flagged ? "bg-[oklch(0.55_0.15_25/15%)] text-[oklch(0.70_0.18_25)]"
                        : "bg-muted text-muted-foreground"
                      }`}>
                        {wuCount} write-up{wuCount === 1 ? "" : "s"}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {createOpen && <CreateEmployeeModal onClose={() => setCreateOpen(false)} onCreated={() => {
        utils.hr.listEmployees.invalidate();
        setCreateOpen(false);
      }} locations={(locations ?? []) as any[]} />}
    </div>
  );
}

function CreateEmployeeModal({ onClose, onCreated, locations }: {
  onClose: () => void; onCreated: () => void; locations: any[];
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState<EmployeeRole>("attendant");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [locationId, setLocationId] = useState<string>("");

  const createMut = trpc.hr.createEmployee.useMutation({ onSuccess: onCreated });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-xl p-6 bg-surface border border-border flex flex-col gap-3">
        <h2 className="text-foreground text-lg font-bold">Add Employee</h2>
        <div className="grid grid-cols-2 gap-3">
          <input placeholder="First" value={firstName} onChange={(e) => setFirstName(e.target.value)}
            className="px-2.5 py-1.5 rounded text-sm text-foreground outline-none bg-background border border-border" />
          <input placeholder="Last" value={lastName} onChange={(e) => setLastName(e.target.value)}
            className="px-2.5 py-1.5 rounded text-sm text-foreground outline-none bg-background border border-border" />
          <input placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)}
            className="px-2.5 py-1.5 rounded text-sm text-foreground outline-none bg-background border border-border" />
          <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
            className="px-2.5 py-1.5 rounded text-sm text-foreground outline-none bg-background border border-border" />
          <select value={role} onChange={(e) => setRole(e.target.value as EmployeeRole)}
            className="px-2.5 py-1.5 rounded text-sm text-foreground outline-none bg-background border border-border">
            {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select value={locationId} onChange={(e) => setLocationId(e.target.value)}
            className="px-2.5 py-1.5 rounded text-sm text-foreground outline-none bg-background border border-border">
            <option value="">No location</option>
            {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>
        <div className="flex justify-end gap-2 mt-2">
          <button onClick={onClose} className="px-3 py-1.5 rounded text-xs text-muted-foreground border border-border">Cancel</button>
          <button onClick={() => createMut.mutate({
            firstName, lastName, role, phone, email,
            locationId: locationId ? Number(locationId) : null,
          })} disabled={!firstName.trim() || createMut.isPending}
            className="px-3 py-1.5 rounded text-xs font-semibold disabled:opacity-40"
            style={{ background: "oklch(0.78 0.12 75)", color: "oklch(0.10 0.008 265)" }}>
            {createMut.isPending ? "Adding..." : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Employees() {
  return <CrmLayout><EmployeesContent /></CrmLayout>;
}
