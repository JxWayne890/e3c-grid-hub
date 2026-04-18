import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { CrmLayout, useCrmOrg } from "@/components/CrmLayout";
import type { Lead, LeadStage, LeadSource, LeadTemperature, LeadFrequency } from "@shared/types";
import {
  LayoutGrid, Table as TableIcon, Filter, Plus, Phone, MapPin,
  X, Flame, Thermometer, Snowflake, ArrowUpDown, ArrowUp, ArrowDown, UserPlus,
} from "lucide-react";
import { PageHeader, SegmentedControl, GhostButton, PrimaryButton, Pill, Card, Toolbar } from "@/components/ui/page";

const STAGES: { value: LeadStage; label: string; color: string }[] = [
  { value: "new", label: "New", color: "oklch(0.65 0.18 250)" },
  { value: "contacted", label: "Contacted", color: "oklch(0.65 0.18 200)" },
  { value: "qualified", label: "Qualified", color: "oklch(0.65 0.18 150)" },
  { value: "negotiating", label: "Negotiating", color: "oklch(0.78 0.12 75)" },
  { value: "won", label: "Won", color: "oklch(0.70 0.18 145)" },
  { value: "lost", label: "Lost", color: "oklch(0.65 0.15 25)" },
];

const TEMPERATURES: Record<LeadTemperature, { label: string; bg: string; text: string; Icon: React.ElementType }> = {
  hot: { label: "Hot", bg: "oklch(0.55 0.20 25 / 18%)", text: "oklch(0.70 0.20 25)", Icon: Flame },
  warm: { label: "Warm", bg: "oklch(0.72 0.15 75 / 18%)", text: "oklch(0.78 0.12 75)", Icon: Thermometer },
  cold: { label: "Cold", bg: "oklch(0.60 0.15 230 / 18%)", text: "oklch(0.70 0.15 230)", Icon: Snowflake },
};

const SOURCE_LABELS: Record<LeadSource, string> = {
  phone: "Phone",
  walk_in: "Walk-in",
  website: "Website",
  referral: "Referral",
  third_party: "3rd Party",
};

const FREQ_LABELS: Record<LeadFrequency, string> = {
  hourly: "Hourly",
  daily: "Daily",
  monthly: "Monthly",
};

function fullName(l: Lead): string {
  return `${l.first_name} ${l.last_name}`.trim();
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function TemperaturePill({ value }: { value: LeadTemperature }) {
  const tone = value === "hot" ? "danger" : value === "warm" ? "warning" : "info";
  const Icon = TEMPERATURES[value].Icon;
  return <Pill tone={tone} icon={Icon}>{TEMPERATURES[value].label}</Pill>;
}

function SourcePill({ value }: { value: LeadSource }) {
  return <Pill tone="muted">{SOURCE_LABELS[value]}</Pill>;
}

// ---------------- Kanban ----------------

function initials(lead: Lead): string {
  return `${(lead.first_name[0] ?? "").toUpperCase()}${(lead.last_name[0] ?? "").toUpperCase()}` || "?";
}

function LeadCard({ lead, onDragStart, onClick }: {
  lead: Lead;
  onDragStart: (e: React.DragEvent, lead: Lead) => void;
  onClick: () => void;
}) {
  const tempColor = TEMPERATURES[lead.temperature].text;
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e as unknown as React.DragEvent, lead)}
      onClick={onClick}
      className="relative block shrink-0 rounded-lg p-3 cursor-pointer transition-all hover:shadow-md hover:-translate-y-px group bg-surface border border-border"
      style={{ borderLeft: `3px solid ${tempColor}` }}
    >
      {/* Top row: avatar + name */}
      <div className="flex items-center gap-2.5 mb-2">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
          style={{ background: `${tempColor}1f`, color: tempColor }}
        >
          {initials(lead)}
        </div>
        <p className="text-foreground text-sm font-semibold leading-tight truncate flex-1 min-w-0">
          {fullName(lead)}
        </p>
      </div>

      {/* Meta rows */}
      {lead.phone && (
        <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-1">
          <Phone className="w-3 h-3 shrink-0 opacity-60" />
          <span className="truncate tabular-nums">{lead.phone}</span>
        </div>
      )}
      {lead.address && (
        <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-2">
          <MapPin className="w-3 h-3 shrink-0 opacity-60" />
          <span className="truncate">{lead.address}</span>
        </div>
      )}

      {/* Footer pills */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <TemperaturePill value={lead.temperature} />
        <SourcePill value={lead.source} />
      </div>
    </div>
  );
}

