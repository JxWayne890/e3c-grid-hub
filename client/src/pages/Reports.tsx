import { useState } from "react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid,
} from "recharts";
import { trpc } from "@/lib/trpc";
import { CrmLayout, useCrmOrg } from "@/components/CrmLayout";
import { Download, BarChart3 } from "lucide-react";
import { PageHeader, GhostButton, StatCard as SharedStatCard } from "@/components/ui/page";

type Tab = "revenue" | "leads" | "campaigns" | "calls" | "employees";

const PIE_COLORS = ["oklch(0.78 0.12 75)", "oklch(0.65 0.18 250)", "oklch(0.70 0.18 145)", "oklch(0.65 0.18 200)", "oklch(0.70 0.18 25)"];

function ReportsContent() {
  const orgQuery = useCrmOrg();
  const [tab, setTab] = useState<Tab>("revenue");

  const revenueQ = trpc.reports.revenue.useQuery(undefined, { enabled: !!orgQuery.data && tab === "revenue" });
  const leadsQ = trpc.reports.leadConversion.useQuery(undefined, { enabled: !!orgQuery.data && tab === "leads" });
  const campsQ = trpc.reports.campaignPerformance.useQuery(undefined, { enabled: !!orgQuery.data && tab === "campaigns" });
  const callsQ = trpc.reports.callAnalytics.useQuery(undefined, { enabled: !!orgQuery.data && tab === "calls" });
  const empsQ = trpc.reports.employeePerformance.useQuery(undefined, { enabled: !!orgQuery.data && tab === "employees" });

  const tabs: { value: Tab; label: string }[] = [
    { value: "revenue", label: "Revenue" },
    { value: "leads", label: "Leads" },
    { value: "campaigns", label: "Campaigns" },
    { value: "calls", label: "Calls" },
    { value: "employees", label: "Employees" },
  ];

  const exportCsv = (rows: any[]) => {
    if (!rows || rows.length === 0) return;
    const keys = Object.keys(rows[0]);
    const csv = [keys.join(","), ...rows.map((r) => keys.map((k) => `"${String(r[k] ?? "")}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${tab}-report.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <PageHeader
        eyebrow="Analytics"
        eyebrowIcon={BarChart3}
        title="Reports"
        subtitle="Aggregated analytics across revenue, leads, campaigns, calls, and employees"
        actions={
          <GhostButton icon={Download} onClick={() => {
            const data =
              tab === "revenue" ? revenueQ.data?.byMonth
              : tab === "leads" ? leadsQ.data?.bySource
              : tab === "campaigns" ? campsQ.data
              : tab === "calls" ? callsQ.data?.byType
              : empsQ.data;
            exportCsv(data as any[]);
          }}>
            Export CSV
          </GhostButton>
        }
      />

      <div className="flex items-center gap-1 mb-6 border-b border-white/5">
        {tabs.map((t) => (
          <button key={t.value} onClick={() => setTab(t.value)}
            className={`px-4 py-2.5 text-xs font-semibold transition-colors border-b-2 -mb-px ${
              tab === t.value ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "revenue" && revenueQ.data && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Revenue Won" value={`$${revenueQ.data.totalWon.toLocaleString()}`} />
            <StatCard label="Pipeline Value" value={`$${revenueQ.data.totalPipeline.toLocaleString()}`} />
            <StatCard label="Deals Won" value={revenueQ.data.wonCount} />
            <StatCard label="Deals Open" value={revenueQ.data.pipelineCount} />
          </div>
          <ChartCard title="Revenue by Month">
            <BarChart data={revenueQ.data.byMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.22 0.009 265)" />
              <XAxis dataKey="month" stroke="oklch(0.55 0.01 265)" fontSize={11} />
              <YAxis stroke="oklch(0.55 0.01 265)" fontSize={11} />
              <Tooltip contentStyle={{ background: "oklch(0.13 0.008 265)", border: "1px solid oklch(0.22 0.009 265)", borderRadius: 8 }} />
              <Bar dataKey="value" fill="oklch(0.78 0.12 75)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartCard>
        </div>
      )}

      {tab === "leads" && leadsQ.data && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Total Leads" value={leadsQ.data.total} />
            <StatCard label="Converted" value={leadsQ.data.converted} />
            <StatCard label="Lost" value={leadsQ.data.lost} />
            <StatCard label="Conversion Rate" value={`${leadsQ.data.conversionRate}%`} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ChartCard title="By Source">
              <PieChart>
                <Pie data={leadsQ.data.bySource} dataKey="value" nameKey="name" innerRadius={40} outerRadius={80}>
                  {leadsQ.data.bySource.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "oklch(0.13 0.008 265)", border: "1px solid oklch(0.22 0.009 265)", borderRadius: 8 }} />
              </PieChart>
            </ChartCard>
            <ChartCard title="By Temperature">
              <BarChart data={leadsQ.data.byTemperature}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.22 0.009 265)" />
                <XAxis dataKey="name" stroke="oklch(0.55 0.01 265)" fontSize={11} />
                <YAxis stroke="oklch(0.55 0.01 265)" fontSize={11} />
                <Tooltip contentStyle={{ background: "oklch(0.13 0.008 265)", border: "1px solid oklch(0.22 0.009 265)", borderRadius: 8 }} />
                <Bar dataKey="value" fill="oklch(0.65 0.18 250)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartCard>
          </div>
        </div>
      )}

      {tab === "campaigns" && campsQ.data && (
        <ChartCard title="Open & Click Rates by Campaign">
          <BarChart data={campsQ.data}>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.22 0.009 265)" />
            <XAxis dataKey="name" stroke="oklch(0.55 0.01 265)" fontSize={10} angle={-15} textAnchor="end" height={70} />
            <YAxis stroke="oklch(0.55 0.01 265)" fontSize={11} />
            <Tooltip contentStyle={{ background: "oklch(0.13 0.008 265)", border: "1px solid oklch(0.22 0.009 265)", borderRadius: 8 }} />
            <Bar dataKey="openRate" name="Open %" fill="oklch(0.78 0.12 75)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="clickRate" name="Click %" fill="oklch(0.65 0.18 250)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartCard>
      )}

      {tab === "calls" && callsQ.data && (
        <div className="flex flex-col gap-4">
          <StatCard label="Total Calls (60d)" value={callsQ.data.total} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ChartCard title="Calls by Type">
              <PieChart>
                <Pie data={callsQ.data.byType} dataKey="value" nameKey="name" innerRadius={40} outerRadius={80}>
                  {callsQ.data.byType.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "oklch(0.13 0.008 265)", border: "1px solid oklch(0.22 0.009 265)", borderRadius: 8 }} />
              </PieChart>
            </ChartCard>
            <ChartCard title="Weekly Call Volume">
              <LineChart data={callsQ.data.weekly}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.22 0.009 265)" />
                <XAxis dataKey="week" stroke="oklch(0.55 0.01 265)" fontSize={10} />
                <YAxis stroke="oklch(0.55 0.01 265)" fontSize={11} />
                <Tooltip contentStyle={{ background: "oklch(0.13 0.008 265)", border: "1px solid oklch(0.22 0.009 265)", borderRadius: 8 }} />
                <Line type="monotone" dataKey="value" stroke="oklch(0.78 0.12 75)" strokeWidth={2} />
              </LineChart>
            </ChartCard>
          </div>
        </div>
      )}

      {tab === "employees" && empsQ.data && (
        <div className="rounded-xl overflow-hidden bg-surface/60 backdrop-blur-sm border border-white/5">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="px-4 py-3 text-left text-muted-foreground text-[11px] font-semibold">Employee</th>
                <th className="px-4 py-3 text-left text-muted-foreground text-[11px] font-semibold">Role</th>
                <th className="px-4 py-3 text-left text-muted-foreground text-[11px] font-semibold">Status</th>
                <th className="px-4 py-3 text-left text-muted-foreground text-[11px] font-semibold">Write-ups</th>
                <th className="px-4 py-3 text-left text-muted-foreground text-[11px] font-semibold">Incidents</th>
              </tr>
            </thead>
            <tbody>
              {empsQ.data.map((e: any) => (
                <tr key={e.id} className="border-b border-white/[0.04] last:border-b-0 hover:bg-white/[0.02]">
                  <td className="px-4 py-3 text-foreground text-sm font-medium">{e.first_name} {e.last_name}</td>
                  <td className="px-4 py-3 text-muted-foreground text-sm capitalize">{e.role}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs capitalize">{e.status}</td>
                  <td className="px-4 py-3 text-foreground text-sm">{e.write_ups}</td>
                  <td className="px-4 py-3 text-foreground text-sm">{e.incidents}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const StatCard = SharedStatCard;

function ChartCard({ title, children }: { title: string; children: React.ReactElement }) {
  return (
    <div className="rounded-xl p-5 bg-surface/60 backdrop-blur-sm border border-white/5">
      <p className="text-foreground text-sm font-semibold mb-4">{title}</p>
      <div style={{ width: "100%", height: 280 }}>
        <ResponsiveContainer>{children}</ResponsiveContainer>
      </div>
    </div>
  );
}

export default function Reports() {
  return <CrmLayout><ReportsContent /></CrmLayout>;
}
