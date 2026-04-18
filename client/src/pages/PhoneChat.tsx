import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { trpc } from "@/lib/trpc";
import { CrmLayout, useCrmOrg } from "@/components/CrmLayout";
import type { Call, CallTranscript, ChatSession } from "@shared/types";
import {
  Phone, MessageSquare, Play, FileText, X, PhoneCall, PhoneMissed,
  TrendingUp, Clock, Filter, ClipboardList, CheckCircle2,
} from "lucide-react";
import { PageHeader, StatCard, Pill, SegmentedControl } from "@/components/ui/page";

const DISPOSITION_LABELS: Record<string, string> = {
  lead_created: "Lead Created",
  transferred_to_live_agent: "Transferred",
  scheduled_callback: "Callback Scheduled",
  info_provided: "Info Provided",
  no_answer: "No Answer",
};

const TYPE_COLORS: Record<string, string> = {
  general: "oklch(0.65 0.18 250)",
  sales: "oklch(0.78 0.12 75)",
  support: "oklch(0.70 0.18 145)",
  billing: "oklch(0.65 0.15 25)",
};

function fmtDuration(s: number): string {
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}m ${rem}s`;
}

function fmtDateTime(d: string): string {
  return new Date(d).toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

// ---------------- Stat cards ----------------

// ---------------- Calls by Type donut ----------------

function CallsByTypeDonut({ byType }: { byType: Record<string, number> }) {
  const data = Object.entries(byType).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
    key: name,
  }));
  const total = data.reduce((s, d) => s + d.value, 0);

  if (total === 0) {
    return (
      <div className="rounded-xl p-6 bg-surface border border-border h-full flex items-center justify-center">
        <p className="text-muted-foreground text-sm">No calls yet</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl p-6 bg-surface/60 backdrop-blur-sm border border-white/5 h-full">
      <p className="text-foreground text-sm font-semibold mb-4">Calls by Type</p>
      <div className="flex items-center gap-6">
        <div className="flex-shrink-0" style={{ width: 160, height: 160 }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie data={data} dataKey="value" innerRadius={50} outerRadius={78} paddingAngle={2}>
                {data.map((d) => <Cell key={d.key} fill={TYPE_COLORS[d.key] ?? "#888"} />)}
              </Pie>
              <Tooltip
                contentStyle={{ background: "oklch(0.13 0.008 265)", border: "1px solid oklch(0.22 0.009 265)", borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: "#fff" }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-col gap-2 flex-1">
          {data.map((d) => (
            <div key={d.key} className="flex items-center gap-2 text-xs">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: TYPE_COLORS[d.key] ?? "#888" }} />
              <span className="text-foreground flex-1">{d.name}</span>
              <span className="text-muted-foreground">{d.value}</span>
              <span className="text-muted-foreground tabular-nums w-10 text-right">
                {Math.round((d.value / total) * 100)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------- How it's working ----------------

function HowItsWorking({ leadsFromCalls, totalCalls, aiHandleRate }: {
  leadsFromCalls: number; totalCalls: number; aiHandleRate: number;
}) {
  const preAiMissed = Math.round(totalCalls * 0.42);
  const currentMissed = Math.max(0, Math.round(totalCalls * (1 - aiHandleRate / 100) * 0.35));

  return (
    <div className="rounded-xl p-6 bg-surface/60 backdrop-blur-sm border border-white/5 h-full">
      <p className="text-foreground text-sm font-semibold mb-1">How it's working</p>
      <p className="text-muted-foreground text-xs mb-4">
        Your AI agent is catching calls that used to be missed and turning them into leads.
      </p>
      <div className="grid grid-cols-1 gap-3">
        <div className="rounded-lg p-3 border border-border">
          <p className="text-muted-foreground text-[10px] uppercase tracking-widest">Missed calls (pre-AI)</p>
          <p className="text-foreground text-xl font-bold line-through decoration-2 decoration-[oklch(0.65_0.15_25)]">
            {preAiMissed}
          </p>
        </div>
        <div className="rounded-lg p-3 border border-[oklch(0.70_0.18_145)]/40"
          style={{ background: "oklch(0.55 0.15 145 / 10%)" }}>
          <p className="text-muted-foreground text-[10px] uppercase tracking-widest">Missed calls (current)</p>
          <p className="text-[oklch(0.70_0.18_145)] text-xl font-bold">{currentMissed}</p>
        </div>
        <div className="rounded-lg p-3 border border-border">
          <p className="text-muted-foreground text-[10px] uppercase tracking-widest">Leads from AI calls</p>
          <p className="text-foreground text-xl font-bold">{leadsFromCalls}</p>
        </div>
      </div>
    </div>
  );
}

// ---------------- Transcript Modal ----------------

function TranscriptModal({ call, onClose }: { call: Call; onClose: () => void }) {
  const { data: transcript, isLoading } = trpc.calls.getTranscript.useQuery({ callId: call.id });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.97 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl rounded-xl bg-surface border border-border flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="p-5 border-b border-border">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-foreground text-lg font-bold">
                Transcript: {call.caller_name || "Unknown caller"}
              </h2>
              <p className="text-muted-foreground text-xs mt-1 capitalize">
                {call.call_type} · {DISPOSITION_LABELS[call.disposition]} · {fmtDateTime(call.started_at)} · {fmtDuration(call.duration_seconds)}
              </p>
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Turns */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-3">
          {isLoading ? (
            <div className="py-10 flex justify-center">
              <div className="w-5 h-5 rounded-full border-2 border-[oklch(0.78_0.12_75)] border-t-transparent animate-spin" />
            </div>
          ) : !transcript ? (
            <p className="text-muted-foreground text-sm text-center py-10">No transcript recorded.</p>
          ) : (
            <>
              {(transcript as CallTranscript).turns.map((turn, i) => {
                const isAgent = turn.speaker === "agent";
                return (
                  <div key={i} className={`flex ${isAgent ? "justify-start" : "justify-end"}`}>
                    <div
                      className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                        isAgent
                          ? "bg-muted text-foreground rounded-bl-sm"
                          : "text-white rounded-br-sm"
                      }`}
                      style={!isAgent ? { background: "oklch(0.45 0.18 250)" } : undefined}
                    >
                      <div className="flex items-baseline gap-2 mb-0.5">
                        <span className="text-[10px] uppercase tracking-widest font-semibold opacity-70">
                          {isAgent ? "AI Agent" : "Caller"}
                        </span>
                        <span className="text-[10px] opacity-60">
                          {new Date(turn.timestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <p className="leading-relaxed">{turn.text || <em className="opacity-60">(silence)</em>}</p>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* Summary + next steps */}
        {transcript && (
          <div className="p-5 border-t border-border bg-muted/30 flex flex-col gap-3">
            {(transcript as CallTranscript).summary && (
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <FileText className="w-3.5 h-3.5 text-primary" />
                  <span className="text-muted-foreground text-[10px] uppercase tracking-widest font-semibold">Summary</span>
                </div>
                <p className="text-foreground text-sm leading-relaxed">{(transcript as CallTranscript).summary}</p>
              </div>
            )}
            {(transcript as CallTranscript).next_steps.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <ClipboardList className="w-3.5 h-3.5 text-primary" />
                  <span className="text-muted-foreground text-[10px] uppercase tracking-widest font-semibold">Next Steps</span>
                </div>
                <ul className="flex flex-col gap-1.5">
                  {(transcript as CallTranscript).next_steps.map((step, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[oklch(0.70_0.18_145)] flex-shrink-0 mt-0.5" />
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ---------------- Call Log / Chat Log tables ----------------

function CallsTable({ calls, onTranscript }: { calls: Call[]; onTranscript: (c: Call) => void }) {
  return (
    <div className="rounded-xl overflow-hidden bg-surface/60 backdrop-blur-sm border border-white/5">
      <table className="w-full">
        <thead>
          <tr className="border-b border-white/5">
            <th className="px-4 py-3 text-left text-muted-foreground text-[11px] font-semibold">Date / Time</th>
            <th className="px-4 py-3 text-left text-muted-foreground text-[11px] font-semibold">Caller</th>
            <th className="px-4 py-3 text-left text-muted-foreground text-[11px] font-semibold hidden md:table-cell">Duration</th>
            <th className="px-4 py-3 text-left text-muted-foreground text-[11px] font-semibold">Type</th>
            <th className="px-4 py-3 text-left text-muted-foreground text-[11px] font-semibold hidden lg:table-cell">Disposition</th>
            <th className="px-4 py-3 text-right text-muted-foreground text-[11px] font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {calls.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground text-sm">
                No calls match your filters.
              </td>
            </tr>
          ) : (
            calls.map((c) => (
              <tr key={c.id} className="border-b border-white/[0.04] last:border-b-0 hover:bg-white/[0.02] transition-colors">
                <td className="px-4 py-3 text-muted-foreground text-xs">{fmtDateTime(c.started_at)}</td>
                <td className="px-4 py-3">
                  <p className="text-foreground text-sm font-medium">{c.caller_name || "Unknown"}</p>
                  <p className="text-muted-foreground text-xs">{c.caller_phone}</p>
                </td>
                <td className="px-4 py-3 text-muted-foreground text-sm hidden md:table-cell">{fmtDuration(c.duration_seconds)}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 rounded text-[10px] font-medium capitalize"
                    style={{ background: `${TYPE_COLORS[c.call_type]}20`, color: TYPE_COLORS[c.call_type] }}>
                    {c.call_type}
                  </span>
                </td>
                <td className="px-4 py-3 hidden lg:table-cell">
                  <span className="text-muted-foreground text-xs">{DISPOSITION_LABELS[c.disposition]}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    {c.recording_url && (
                      <button
                        title="Play recording (demo)"
                        className="p-1.5 rounded hover:bg-white/10 text-muted-foreground hover:text-foreground">
                        <Play className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => onTranscript(c)}
                      title="View transcript"
                      className="p-1.5 rounded hover:bg-white/10 text-muted-foreground hover:text-foreground">
                      <FileText className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function ChatsTable({ chats }: { chats: ChatSession[] }) {
  const [expanded, setExpanded] = useState<number | null>(null);
  return (
    <div className="rounded-xl overflow-hidden bg-surface/60 backdrop-blur-sm border border-white/5">
      <table className="w-full">
        <thead>
          <tr className="border-b border-white/5">
            <th className="px-4 py-3 text-left text-muted-foreground text-[11px] font-semibold">Date / Time</th>
            <th className="px-4 py-3 text-left text-muted-foreground text-[11px] font-semibold">Visitor</th>
            <th className="px-4 py-3 text-left text-muted-foreground text-[11px] font-semibold hidden md:table-cell">Channel</th>
            <th className="px-4 py-3 text-left text-muted-foreground text-[11px] font-semibold hidden lg:table-cell">Summary</th>
            <th className="px-4 py-3 text-left text-muted-foreground text-[11px] font-semibold">Status</th>
          </tr>
        </thead>
        <tbody>
          {chats.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground text-sm">
                No chat sessions yet.
              </td>
            </tr>
          ) : (
            chats.map((c) => (
              <>
                <tr
                  key={c.id}
                  onClick={() => setExpanded(expanded === c.id ? null : c.id)}
                  className="border-b border-border hover:bg-white/5 cursor-pointer transition-colors">
                  <td className="px-4 py-3 text-muted-foreground text-xs">{fmtDateTime(c.started_at)}</td>
                  <td className="px-4 py-3 text-foreground text-sm font-medium">{c.visitor_name || "Anonymous"}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs capitalize hidden md:table-cell">{c.channel}</td>
                  <td className="px-4 py-3 text-muted-foreground text-sm hidden lg:table-cell truncate max-w-md">
                    {c.summary || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-medium capitalize ${
                      c.status === "ended" ? "bg-[oklch(0.55_0.15_145/15%)] text-[oklch(0.70_0.18_145)]" :
                      c.status === "abandoned" ? "bg-[oklch(0.55_0.08_25/15%)] text-[oklch(0.65_0.15_25)]" :
                      "bg-primary/15 text-primary"
                    }`}>
                      {c.status}
                    </span>
                  </td>
                </tr>
                {expanded === c.id && (
                  <tr className="bg-muted/40">
                    <td colSpan={5} className="px-6 py-4">
                      <div className="flex flex-col gap-2 max-w-2xl">
                        {c.transcript.map((t, i) => (
                          <div key={i} className={`flex ${t.speaker === "agent" ? "justify-start" : "justify-end"}`}>
                            <div className={`max-w-[70%] rounded-2xl px-3 py-1.5 text-xs ${
                              t.speaker === "agent"
                                ? "bg-surface text-foreground rounded-bl-sm"
                                : "text-white rounded-br-sm"
                            }`}
                              style={t.speaker !== "agent" ? { background: "oklch(0.45 0.18 250)" } : undefined}>
                              {t.text}
                            </div>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// ---------------- Main Page ----------------

function PhoneChatContent() {
  const orgQuery = useCrmOrg();
  const { data: calls, isLoading: callsLoading } = trpc.calls.list.useQuery(undefined, { enabled: !!orgQuery.data });
  const { data: chats, isLoading: chatsLoading } = trpc.chats.list.useQuery(undefined, { enabled: !!orgQuery.data });
  const { data: stats } = trpc.calls.stats.useQuery(undefined, { enabled: !!orgQuery.data });

  const [tab, setTab] = useState<"calls" | "chats">("calls");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [dispoFilter, setDispoFilter] = useState<string>("all");
  const [transcriptCall, setTranscriptCall] = useState<Call | null>(null);

  const filteredCalls = useMemo(() => {
    const all = (calls ?? []) as Call[];
    return all.filter((c) => {
      if (typeFilter !== "all" && c.call_type !== typeFilter) return false;
      if (dispoFilter !== "all" && c.disposition !== dispoFilter) return false;
      return true;
    });
  }, [calls, typeFilter, dispoFilter]);

  if (callsLoading && chatsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 rounded-full border-2 border-[oklch(0.78_0.12_75)] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow="Voice & Messaging"
        eyebrowIcon={Phone}
        title="Phone & Chat"
        subtitle="AI phone agent calls and AI chat transcripts"
      />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        <StatCard label="Calls Today" value={stats?.today ?? 0} icon={PhoneCall} />
        <StatCard label="This Week" value={stats?.week ?? 0} />
        <StatCard label="This Month" value={stats?.month ?? 0}
          sub={stats && stats.monthGrowth ? `${stats.monthGrowth > 0 ? "+" : ""}${stats.monthGrowth}% vs last month` : undefined}
          subTone={stats && stats.monthGrowth > 0 ? "green" : "neutral"}
          accent />
        <StatCard label="AI Handle Rate" value={`${stats?.aiHandleRate ?? 0}%`}
          sub="calls resolved by AI" subTone="green" icon={TrendingUp} />
        <StatCard label="Avg Duration"
          value={stats ? fmtDuration(stats.avgDurationSeconds) : "—"} icon={Clock} />
      </div>

      {/* Donut + How it's working */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        <CallsByTypeDonut byType={stats?.byType ?? {}} />
        <HowItsWorking
          totalCalls={stats?.total ?? 0}
          leadsFromCalls={stats?.leadsFromCalls ?? 0}
          aiHandleRate={stats?.aiHandleRate ?? 0}
        />
      </div>

      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <SegmentedControl
          value={tab}
          onChange={setTab}
          options={[
            { value: "calls", label: `Call Log · ${calls?.length ?? 0}`, icon: PhoneCall },
            { value: "chats", label: `Chat Log · ${chats?.length ?? 0}`, icon: MessageSquare },
          ]}
        />

        {tab === "calls" && (
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-muted-foreground" />
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-1.5 rounded-lg text-xs text-foreground outline-none bg-surface/60 border border-white/10 focus:border-primary/40">
              <option value="all">All types</option>
              <option value="general">General</option>
              <option value="sales">Sales</option>
              <option value="support">Support</option>
              <option value="billing">Billing</option>
            </select>
            <select value={dispoFilter} onChange={(e) => setDispoFilter(e.target.value)}
              className="px-3 py-1.5 rounded-lg text-xs text-foreground outline-none bg-surface/60 border border-white/10 focus:border-primary/40">
              <option value="all">All dispositions</option>
              {Object.entries(DISPOSITION_LABELS).map(([k, v]) =>
                <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        )}
      </div>

      {tab === "calls"
        ? <CallsTable calls={filteredCalls} onTranscript={setTranscriptCall} />
        : <ChatsTable chats={(chats ?? []) as ChatSession[]} />
      }

      <AnimatePresence>
        {transcriptCall && (
          <TranscriptModal call={transcriptCall} onClose={() => setTranscriptCall(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

export default function PhoneChat() {
  return (
    <CrmLayout>
      <PhoneChatContent />
    </CrmLayout>
  );
}
