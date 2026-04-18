import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { CrmLayout, useCrmOrg } from "@/components/CrmLayout";
import type { WriteUp, WriteUpSeverity } from "@shared/types";
import { Plus, FileText } from "lucide-react";
import { PageHeader, PrimaryButton } from "@/components/ui/page";

const SEV_STYLES: Record<WriteUpSeverity, { label: string; bg: string; text: string }> = {
  verbal:  { label: "Verbal",  bg: "oklch(0.55 0.10 250 / 18%)", text: "oklch(0.70 0.15 250)" },
  written: { label: "Written", bg: "oklch(0.72 0.15 75 / 18%)",  text: "oklch(0.78 0.12 75)" },
  final:   { label: "Final",   bg: "oklch(0.55 0.15 25 / 18%)",  text: "oklch(0.70 0.18 25)" },
};

function WriteUpsContent() {
  const orgQuery = useCrmOrg();
  const utils = trpc.useUtils();
  const [createOpen, setCreateOpen] = useState(false);

  const { data: writeUps } = trpc.hr.listWriteUps.useQuery(undefined, { enabled: !!orgQuery.data });
  const { data: employees } = trpc.hr.listEmployees.useQuery(undefined, { enabled: !!orgQuery.data });

  const empMap: Record<number, string> = {};
  for (const e of employees ?? []) empMap[(e as any).id] = `${(e as any).first_name} ${(e as any).last_name}`;

  return (
    <div>
      <PageHeader
        eyebrow="HR & Ops"
        eyebrowIcon={FileText}
        title="Write-Ups"
        subtitle={`${writeUps?.length ?? 0} records — disciplinary actions across all employees`}
        actions={<PrimaryButton icon={Plus} onClick={() => setCreateOpen(true)}>Issue Write-up</PrimaryButton>}
      />

      <div className="rounded-xl overflow-hidden bg-surface/60 backdrop-blur-sm border border-white/5">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              <th className="px-4 py-3 text-left text-muted-foreground text-[11px] font-semibold">Date</th>
              <th className="px-4 py-3 text-left text-muted-foreground text-[11px] font-semibold">Employee</th>
              <th className="px-4 py-3 text-left text-muted-foreground text-[11px] font-semibold">Reason</th>
              <th className="px-4 py-3 text-left text-muted-foreground text-[11px] font-semibold">Severity</th>
              <th className="px-4 py-3 text-left text-muted-foreground text-[11px] font-semibold">Acknowledged</th>
            </tr>
          </thead>
          <tbody>
            {(!writeUps || writeUps.length === 0) ? (
              <tr><td colSpan={5} className="px-4 py-12 text-center text-muted-foreground text-sm">No write-ups.</td></tr>
            ) : (writeUps as WriteUp[]).map((w) => {
              const sev = SEV_STYLES[w.severity];
              return (
                <tr key={w.id} className="border-b border-white/[0.04] last:border-b-0 hover:bg-white/[0.02]">
                  <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(w.write_up_date).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-foreground text-sm">{empMap[w.employee_id] ?? "—"}</td>
                  <td className="px-4 py-3 text-foreground text-sm max-w-md truncate">{w.reason}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold"
                      style={{ background: sev.bg, color: sev.text }}>{sev.label}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {w.acknowledged ? "Yes" : "No"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {createOpen && <IssueWriteUpModal
        onClose={() => setCreateOpen(false)}
        onCreated={() => { utils.hr.listWriteUps.invalidate(); setCreateOpen(false); }}
        employees={(employees ?? []) as any[]}
      />}
    </div>
  );
}

function IssueWriteUpModal({ onClose, onCreated, employees }: {
  onClose: () => void; onCreated: () => void; employees: any[];
}) {
  const [employeeId, setEmployeeId] = useState<string>("");
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<WriteUpSeverity>("verbal");

  const createMut = trpc.hr.createWriteUp.useMutation({ onSuccess: onCreated });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-xl p-6 bg-surface border border-border flex flex-col gap-3">
        <h2 className="text-foreground text-lg font-bold flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" /> Issue Write-up
        </h2>
        <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}
          className="px-2.5 py-1.5 rounded text-sm text-foreground outline-none bg-background border border-border">
          <option value="">Select employee...</option>
          {employees.map((e) => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
        </select>
        <input placeholder="Reason (short)" value={reason} onChange={(e) => setReason(e.target.value)}
          className="px-2.5 py-1.5 rounded text-sm text-foreground outline-none bg-background border border-border" />
        <textarea placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
          className="px-2.5 py-1.5 rounded text-sm text-foreground outline-none resize-none bg-background border border-border" />
        <select value={severity} onChange={(e) => setSeverity(e.target.value as WriteUpSeverity)}
          className="px-2.5 py-1.5 rounded text-sm text-foreground outline-none bg-background border border-border">
          <option value="verbal">Verbal</option>
          <option value="written">Written</option>
          <option value="final">Final</option>
        </select>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1.5 rounded text-xs text-muted-foreground border border-border">Cancel</button>
          <button onClick={() => createMut.mutate({
            employeeId: Number(employeeId), reason, description, severity,
          })} disabled={!employeeId || !reason.trim() || createMut.isPending}
            className="px-3 py-1.5 rounded text-xs font-semibold disabled:opacity-40"
            style={{ background: "oklch(0.78 0.12 75)", color: "oklch(0.10 0.008 265)" }}>
            {createMut.isPending ? "Issuing..." : "Issue"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function WriteUps() {
  return <CrmLayout><WriteUpsContent /></CrmLayout>;
}
