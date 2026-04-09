import { trpc } from "@/lib/trpc";
import { CrmLayout, useCrmOrg } from "@/components/CrmLayout";
import { motion } from "framer-motion";
import { Users, DollarSign, TrendingUp, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import type { Contact, ContactStage, Task, Deal } from "@shared/types";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const STAGE_COLORS: Record<ContactStage, string> = {
  lead: "#6e8efe",
  contacted: "#5ec4d4",
  qualified: "#5ed47e",
  proposal: "#c9a84c",
  won: "#4caf50",
  lost: "#e57373",
};

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; color?: string;
}) {
  return (
    <motion.div variants={fadeUp}
      className="rounded-xl p-5 flex items-start gap-4 bg-surface border border-border">
      <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: `${color || "oklch(0.78 0.12 75)"}20` }}>
        <Icon className="w-5 h-5" style={{ color: color || "oklch(0.78 0.12 75)" }} />
      </div>
      <div>
        <p className="text-muted-foreground text-xs uppercase tracking-widest mb-0.5">{label}</p>
        <p className="text-foreground text-2xl font-bold leading-none">{value}</p>
        {sub && <p className="text-muted-foreground text-xs mt-1">{sub}</p>}
      </div>
    </motion.div>
  );
}

function DashboardContent() {
  const orgQuery = useCrmOrg();
  const { data: contacts } = trpc.contacts.list.useQuery(undefined, { enabled: !!orgQuery.data });
  const { data: tasks } = trpc.tasks.list.useQuery(undefined, { enabled: !!orgQuery.data });

  const totalContacts = contacts?.length ?? 0;

  // Pipeline breakdown
  const byStage = (contacts ?? []).reduce<Record<string, number>>((acc, c: Contact) => {
    acc[c.stage] = (acc[c.stage] || 0) + 1;
    return acc;
  }, {});

  const pipelineData = (["lead", "contacted", "qualified", "proposal", "won", "lost"] as ContactStage[]).map((stage) => ({
    name: stage.charAt(0).toUpperCase() + stage.slice(1),
    value: byStage[stage] || 0,
    fill: STAGE_COLORS[stage],
  }));

  // Task stats
  const pendingTasks = (tasks ?? []).filter((t: Task) => t.status === "pending").length;
  const overdueTasks = (tasks ?? []).filter((t: Task) => {
    if (!t.due_date || t.status !== "pending") return false;
    return new Date(t.due_date) < new Date(new Date().toDateString());
  }).length;
  const completedTasks = (tasks ?? []).filter((t: Task) => t.status === "completed").length;

  // Conversion rate
  const won = byStage["won"] || 0;
  const lost = byStage["lost"] || 0;
  const conversionRate = won + lost > 0 ? Math.round((won / (won + lost)) * 100) : 0;

  // Signups over time (last 30 days, grouped by week)
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
  const recentContacts = (contacts ?? []).filter((c: Contact) => new Date(c.created_at) > thirtyDaysAgo);
  const weeklyData: { week: string; count: number }[] = [];
  for (let i = 3; i >= 0; i--) {
    const weekStart = new Date(now.getTime() - (i + 1) * 7 * 86400000);
    const weekEnd = new Date(now.getTime() - i * 7 * 86400000);
    const count = recentContacts.filter((c: Contact) => {
      const d = new Date(c.created_at);
      return d >= weekStart && d < weekEnd;
    }).length;
    weeklyData.push({
      week: weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      count,
    });
  }

  // Pie chart data for stages (exclude empty)
  const pieData = pipelineData.filter((d) => d.value > 0);

  return (
    <div>
      <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.06 } } }}>
        <motion.div variants={fadeUp} className="mb-6">
          <h1 className="font-display text-4xl text-foreground mb-1">
            GRID <span className="text-primary">DASHBOARD</span>
          </h1>
          <p className="text-muted-foreground text-sm">
            {orgQuery.data?.name} — Overview & Analytics
          </p>
        </motion.div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard icon={Users} label="Total Contacts" value={totalContacts} sub="All time" />
          <StatCard icon={TrendingUp} label="Conversion Rate" value={`${conversionRate}%`} sub={`${won} won / ${won + lost} closed`} color="#4caf50" />
          <StatCard icon={CheckCircle} label="Tasks Done" value={completedTasks} sub={`${pendingTasks} pending`} color="#5ec4d4" />
          <StatCard icon={AlertTriangle} label="Overdue" value={overdueTasks} sub="Need attention" color={overdueTasks > 0 ? "#e57373" : "#4caf50"} />
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Pipeline bar chart */}
          <motion.div variants={fadeUp} className="rounded-xl p-5 bg-surface border border-border">
            <h3 className="text-foreground text-sm font-semibold mb-4">Pipeline Breakdown</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={pipelineData}>
                <XAxis dataKey="name" tick={{ fill: "#888", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#888", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: "#1a1a2e", border: "1px solid #2a2a3a", borderRadius: 8, color: "#fff", fontSize: 12 }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {pipelineData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Stage distribution pie */}
          <motion.div variants={fadeUp} className="rounded-xl p-5 bg-surface border border-border">
            <h3 className="text-foreground text-sm font-semibold mb-4">Stage Distribution</h3>
            {pieData.length === 0 ? (
              <div className="flex items-center justify-center h-[250px]">
                <p className="text-muted-foreground text-sm">No contacts yet</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, value }) => `${name}: ${value}`}>
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#1a1a2e", border: "1px solid #2a2a3a", borderRadius: 8, color: "#fff", fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </motion.div>
        </div>

        {/* Weekly signups chart */}
        <motion.div variants={fadeUp} className="rounded-xl p-5 bg-surface border border-border">
          <h3 className="text-foreground text-sm font-semibold mb-4">New Contacts — Last 4 Weeks</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={weeklyData}>
              <XAxis dataKey="week" tick={{ fill: "#888", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#888", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "#1a1a2e", border: "1px solid #2a2a3a", borderRadius: 8, color: "#fff", fontSize: 12 }} />
              <Bar dataKey="count" fill="oklch(0.78 0.12 75)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </motion.div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <CrmLayout>
      <DashboardContent />
    </CrmLayout>
  );
}
