import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { CrmLayout, useCrmOrg } from "@/components/CrmLayout";
import type { Campaign, CampaignRecipient, CampaignType, ContactStage, ContactSource } from "@shared/types";
import {
  Plus, Mail, MessageSquare, X, ChevronRight, ChevronLeft, Megaphone,
  Calendar, Send, Users,
} from "lucide-react";
import { PageHeader, PrimaryButton, Pill } from "@/components/ui/page";

const STATUS_STYLES: Record<Campaign["status"], { label: string; bg: string; text: string }> = {
  draft:     { label: "Draft",     bg: "oklch(0.40 0.01 265 / 25%)", text: "oklch(0.70 0.01 265)" },
  scheduled: { label: "Scheduled", bg: "oklch(0.72 0.15 75 / 18%)",  text: "oklch(0.78 0.12 75)" },
  sending:   { label: "Sending",   bg: "oklch(0.62 0.18 250 / 18%)", text: "oklch(0.70 0.18 250)" },
  sent:      { label: "Sent",      bg: "oklch(0.55 0.15 145 / 18%)", text: "oklch(0.70 0.18 145)" },
  failed:    { label: "Failed",    bg: "oklch(0.55 0.15 25 / 18%)",  text: "oklch(0.70 0.18 25)" },
  cancelled: { label: "Cancelled", bg: "oklch(0.40 0.01 265 / 25%)", text: "oklch(0.60 0.01 265)" },
};

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ---------------- Row ----------------

function CampaignStatsCell({ campaignId, type }: { campaignId: number; type: CampaignType }) {
  const { data: stats } = trpc.campaigns.stats.useQuery({ campaignId });
  if (!stats) return <span className="text-muted-foreground text-xs">—</span>;
  if (type === "sms") {
    return <span className="text-muted-foreground text-xs">N/A</span>;
  }
  return (
    <span className="text-foreground text-xs font-medium">{stats.openRate}%</span>
  );
}

function CampaignClickCell({ campaignId, type }: { campaignId: number; type: CampaignType }) {
  const { data: stats } = trpc.campaigns.stats.useQuery({ campaignId });
  if (type === "sms") return <span className="text-muted-foreground text-xs">N/A</span>;
  if (!stats) return <span className="text-muted-foreground text-xs">—</span>;
  return <span className="text-foreground text-xs font-medium">{stats.clickRate}%</span>;
}