function KanbanColumn({
  stage, leads, onDragStart, onDrop, dragOver, onDragOver, onDragLeave, onCardClick,
}: {
  stage: (typeof STAGES)[number];
  leads: Lead[];
  onDragStart: (e: React.DragEvent, lead: Lead) => void;
  onDrop: (e: React.DragEvent, stage: LeadStage) => void;
  dragOver: LeadStage | null;
  onDragOver: (e: React.DragEvent, stage: LeadStage) => void;
  onDragLeave: () => void;
  onCardClick: (lead: Lead) => void;
}) {
  const isOver = dragOver === stage.value;
  return (
    <div
      className={`flex flex-col rounded-xl min-h-[400px] transition-all bg-surface/40 backdrop-blur-sm ${
        isOver ? "ring-2 ring-primary/40 bg-surface/70" : ""
      }`}
      style={{ border: `1px solid ${isOver ? stage.color : "oklch(1 0 0 / 5%)"}` }}
      onDragOver={(e) => { e.preventDefault(); onDragOver(e, stage.value); }}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, stage.value)}
    >
      <div className="px-3 py-2.5 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: stage.color, boxShadow: `0 0 6px ${stage.color}` }} />
          <span className="text-foreground text-[11px] font-semibold tracking-wide">{stage.label}</span>
        </div>
        <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold tabular-nums border"
          style={{ background: `${stage.color}14`, color: stage.color, borderColor: `${stage.color}30` }}>
          {leads.length}
        </span>
      </div>
      <div className="flex flex-col gap-2 p-3 flex-1 overflow-y-auto max-h-[calc(100vh-260px)]">
        {leads.length === 0 ? (
          <div className="flex-1 flex items-center justify-center py-8">
            <p className="text-muted-foreground text-xs text-center">{isOver ? "Drop here" : "No leads"}</p>
          </div>
        ) : (
          leads.map((lead) => (
            <LeadCard key={lead.id} lead={lead} onDragStart={onDragStart} onClick={() => onCardClick(lead)} />
          ))
        )}
      </div>
    </div>
  );
}

// ---------------- Table ----------------

type SortKey = "name" | "phone" | "source" | "temperature" | "stage" | "created_at";

