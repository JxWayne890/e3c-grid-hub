import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { CrmLayout, useCrmOrg } from "@/components/CrmLayout";
import { Folder, FileText } from "lucide-react";
import { PageHeader } from "@/components/ui/page";

const CATEGORY_LABELS: Record<string, string> = {
  id: "ID", contract: "Contract", training: "Training", medical: "Medical", other: "Other",
};

function FileManagementContent() {
  const orgQuery = useCrmOrg();
  const [employeeId, setEmployeeId] = useState<number | null>(null);

  const { data: employees } = trpc.hr.listEmployees.useQuery(undefined, { enabled: !!orgQuery.data });
  const { data: files } = trpc.hr.listFiles.useQuery(
    { employeeId: employeeId! },
    { enabled: !!employeeId }
  );

  return (
    <div>
      <PageHeader
        eyebrow="HR & Ops"
        eyebrowIcon={Folder}
        title="File Management"
        subtitle="Employee documents — select an employee to view their files"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rounded-xl p-3 bg-surface/60 backdrop-blur-sm border border-white/5 lg:col-span-1 max-h-[600px] overflow-y-auto">
          <p className="text-muted-foreground text-[10px] uppercase tracking-widest px-2 py-1">Employees</p>
          {(employees ?? []).map((e: any) => (
            <button key={e.id}
              onClick={() => setEmployeeId(e.id)}
              className={`w-full text-left px-2 py-2 rounded hover:bg-white/5 transition-colors ${
                employeeId === e.id ? "bg-primary/15 text-primary" : "text-foreground"
              }`}>
              <p className="text-sm font-medium">{e.first_name} {e.last_name}</p>
              <p className="text-muted-foreground text-xs capitalize">{e.role}</p>
            </button>
          ))}
        </div>

        <div className="rounded-xl p-5 bg-surface/60 backdrop-blur-sm border border-white/5 lg:col-span-2 min-h-[400px]">
          {!employeeId ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Folder className="w-10 h-10 mb-3 opacity-40" />
              <p className="text-sm">Select an employee to view their files.</p>
            </div>
          ) : !files || files.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Folder className="w-10 h-10 mb-3 opacity-40" />
              <p className="text-sm">No files uploaded for this employee.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {(files as any[]).map((f) => (
                <div key={f.id} className="flex items-center gap-3 p-3 rounded-lg border border-white/5 bg-background/40">
                  <FileText className="w-4 h-4 text-primary" />
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground text-sm font-medium">{f.file_name}</p>
                    <p className="text-muted-foreground text-xs">{CATEGORY_LABELS[f.category] ?? f.category}</p>
                  </div>
                  <span className="text-muted-foreground text-[10px]">{new Date(f.uploaded_at).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function FileManagement() {
  return <CrmLayout><FileManagementContent /></CrmLayout>;
}
