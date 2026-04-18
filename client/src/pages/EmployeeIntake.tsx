import { trpc } from "@/lib/trpc";
import { CrmLayout, useCrmOrg } from "@/components/CrmLayout";
import type { EmployeeIntake, IntakeStatus } from "@shared/types";
import { UserCheck } from "lucide-react";
import { PageHeader } from "@/components/ui/page";

const STAGES: { value: IntakeStatus; label: string; color: string }[] = [
  { value: "applied",    label: "Applied",    color: "oklch(0.65 0.18 250)" },
  { value: "screening",  label: "Screening",  color: "oklch(0.65 0.18 200)" },
  { value: "interview",  label: "Interview",  color: "oklch(0.65 0.18 150)" },
  { value: "offer",      label: "Offer",      color: "oklch(0.78 0.12 75)" },
  { value: "hired",      label: "Hired",      color: "oklch(0.70 0.18 145)" },
  { value: "rejected",   label: "Rejected",   color: "oklch(0.65 0.15 25)" },
];

function IntakeContent() {
  const orgQuery = useCrmOrg();
  const utils = trpc.useUtils();
  const { data: intakes } = trpc.hr.listIntakes.useQuery(undefined, { enabled: !!orgQuery.data });
  const updateMut = trpc.hr.updateIntakeStatus.useMutation({
    onSuccess: () => utils.hr.listIntakes.invalidate(),
  });

  const byStage: Record<IntakeStatus, EmployeeIntake[]> = {
    applied: [], screening: [], interview: [], offer: [], hired: [], rejected: [],
  };
  for (const i of (intakes ?? []) as EmployeeIntake[]) byStage[i.status].push(i);

  return (
    <div>
      <PageHeader
        eyebrow="HR & Ops"
        eyebrowIcon={UserCheck}
        title="Employee Intake"
        subtitle={`${intakes?.length ?? 0} applicants in the hiring pipeline`}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {STAGES.map((s) => (
          <div key={s.value} className="rounded-xl min-h-[300px] bg-surface/40 backdrop-blur-sm border border-white/5 overflow-hidden">
            <div className="px-3 py-2.5 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: s.color, boxShadow: `0 0 6px ${s.color}` }} />
                <span className="text-foreground text-[11px] font-semibold tracking-wide">{s.label}</span>
              </div>
              <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold tabular-nums border"
                style={{ background: `${s.color}14`, color: s.color, borderColor: `${s.color}30` }}>
                {byStage[s.value].length}
              </span>
            </div>
            <div className="flex flex-col gap-2 p-2">
              {byStage[s.value].length === 0 ? (
                <p className="text-muted-foreground text-xs text-center py-4">—</p>
              ) : byStage[s.value].map((i) => (
                <div key={i.id} className="rounded-lg p-2.5 border border-white/5 bg-background/40 hover:border-primary/20 transition-colors">
                  <p className="text-foreground text-sm font-medium">{i.applicant_name}</p>
                  <p className="text-muted-foreground text-xs capitalize">{i.role_applied}</p>
                  <p className="text-muted-foreground text-[10px] mt-1">{i.email}</p>
                  <select value={i.status}
                    onChange={(e) => updateMut.mutate({ intakeId: i.id, status: e.target.value as IntakeStatus })}
                    className="mt-2 w-full px-2 py-1 rounded-md text-[10px] text-foreground outline-none bg-background/60 border border-white/10 focus:border-primary/40 capitalize">
                    {STAGES.map((st) => <option key={st.value} value={st.value}>{st.label}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function EmployeeIntake() {
  return <CrmLayout><IntakeContent /></CrmLayout>;
}