function LeadsTable({ leads, onRowClick }: { leads: Lead[]; onRowClick: (l: Lead) => void }) {
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const sorted = useMemo(() => {
    const copy = [...leads];
    copy.sort((a, b) => {
      let av: string = "";
      let bv: string = "";
      switch (sortKey) {
        case "name": av = fullName(a); bv = fullName(b); break;
        case "phone": av = a.phone; bv = b.phone; break;
        case "source": av = a.source; bv = b.source; break;
        case "temperature": av = a.temperature; bv = b.temperature; break;
        case "stage": av = a.stage; bv = b.stage; break;
        case "created_at": av = a.created_at; bv = b.created_at; break;
      }
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [leads, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const SortIcon = ({ active }: { active: boolean }) => {
    if (!active) return <ArrowUpDown className="w-3 h-3 opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />;
  };

  const cols: { key: SortKey; label: string }[] = [
    { key: "name", label: "Name" },
    { key: "phone", label: "Phone" },
    { key: "source", label: "Source" },
    { key: "temperature", label: "Temperature" },
    { key: "stage", label: "Stage" },
    { key: "created_at", label: "Created" },
  ];

  return (
    <div className="rounded-xl overflow-hidden bg-surface/60 backdrop-blur-sm border border-white/5">
      <table className="w-full">
        <thead>
          <tr className="border-b border-white/5">
            {cols.map((c) => (
              <th key={c.key}
                onClick={() => toggleSort(c.key)}
                className="px-4 py-3 text-left text-muted-foreground text-[11px] font-semibold cursor-pointer select-none hover:text-foreground transition-colors">
                <span className="inline-flex items-center gap-1.5">
                  {c.label}
                  <SortIcon active={sortKey === c.key} />
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 ? (
            <tr>
              <td colSpan={cols.length} className="px-4 py-16 text-center text-muted-foreground text-sm">
                No leads match your filters.
              </td>
            </tr>
          ) : (
            sorted.map((lead) => (
              <tr key={lead.id}
                onClick={() => onRowClick(lead)}
                className="cursor-pointer transition-colors border-b border-white/[0.04] last:border-b-0 hover:bg-white/[0.02]">
                <td className="px-4 py-3 text-foreground text-sm font-medium">{fullName(lead)}</td>
                <td className="px-4 py-3 text-muted-foreground text-sm tabular-nums">{lead.phone || "—"}</td>
                <td className="px-4 py-3"><SourcePill value={lead.source} /></td>
                <td className="px-4 py-3"><TemperaturePill value={lead.temperature} /></td>
                <td className="px-4 py-3">
                  <span className="text-xs capitalize text-muted-foreground">{lead.stage}</span>
                </td>
                <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(lead.created_at)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// ---------------- Filters ----------------

type Filters = {
  source: LeadSource | "all";
  temperature: LeadTemperature | "all";
  stage: LeadStage | "all";
  search: string;
};

const DEFAULT_FILTERS: Filters = { source: "all", temperature: "all", stage: "all", search: "" };

function FiltersPanel({ filters, setFilters, onClose }: {
  filters: Filters; setFilters: (f: Filters) => void; onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="rounded-xl p-4 mb-4 bg-surface/60 backdrop-blur-sm border border-white/5 overflow-hidden"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-foreground text-sm font-semibold">Filters</span>
        <div className="flex items-center gap-2">
          <button onClick={() => setFilters(DEFAULT_FILTERS)}
            className="text-muted-foreground hover:text-foreground text-xs">Reset</button>
          <button onClick={onClose}
            className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Search", el: (
            <input value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder="Name, phone, email..."
              className="w-full px-3 py-2 rounded-lg text-sm text-foreground outline-none bg-background/60 border border-white/10 focus:border-primary/40 transition-colors" />
          )},
          { label: "Source", el: (
            <select value={filters.source}
              onChange={(e) => setFilters({ ...filters, source: e.target.value as Filters["source"] })}
              className="w-full px-3 py-2 rounded-lg text-sm text-foreground outline-none bg-background/60 border border-white/10 focus:border-primary/40 transition-colors">
              <option value="all">All sources</option>
              {(Object.keys(SOURCE_LABELS) as LeadSource[]).map((s) => (
                <option key={s} value={s}>{SOURCE_LABELS[s]}</option>
              ))}
            </select>
          )},
          { label: "Temperature", el: (
            <select value={filters.temperature}
              onChange={(e) => setFilters({ ...filters, temperature: e.target.value as Filters["temperature"] })}
              className="w-full px-3 py-2 rounded-lg text-sm text-foreground outline-none bg-background/60 border border-white/10 focus:border-primary/40 transition-colors">
              <option value="all">All temps</option>
              <option value="hot">Hot</option>
              <option value="warm">Warm</option>
              <option value="cold">Cold</option>
            </select>
          )},
          { label: "Stage", el: (
            <select value={filters.stage}
              onChange={(e) => setFilters({ ...filters, stage: e.target.value as Filters["stage"] })}
              className="w-full px-3 py-2 rounded-lg text-sm text-foreground outline-none bg-background/60 border border-white/10 focus:border-primary/40 transition-colors">
              <option value="all">All stages</option>
              {STAGES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          )},
        ].map((f, i) => (
          <div key={i}>
            <label className="block text-muted-foreground text-[10px] font-semibold mb-1.5">{f.label}</label>
            {f.el}
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ---------------- New / Edit Lead Modal ----------------

type LeadFormData = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  address: string;
  source: LeadSource;
  frequency: LeadFrequency;
  temperature: LeadTemperature;
  stage: LeadStage;
  notes: string;
};

const EMPTY_FORM: LeadFormData = {
  firstName: "", lastName: "", phone: "", email: "", address: "",
  source: "website", frequency: "monthly", temperature: "warm", stage: "new", notes: "",
};

function LeadModal({ initial, onClose, onSubmit, isPending }: {
  initial?: Lead;
  onClose: () => void;
  onSubmit: (data: LeadFormData) => void;
  isPending: boolean;
}) {
  const [form, setForm] = useState<LeadFormData>(initial ? {
    firstName: initial.first_name, lastName: initial.last_name, phone: initial.phone,
    email: initial.email, address: initial.address, source: initial.source,
    frequency: initial.frequency, temperature: initial.temperature, stage: initial.stage,
    notes: initial.notes,
  } : EMPTY_FORM);

  const canSubmit = form.firstName.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.97 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-xl p-6 bg-surface border border-border flex flex-col gap-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-foreground text-lg font-bold">{initial ? "Edit Lead" : "New Lead"}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-muted-foreground text-[10px] uppercase tracking-widest mb-1">First name</label>
            <input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              className="w-full px-2.5 py-1.5 rounded text-sm text-foreground outline-none bg-background border border-border" />
          </div>
          <div>
            <label className="block text-muted-foreground text-[10px] uppercase tracking-widest mb-1">Last name</label>
            <input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              className="w-full px-2.5 py-1.5 rounded text-sm text-foreground outline-none bg-background border border-border" />
          </div>
          <div>
            <label className="block text-muted-foreground text-[10px] uppercase tracking-widest mb-1">Phone</label>
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full px-2.5 py-1.5 rounded text-sm text-foreground outline-none bg-background border border-border" />
          </div>
          <div>
            <label className="block text-muted-foreground text-[10px] uppercase tracking-widest mb-1">Email</label>
            <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-2.5 py-1.5 rounded text-sm text-foreground outline-none bg-background border border-border" />
          </div>
          <div className="col-span-2">
            <label className="block text-muted-foreground text-[10px] uppercase tracking-widest mb-1">Address / Location</label>
            <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full px-2.5 py-1.5 rounded text-sm text-foreground outline-none bg-background border border-border" />
          </div>
          <div>
            <label className="block text-muted-foreground text-[10px] uppercase tracking-widest mb-1">Source</label>
            <select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value as LeadSource })}
              className="w-full px-2.5 py-1.5 rounded text-sm text-foreground outline-none bg-background border border-border">
              {(Object.keys(SOURCE_LABELS) as LeadSource[]).map((s) =>
                <option key={s} value={s}>{SOURCE_LABELS[s]}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-muted-foreground text-[10px] uppercase tracking-widest mb-1">Frequency</label>
            <select value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value as LeadFrequency })}
              className="w-full px-2.5 py-1.5 rounded text-sm text-foreground outline-none bg-background border border-border">
              <option value="hourly">Hourly</option>
              <option value="daily">Daily</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          <div>
            <label className="block text-muted-foreground text-[10px] uppercase tracking-widest mb-1">Temperature</label>
            <select value={form.temperature} onChange={(e) => setForm({ ...form, temperature: e.target.value as LeadTemperature })}
              className="w-full px-2.5 py-1.5 rounded text-sm text-foreground outline-none bg-background border border-border">
              <option value="hot">Hot</option>
              <option value="warm">Warm</option>
              <option value="cold">Cold</option>
            </select>
          </div>
          <div>
            <label className="block text-muted-foreground text-[10px] uppercase tracking-widest mb-1">Stage</label>
            <select value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value as LeadStage })}
              className="w-full px-2.5 py-1.5 rounded text-sm text-foreground outline-none bg-background border border-border">
              {STAGES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-muted-foreground text-[10px] uppercase tracking-widest mb-1">Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
              className="w-full px-2.5 py-1.5 rounded text-sm text-foreground outline-none resize-none bg-background border border-border" />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button onClick={onClose}
            className="px-3 py-1.5 rounded text-xs font-medium text-muted-foreground hover:text-foreground border border-border">
            Cancel
          </button>
          <button onClick={() => onSubmit(form)} disabled={!canSubmit || isPending}
            className="px-3 py-1.5 rounded text-xs font-semibold disabled:opacity-40"
            style={{ background: "oklch(0.78 0.12 75)", color: "oklch(0.10 0.008 265)" }}>
            {isPending ? "Saving..." : initial ? "Save Lead" : "Create Lead"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ---------------- Detail Drawer ----------------

function LeadDrawer({ lead, onClose }: { lead: Lead; onClose: () => void }) {
  const utils = trpc.useUtils();
  const [editing, setEditing] = useState(false);

  const updateMut = trpc.leads.update.useMutation({
    onSuccess: () => { utils.leads.list.invalidate(); setEditing(false); },
  });
  const convertMut = trpc.leads.convertToContact.useMutation({
    onSuccess: () => {
      utils.leads.list.invalidate();
      utils.contacts.list.invalidate();
      onClose();
    },
  });
  const deleteMut = trpc.leads.delete.useMutation({
    onSuccess: () => { utils.leads.list.invalidate(); onClose(); },
  });

  const temp = TEMPERATURES[lead.temperature];

  return (
    <motion.aside
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "tween", duration: 0.2 }}
      className="fixed top-14 right-0 bottom-0 w-full sm:w-[420px] z-40 bg-surface border-l border-border overflow-y-auto"
    >
      <div className="p-5 flex flex-col gap-5">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-foreground text-lg font-bold">{fullName(lead)}</h2>
            <p className="text-muted-foreground text-xs">Lead #{lead.id} · {formatDate(lead.created_at)}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <TemperaturePill value={lead.temperature} />
          <SourcePill value={lead.source} />
          <span className="px-2 py-0.5 rounded text-[10px] font-medium border border-border capitalize text-muted-foreground">
            {lead.stage}
          </span>
        </div>

        <div className="flex flex-col gap-2">
          {lead.phone && (
            <div className="flex items-center gap-2 p-3 rounded-lg border border-border">
              <Phone className="w-4 h-4 text-foreground" />
              <span className="text-foreground text-sm">{lead.phone}</span>
            </div>
          )}
          {lead.email && (
            <div className="flex items-center gap-2 p-3 rounded-lg border border-border">
              <span className="text-foreground text-sm">{lead.email}</span>
            </div>
          )}
          {lead.address && (
            <div className="flex items-start gap-2 p-3 rounded-lg border border-border">
              <MapPin className="w-4 h-4 text-foreground flex-shrink-0 mt-0.5" />
              <span className="text-foreground text-sm">{lead.address}</span>
            </div>
          )}
          <div className="p-3 rounded-lg border border-border">
            <p className="text-muted-foreground text-[10px] uppercase tracking-widest mb-1">Frequency</p>
            <p className="text-foreground text-sm">{FREQ_LABELS[lead.frequency]}</p>
          </div>
          {lead.notes && (
            <div className="p-3 rounded-lg border border-border">
              <p className="text-muted-foreground text-[10px] uppercase tracking-widest mb-1">Notes</p>
              <p className="text-foreground text-sm whitespace-pre-wrap">{lead.notes}</p>
            </div>
          )}
        </div>

        {lead.converted_contact_id ? (
          <div className="p-3 rounded-lg border border-border text-xs"
            style={{ background: `${temp.bg}` }}>
            <p className="text-foreground font-semibold">Converted to contact #{lead.converted_contact_id}</p>
          </div>
        ) : (
          <button
            onClick={() => convertMut.mutate({ leadId: lead.id })}
            disabled={convertMut.isPending}
            className="w-full py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ background: "oklch(0.78 0.12 75)", color: "oklch(0.10 0.008 265)" }}>
            <UserPlus className="w-4 h-4" />
            {convertMut.isPending ? "Converting..." : "Convert to Contact"}
          </button>
        )}

        <div className="flex items-center gap-2">
          <button onClick={() => setEditing(true)}
            className="flex-1 py-2 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground border border-border">
            Edit
          </button>
          <button
            onClick={() => {
              if (confirm("Delete this lead? This cannot be undone.")) deleteMut.mutate({ leadId: lead.id });
            }}
            disabled={deleteMut.isPending}
            className="py-2 px-3 rounded-lg text-xs font-semibold text-red-400 hover:bg-red-500/10 border border-red-500/30">
            Delete
          </button>
        </div>
      </div>

      {editing && (
        <LeadModal
          initial={lead}
          onClose={() => setEditing(false)}
          isPending={updateMut.isPending}
          onSubmit={(data) =>
            updateMut.mutate({
              leadId: lead.id,
              firstName: data.firstName,
              lastName: data.lastName,
              phone: data.phone,
              email: data.email,
              address: data.address,
              source: data.source,
              frequency: data.frequency,
              temperature: data.temperature,
              stage: data.stage,
              notes: data.notes,
            })
          }
        />
      )}
    </motion.aside>
  );
}

// ---------------- Main page ----------------

function LeadsContent() {
  const orgQuery = useCrmOrg();
  const utils = trpc.useUtils();
  const { data: leads, isLoading } = trpc.leads.list.useQuery(undefined, { enabled: !!orgQuery.data });

  const updateStage = trpc.leads.updateStage.useMutation({
    onSuccess: () => utils.leads.list.invalidate(),
  });
  const createMut = trpc.leads.create.useMutation({
    onSuccess: () => { utils.leads.list.invalidate(); setCreateOpen(false); },
  });

  const [view, setView] = useState<"kanban" | "table">("kanban");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<Lead | null>(null);

  const [draggedLead, setDraggedLead] = useState<Lead | null>(null);
  const [dragOverStage, setDragOverStage] = useState<LeadStage | null>(null);

  const filtered = useMemo(() => {
    const all = (leads ?? []) as Lead[];
    const q = filters.search.trim().toLowerCase();
    return all.filter((l) => {
      if (filters.source !== "all" && l.source !== filters.source) return false;
      if (filters.temperature !== "all" && l.temperature !== filters.temperature) return false;
      if (filters.stage !== "all" && l.stage !== filters.stage) return false;
      if (q) {
        const hay = `${fullName(l)} ${l.phone} ${l.email} ${l.address}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [leads, filters]);

  const byStage = useMemo(() => {
    return STAGES.reduce<Record<LeadStage, Lead[]>>((acc, s) => {
      acc[s.value] = filtered.filter((l) => l.stage === s.value);
      return acc;
    }, {} as Record<LeadStage, Lead[]>);
  }, [filtered]);

  const handleDragStart = (_e: React.DragEvent, lead: Lead) => setDraggedLead(lead);
  const handleDragOver = (e: React.DragEvent, stage: LeadStage) => { e.preventDefault(); setDragOverStage(stage); };
  const handleDrop = (e: React.DragEvent, newStage: LeadStage) => {
    e.preventDefault();
    setDragOverStage(null);
    if (!draggedLead || draggedLead.stage === newStage) { setDraggedLead(null); return; }

    utils.leads.list.setData(undefined, (old: Lead[] | undefined) => {
      if (!old) return old;
      return old.map((l) => (l.id === draggedLead.id ? { ...l, stage: newStage, updated_at: new Date().toISOString() } : l));
    });
    updateStage.mutate(
      { leadId: draggedLead.id, stage: newStage },
      { onError: () => utils.leads.list.invalidate() }
    );
    setDraggedLead(null);
  };

  const total = (leads ?? []).length;
  const shown = filtered.length;

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
        eyebrow="Pipeline"
        eyebrowIcon={UserPlus}
        title="Leads"
        subtitle={`${shown} of ${total} leads — new inquiries from every source`}
        actions={
          <>
            <GhostButton icon={Filter} onClick={() => setFiltersOpen((v) => !v)} active={filtersOpen}>
              Filters
            </GhostButton>
            <SegmentedControl
              value={view}
              onChange={setView}
              options={[
                { value: "kanban", label: "Kanban", icon: LayoutGrid },
                { value: "table", label: "Table", icon: TableIcon },
              ]}
            />
            <PrimaryButton icon={Plus} onClick={() => setCreateOpen(true)}>New Lead</PrimaryButton>
          </>
        }
      />

      <AnimatePresence initial={false}>
        {filtersOpen && (
          <FiltersPanel filters={filters} setFilters={setFilters} onClose={() => setFiltersOpen(false)} />
        )}
      </AnimatePresence>

      {view === "kanban" ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {STAGES.map((stage) => (
            <KanbanColumn
              key={stage.value}
              stage={stage}
              leads={byStage[stage.value] ?? []}
              onDragStart={handleDragStart}
              onDrop={handleDrop}
              dragOver={dragOverStage}
              onDragOver={handleDragOver}
              onDragLeave={() => setDragOverStage(null)}
              onCardClick={(l) => setSelected(l)}
            />
          ))}
        </div>
      ) : (
        <LeadsTable leads={filtered} onRowClick={(l) => setSelected(l)} />
      )}

      <AnimatePresence>
        {selected && <LeadDrawer lead={selected} onClose={() => setSelected(null)} />}
      </AnimatePresence>

      <AnimatePresence>
        {createOpen && (
          <LeadModal
            onClose={() => setCreateOpen(false)}
            isPending={createMut.isPending}
            onSubmit={(data) => createMut.mutate({
              firstName: data.firstName,
              lastName: data.lastName,
              phone: data.phone,
              email: data.email,
              address: data.address,
              source: data.source,
              frequency: data.frequency,
              temperature: data.temperature,
              stage: data.stage,
              notes: data.notes,
            })}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Leads() {
  return (
    <CrmLayout>
      <LeadsContent />
    </CrmLayout>
  );
}
