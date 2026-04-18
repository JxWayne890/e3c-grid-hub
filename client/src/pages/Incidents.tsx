import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { CrmLayout, useCrmOrg } from "@/components/CrmLayout";
import type { IncidentReport } from "@shared/types";
import { Plus, AlertTriangle } from "lucide-react";
import { PageHeader, PrimaryButton } from "@/components/ui/page";

const SEV_STYLES: Record<string, { bg: string; text: string }> = {
  low:      { bg: "oklch(0.55 0.10 250 / 18%)", text: "oklch(0.70 0.15 250)" },
  medium:   { bg: "oklch(0.72 0.15 75 / 18%)",  text: "oklch(0.78 0.12 75)" },
  high:     { bg: "oklch(0.60 0.15 25 / 18%)",  text: "oklch(0.70 0.18 25)" },
  critical: { bg: "oklch(0.50 0.20 25 / 25%)",  text: "oklch(0.75 0.20 25)" },
};

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  open:          { bg: "oklch(0.55 0.15 25 / 18%)",  text: "oklch(0.70 0.18 25)" },
  investigating: { bg: "oklch(0.72 0.15 75 / 18%)",  text: "oklch(0.78 0.12 75)" },
  resolved:      { bg: "oklch(0.55 0.15 145 / 18%)", text: "oklch(0.70 0.18 145)" },
};

function fmtDateTime(d: string) {
  return new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function IncidentsContent() {
  const orgQuery = useCrmOrg();
  const utils = trpc.useUtils();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [createOpen, setCreateOpen] = useState(false);

  const { data: incidents } = trpc.hr.listIncidents.useQuery(
    statusFilter === "all" ? undefined : { status: statusFilter as any },
    { enabled: !!orgQuery.data }
  );
  const { data: employees } = trpc.hr.listEmployees.useQuery(undefined, { enabled: !!orgQuery.data });

  const updateMut = trpc.hr.updateIncident.useMutation({
    onSuccess: () => utils.hr.listIncidents.invalidate(),
  });

  const empMap: Record<number, string> = {};
  for (const e of employees ?? []) empMap[(e as any).id] = `${(e as any).first_name} ${(e as any).last_name}`;

  return (
    <div>
      <PageHeader
        eyebrow="HR & Ops"
        eyebrowIcon={AlertTriangle}
        title="Incident Reports"
        subtitle={`${incidents?.length ?? 0} incident${(incidents?.length ?? 0) === 1 ? "" : "s"} filed`}
        actions={
          <>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-lg text-xs text-foreground outline-none bg-surface/60 border border-white/10 focus:border-primary/40">
              <option value="all">All statuses</option>
              <option value="open">Open</option>
              <option value="investigating">Investigating</option>
              <option value="resolved">Resolved</option>
            </select>
            <PrimaryButton icon={Plus} onClick={() => setCreateOpen(true)}>File Incident</PrimaryButton>
          </>
        }
      />

      <div className="rounded-xl overflow-hidden bg-surface/60 backdrop-blur-sm border border-white/5">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              <th className="px-4 py-3 text-left text-muted-foreground text-[11px] font-semibold">Date</th>
              <th className="px-4 py-3 text-left text-muted-foreground text-[11px] font-semibold">Type</th>
              <th className="px-4 py-3 text-left text-muted-foreground text-[11px] font-semibold">Severity</th>
              <th className="px-4 py-3 text-left text-muted-foreground text-[11px] font-semibold">Employee</th>
              <th className="px-4 py-3 text-left text-muted-foreground text-[11px] font-semibold">Description</th>
              <th className="px-4 py-3 text-left text-muted-foreground text-[11px] font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {(!incidents || incidents.length === 0) ? (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground text-sm">No incidents.</td></tr>
            ) : (incidents as IncidentReport[]).map((inc) => {
              const sev = SEV_STYLES[inc.severity];
              const st = STATUS_STYLES[inc.status];
              return (
                <tr key={inc.id} className="border-b border-white/[0.04] last:border-b-0 hover:bg-white/[0.02]">
                  <td className="px-4 py-3 text-muted-foreground text-xs">{fmtDateTime(inc.incident_date)}</td>
                  <td className="px-4 py-3 text-foreground text-sm capitalize">{inc.type.replace(/_/g, " ")}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold capitalize"
                      style={{ background: sev.bg, color: sev.text }}>{inc.severity}</span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{inc.employee_id ? empMap[inc.employee_id] ?? "—" : "—"}</td>
                  <td className="px-4 py-3 text-foreground text-sm max-w-md truncate">{inc.description}</td>
                  <td className="px-4 py-3">
                    <select value={inc.status} onChange={(e) => updateMut.mutate({ incidentId: inc.id, status: e.target.value as any })}
                      className="px-2 py-0.5 rounded text-[10px] font-semibold border-0 outline-none capitalize"
                      style={{ background: st.bg, color: st.text }}>
                      <option value="open">Open</option>
                      <option value="investigating">Investigating</option>
                      <option value="resolved">Resolved</option>
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {createOpen && <FileIncidentModal
        onClose={() => setCreateOpen(false)}
        onCreated={() => { utils.hr.listIncidents.invalidate(); setCreateOpen(false); }}
        employees={(employees ?? []) as any[]}
      />}
    </div>
  );
}

function FileIncidentModal({ onClose, onCreated, employees }: {
  onClose: () => void; onCreated: () => void; employees: any[];
}) {
  const [type, setType] = useState<any>("damage");
  const [severity, setSeverity] = useState<any>("medium");
  const [description, setDescription] = useState("");
  const [employeeId, setEmployeeId] = useState<string>("");

  const createMut = trpc.hr.createIncident.useMutation({ onSuccess: onCreated });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-xl p-6 bg-surface border border-border flex flex-col gap-3">
        <h2 className="text-foreground text-lg font-bold flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-[oklch(0.70_0.18_25)]" /> File Incident
        </h2>
        <select value={type} onChange={(e) => setType(e.target.value)}
          className="px-2.5 py-1.5 rounded text-sm text-foreground outline-none bg-background border border-border">
          {["damage", "theft", "injury", "customer_complaint", "safety", "other"].map((t) =>
            <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
        </select>
        <select value={severity} onChange={(e) => setSeverity(e.target.value)}
          className="px-2.5 py-1.5 rounded text-sm text-foreground outline-none bg-background border border-border">
          <option value="low">Low</option><option value="medium">Medium</option>
          <option value="high">High</option><option value="critical">Critical</option>
        </select>
        <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}
          className="px-2.5 py-1.5 rounded text-sm text-foreground outline-none bg-background border border-border">
          <option value="">No employee attached</option>
          {employees.map((e) => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
        </select>
        <textarea placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)}
          rows={4}
          className="px-2.5 py-1.5 rounded text-sm text-foreground outline-none resize-none bg-background border border-border" />
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1.5 rounded text-xs text-muted-foreground border border-border">Cancel</button>
          <button onClick={() => createMut.mutate({
            type, severity, description,
            employeeId: employeeId ? Number(employeeId) : null,
          })} disabled={!description.trim() || createMut.isPending}
            className="px-3 py-1.5 rounded text-xs font-semibold disabled:opacity-40"
            style={{ background: "oklch(0.78 0.12 75)", color: "oklch(0.10 0.008 265)" }}>
            {createMut.isPending ? "Filing..." : "File"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Incidents() {
  return <CrmLayout><IncidentsContent /></CrmLayout>;
}