function CampaignsTable({ campaigns, onRowClick }: {
  campaigns: Campaign[]; onRowClick: (c: Campaign) => void;
}) {
  return (
    <div className="rounded-xl overflow-hidden bg-surface/60 backdrop-blur-sm border border-white/5">
      <table className="w-full">
        <thead>
          <tr className="border-b border-white/5">
            <th className="px-4 py-3 text-left text-muted-foreground text-[11px] font-semibold">Campaign</th>
            <th className="px-4 py-3 text-left text-muted-foreground text-[11px] font-semibold">Type</th>
            <th className="px-4 py-3 text-left text-muted-foreground text-[11px] font-semibold hidden md:table-cell">Audience</th>
            <th className="px-4 py-3 text-left text-muted-foreground text-[11px] font-semibold hidden lg:table-cell">Size</th>
            <th className="px-4 py-3 text-left text-muted-foreground text-[11px] font-semibold hidden lg:table-cell">Open</th>
            <th className="px-4 py-3 text-left text-muted-foreground text-[11px] font-semibold hidden lg:table-cell">Click</th>
            <th className="px-4 py-3 text-left text-muted-foreground text-[11px] font-semibold">Status</th>
            <th className="px-4 py-3 text-left text-muted-foreground text-[11px] font-semibold hidden md:table-cell">Date</th>
          </tr>
        </thead>
        <tbody>
          {campaigns.length === 0 ? (
            <tr>
              <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground text-sm">
                No campaigns yet. Create your first one.
              </td>
            </tr>
          ) : (
            campaigns.map((c) => {
              const Icon = c.type === "email" ? Mail : MessageSquare;
              const style = STATUS_STYLES[c.status];
              return (
                <tr key={c.id}
                  onClick={() => onRowClick(c)}
                  className="cursor-pointer border-b border-white/[0.04] last:border-b-0 hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-foreground text-sm font-medium">{c.name}</p>
                    {c.subject && <p className="text-muted-foreground text-xs truncate max-w-xs">{c.subject}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium capitalize bg-muted text-foreground">
                      <Icon className="w-3 h-3" />
                      {c.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs hidden md:table-cell">
                    {Array.isArray((c.audience_filter as any)?.stage) && (c.audience_filter as any).stage.length
                      ? `${(c.audience_filter as any).stage.join(", ")}`
                      : "All contacts"}
                  </td>
                  <td className="px-4 py-3 text-foreground text-sm hidden lg:table-cell">{c.audience_size}</td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <CampaignStatsCell campaignId={c.id} type={c.type} />
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <CampaignClickCell campaignId={c.id} type={c.type} />
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold"
                      style={{ background: style.bg, color: style.text }}>
                      {style.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs hidden md:table-cell">
                    {fmtDate(c.sent_at ?? c.scheduled_at ?? c.created_at)}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

// ---------------- Detail drawer ----------------

function CampaignDrawer({ campaign, onClose }: { campaign: Campaign; onClose: () => void }) {
  const { data: stats } = trpc.campaigns.stats.useQuery({ campaignId: campaign.id });
  const { data: recipients } = trpc.campaigns.recipients.useQuery({ campaignId: campaign.id });
  const sendMut = trpc.campaigns.send.useMutation();
  const cancelMut = trpc.campaigns.cancel.useMutation();
  const utils = trpc.useUtils();

  const style = STATUS_STYLES[campaign.status];
  const canSend = campaign.status === "draft" || campaign.status === "scheduled";

  return (
    <motion.aside
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "tween", duration: 0.2 }}
      className="fixed top-14 right-0 bottom-0 w-full sm:w-[480px] z-40 bg-surface border-l border-border overflow-y-auto"
    >
      <div className="p-5 flex flex-col gap-5">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <h2 className="text-foreground text-lg font-bold truncate">{campaign.name}</h2>
            <p className="text-muted-foreground text-xs mt-1 capitalize">
              {campaign.type} · {fmtDate(campaign.created_at)}
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold"
            style={{ background: style.bg, color: style.text }}>
            {style.label}
          </span>
          <span className="text-muted-foreground text-xs">Audience: {campaign.audience_size}</span>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg p-3 border border-border">
              <p className="text-muted-foreground text-[10px] uppercase tracking-widest">Sent</p>
              <p className="text-foreground text-xl font-bold">{stats.sent}</p>
            </div>
            <div className="rounded-lg p-3 border border-border">
              <p className="text-muted-foreground text-[10px] uppercase tracking-widest">Open Rate</p>
              <p className="text-foreground text-xl font-bold">{stats.openRate}%</p>
            </div>
            <div className="rounded-lg p-3 border border-border">
              <p className="text-muted-foreground text-[10px] uppercase tracking-widest">Click Rate</p>
              <p className="text-foreground text-xl font-bold">{stats.clickRate}%</p>
            </div>
          </div>
        )}

        {/* Content */}
        {campaign.subject && (
          <div>
            <p className="text-muted-foreground text-[10px] uppercase tracking-widest mb-1">Subject</p>
            <p className="text-foreground text-sm">{campaign.subject}</p>
          </div>
        )}
        <div>
          <p className="text-muted-foreground text-[10px] uppercase tracking-widest mb-1">Body</p>
          <p className="text-foreground text-sm whitespace-pre-wrap leading-relaxed">{campaign.body}</p>
        </div>

        {/* Actions */}
        {canSend && (
          <button
            disabled={sendMut.isPending}
            onClick={() => sendMut.mutate({ campaignId: campaign.id }, {
              onSuccess: () => {
                utils.campaigns.list.invalidate();
                utils.campaigns.stats.invalidate({ campaignId: campaign.id });
                utils.campaigns.recipients.invalidate({ campaignId: campaign.id });
                utils.campaigns.get.invalidate({ campaignId: campaign.id });
              },
            })}
            className="w-full py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ background: "oklch(0.78 0.12 75)", color: "oklch(0.10 0.008 265)" }}>
            <Send className="w-4 h-4" />
            {sendMut.isPending ? "Sending..." : "Send Now"}
          </button>
        )}
        {campaign.status === "scheduled" && (
          <button
            onClick={() => cancelMut.mutate({ campaignId: campaign.id }, { onSuccess: () => utils.campaigns.list.invalidate() })}
            className="w-full py-2 rounded-lg text-xs font-semibold text-red-400 hover:bg-red-500/10 border border-red-500/30">
            Cancel Campaign
          </button>
        )}

        {/* Recipient list */}
        <div>
          <p className="text-muted-foreground text-[10px] uppercase tracking-widest mb-2">
            Recipients ({recipients?.length ?? 0})
          </p>
          <div className="rounded-lg border border-border max-h-80 overflow-y-auto">
            {!recipients || recipients.length === 0 ? (
              <p className="text-muted-foreground text-xs text-center py-6">No recipients yet.</p>
            ) : (
              recipients.slice(0, 100).map((r: CampaignRecipient) => (
                <div key={r.id} className="flex items-center justify-between px-3 py-2 border-b border-border last:border-b-0">
                  <span className="text-foreground text-xs truncate">{r.to_email || r.to_phone || `#${r.contact_id}`}</span>
                  <span className="text-muted-foreground text-[10px] capitalize ml-2">{r.status}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </motion.aside>
  );
}

// ---------------- 4-step Wizard ----------------

type WizardData = {
  name: string;
  type: CampaignType;
  audience: { stage: ContactStage[]; sources: ContactSource[]; cities: string[]; tags: string[] };
  subject: string;
  body: string;
  sendMode: "draft" | "now" | "schedule";
  scheduledAt: string;
};

const EMPTY: WizardData = {
  name: "", type: "email",
  audience: { stage: [], sources: [], cities: [], tags: [] },
  subject: "", body: "",
  sendMode: "draft", scheduledAt: "",
};

const ALL_STAGES: ContactStage[] = ["lead", "contacted", "qualified", "proposal", "won", "lost"];
const ALL_SOURCES: ContactSource[] = ["manual", "referral", "import", "website"];

function CreateWizard({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<WizardData>(EMPTY);
  const utils = trpc.useUtils();

  const { data: audiencePreview } = trpc.campaigns.previewAudience.useQuery(
    {
      stage: data.audience.stage.length ? data.audience.stage : undefined,
      sources: data.audience.sources.length ? data.audience.sources : undefined,
      cities: data.audience.cities.length ? data.audience.cities : undefined,
      tags: data.audience.tags.length ? data.audience.tags : undefined,
    },
    { enabled: step >= 2 }
  );

  const createMut = trpc.campaigns.create.useMutation({
    onSuccess: () => { utils.campaigns.list.invalidate(); onClose(); },
  });

  const toggleIn = <T extends string>(list: T[], v: T): T[] =>
    list.includes(v) ? list.filter((x) => x !== v) : [...list, v];

  const canAdvance = useMemo(() => {
    if (step === 1) return data.name.trim().length > 0;
    if (step === 2) return true; // empty = all contacts
    if (step === 3) return data.body.trim().length > 0 && (data.type === "sms" || data.subject.trim().length > 0);
    return true;
  }, [step, data]);

  const submit = () => {
    createMut.mutate({
      name: data.name,
      type: data.type,
      audienceFilter: {
        stage: data.audience.stage.length ? data.audience.stage : undefined,
        sources: data.audience.sources.length ? data.audience.sources : undefined,
        cities: data.audience.cities.length ? data.audience.cities : undefined,
        tags: data.audience.tags.length ? data.audience.tags : undefined,
      },
      subject: data.type === "email" ? data.subject : undefined,
      body: data.body,
      sendMode: data.sendMode,
      scheduledAt: data.sendMode === "schedule" && data.scheduledAt ? new Date(data.scheduledAt).toISOString() : undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.97 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl rounded-xl bg-surface border border-border flex flex-col max-h-[92vh]"
      >
        {/* Header with steps */}
        <div className="p-5 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-foreground text-lg font-bold">Create Campaign</h2>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="flex items-center gap-2 flex-1">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  n <= step ? "bg-primary text-[oklch(0.10_0.008_265)]" : "bg-muted text-muted-foreground"
                }`}>{n}</div>
                {n < 4 && <div className={`flex-1 h-0.5 ${n < step ? "bg-primary" : "bg-muted"}`} />}
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between mt-2 text-[10px] uppercase tracking-widest text-muted-foreground">
            <span>Name</span><span>Audience</span><span>Content</span><span>Review</span>
          </div>
        </div>

        <div className="p-5 flex-1 overflow-y-auto flex flex-col gap-4">
          {/* Step 1: Name + Type */}
          {step === 1 && (
            <>
              <div>
                <label className="block text-muted-foreground text-[10px] uppercase tracking-widest mb-1">Campaign Name</label>
                <input value={data.name} onChange={(e) => setData({ ...data, name: e.target.value })}
                  placeholder="Winter promo blast"
                  className="w-full px-3 py-2 rounded text-sm text-foreground outline-none bg-background border border-border" />
              </div>
              <div>
                <label className="block text-muted-foreground text-[10px] uppercase tracking-widest mb-1">Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["email", "sms"] as CampaignType[]).map((t) => {
                    const Icon = t === "email" ? Mail : MessageSquare;
                    const active = data.type === t;
                    return (
                      <button key={t}
                        onClick={() => setData({ ...data, type: t })}
                        className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium border transition-colors ${
                          active ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"
                        }`}>
                        <Icon className="w-4 h-4" />
                        {t.toUpperCase()}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* Step 2: Audience */}
          {step === 2 && (
            <>
              <div>
                <label className="block text-muted-foreground text-[10px] uppercase tracking-widest mb-2">Stage</label>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_STAGES.map((s) => {
                    const active = data.audience.stage.includes(s);
                    return (
                      <button key={s}
                        onClick={() => setData({ ...data, audience: { ...data.audience, stage: toggleIn(data.audience.stage, s) } })}
                        className={`px-2.5 py-1 rounded text-[11px] font-medium capitalize border transition-colors ${
                          active ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:text-foreground"
                        }`}>
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="block text-muted-foreground text-[10px] uppercase tracking-widest mb-2">Source</label>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_SOURCES.map((s) => {
                    const active = data.audience.sources.includes(s);
                    return (
                      <button key={s}
                        onClick={() => setData({ ...data, audience: { ...data.audience, sources: toggleIn(data.audience.sources, s) } })}
                        className={`px-2.5 py-1 rounded text-[11px] font-medium capitalize border transition-colors ${
                          active ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:text-foreground"
                        }`}>
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="block text-muted-foreground text-[10px] uppercase tracking-widest mb-2">Tags (comma-separated)</label>
                <input
                  value={data.audience.tags.join(", ")}
                  onChange={(e) => setData({ ...data, audience: { ...data.audience, tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) } })}
                  placeholder="vip, monthly, williamsburg"
                  className="w-full px-3 py-2 rounded text-sm text-foreground outline-none bg-background border border-border" />
              </div>

              <div className="rounded-lg p-4 border border-border bg-background">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="w-4 h-4 text-primary" />
                  <span className="text-foreground text-sm font-semibold">Audience size</span>
                </div>
                <p className="text-foreground text-2xl font-bold">{audiencePreview?.size ?? 0}</p>
                <p className="text-muted-foreground text-xs mt-1">contacts match these filters</p>
              </div>
            </>
          )}

          {/* Step 3: Content */}
          {step === 3 && (
            <>
              {data.type === "email" && (
                <div>
                  <label className="block text-muted-foreground text-[10px] uppercase tracking-widest mb-1">Subject</label>
                  <input value={data.subject} onChange={(e) => setData({ ...data, subject: e.target.value })}
                    placeholder="Your offer inside"
                    className="w-full px-3 py-2 rounded text-sm text-foreground outline-none bg-background border border-border" />
                </div>
              )}
              <div>
                <label className="block text-muted-foreground text-[10px] uppercase tracking-widest mb-1">
                  Body (merge tags: {"{{first_name}}"} {"{{company}}"})
                </label>
                <textarea value={data.body} onChange={(e) => setData({ ...data, body: e.target.value })}
                  rows={data.type === "sms" ? 4 : 10}
                  maxLength={data.type === "sms" ? 320 : 10000}
                  placeholder={data.type === "sms" ? "GridWorker: Your message here. Reply STOP to opt out." : "Hi {{first_name}},\n\n..."}
                  className="w-full px-3 py-2 rounded text-sm text-foreground outline-none resize-none bg-background border border-border" />
                {data.type === "sms" && (
                  <p className="text-muted-foreground text-xs mt-1 text-right">
                    {data.body.length} / 320
                  </p>
                )}
              </div>
            </>
          )}

          {/* Step 4: Review */}
          {step === 4 && (
            <>
              <div className="rounded-lg p-4 border border-border bg-background flex flex-col gap-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Name</span><span className="text-foreground font-medium">{data.name}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Type</span><span className="text-foreground font-medium capitalize">{data.type}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Audience</span><span className="text-foreground font-medium">{audiencePreview?.size ?? 0} contacts</span></div>
                {data.type === "email" && (
                  <div className="flex justify-between"><span className="text-muted-foreground">Subject</span><span className="text-foreground font-medium truncate max-w-xs">{data.subject}</span></div>
                )}
              </div>

              <div>
                <label className="block text-muted-foreground text-[10px] uppercase tracking-widest mb-2">Delivery</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["now", "schedule", "draft"] as const).map((mode) => {
                    const active = data.sendMode === mode;
                    const labels = { now: "Send Now", schedule: "Schedule", draft: "Save Draft" };
                    return (
                      <button key={mode}
                        onClick={() => setData({ ...data, sendMode: mode })}
                        className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                          active ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:text-foreground"
                        }`}>
                        {labels[mode]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {data.sendMode === "schedule" && (
                <div>
                  <label className="block text-muted-foreground text-[10px] uppercase tracking-widest mb-1">Scheduled for</label>
                  <input type="datetime-local" value={data.scheduledAt}
                    onChange={(e) => setData({ ...data, scheduledAt: e.target.value })}
                    className="w-full px-3 py-2 rounded text-sm text-foreground outline-none bg-background border border-border" />
                  <p className="text-muted-foreground text-xs mt-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Demo mode does not auto-send scheduled campaigns — trigger manually from the campaign row.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer navigation */}
        <div className="p-5 border-t border-border flex items-center justify-between">
          <button onClick={() => step > 1 ? setStep(step - 1) : onClose()}
            className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium text-muted-foreground hover:text-foreground">
            {step > 1 && <ChevronLeft className="w-3.5 h-3.5" />}
            {step === 1 ? "Cancel" : "Back"}
          </button>
          {step < 4 ? (
            <button onClick={() => canAdvance && setStep(step + 1)} disabled={!canAdvance}
              className="flex items-center gap-1 px-4 py-1.5 rounded text-xs font-semibold disabled:opacity-40"
              style={{ background: "oklch(0.78 0.12 75)", color: "oklch(0.10 0.008 265)" }}>
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button onClick={submit} disabled={createMut.isPending}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded text-xs font-semibold disabled:opacity-40"
              style={{ background: "oklch(0.78 0.12 75)", color: "oklch(0.10 0.008 265)" }}>
              <Send className="w-3.5 h-3.5" />
              {createMut.isPending ? "Creating..."
                : data.sendMode === "now" ? "Send Now"
                : data.sendMode === "schedule" ? "Schedule"
                : "Save Draft"}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ---------------- Main ----------------

function CampaignsContent() {
  const orgQuery = useCrmOrg();
  const { data: campaigns, isLoading } = trpc.campaigns.list.useQuery(undefined, { enabled: !!orgQuery.data });
  const [wizardOpen, setWizardOpen] = useState(false);
  const [selected, setSelected] = useState<Campaign | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 rounded-full border-2 border-[oklch(0.78_0.12_75)] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow="Outbound"
        eyebrowIcon={Megaphone}
        title="Campaigns"
        subtitle="SMS and email blasts to customers, leads, and churned parkers"
        actions={
          <PrimaryButton icon={Plus} onClick={() => setWizardOpen(true)}>Create Campaign</PrimaryButton>
        }
      />

      <CampaignsTable campaigns={(campaigns ?? []) as Campaign[]} onRowClick={setSelected} />

      <AnimatePresence>
        {selected && <CampaignDrawer campaign={selected} onClose={() => setSelected(null)} />}
      </AnimatePresence>

      <AnimatePresence>
        {wizardOpen && <CreateWizard onClose={() => setWizardOpen(false)} />}
      </AnimatePresence>
    </div>
  );
}

export default function Campaigns() {
  return (
    <CrmLayout>
      <CampaignsContent />
    </CrmLayout>
  );
}
