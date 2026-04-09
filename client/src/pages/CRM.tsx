/* ============================================================
   GRIDWORKER OS — CRM DASHBOARD
   Design: Dark Luxury Tech — matching main site aesthetic
   Access: Org members only (protected route)
   Sections: Stats overview, Beta signups list, User detail panel
   ============================================================ */

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  Users, Zap, TrendingUp, Mail, Phone, Calendar,
  LayoutGrid, Search, Download, RefreshCw, ChevronRight,
  Building2, MessageSquare, Link2, Shield, LogOut,
  StickyNote, Trash2, Send, Sparkles, X, QrCode, Copy, Check, Filter
} from "lucide-react";
import { Link } from "wouter";
import { AIChatBox } from "@/components/AIChatBox";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ContactForm, type ContactFormData } from "@/components/ContactForm";
import type { Contact, ContactStage } from "@shared/types";

const STAGE_COLORS: Record<ContactStage, { bg: string; text: string }> = {
  lead: { bg: "oklch(0.55 0.15 250 / 15%)", text: "oklch(0.65 0.18 250)" },
  contacted: { bg: "oklch(0.55 0.15 200 / 15%)", text: "oklch(0.65 0.18 200)" },
  qualified: { bg: "oklch(0.55 0.15 150 / 15%)", text: "oklch(0.65 0.18 150)" },
  proposal: { bg: "oklch(0.65 0.15 75 / 15%)", text: "oklch(0.78 0.12 75)" },
  won: { bg: "oklch(0.55 0.15 145 / 15%)", text: "oklch(0.70 0.18 145)" },
  lost: { bg: "oklch(0.55 0.08 25 / 15%)", text: "oklch(0.65 0.15 25)" },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit"
  });
}

function StatCard({ icon: Icon, label, value, sub }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string;
}) {
  return (
    <motion.div variants={fadeUp}
      className="rounded-xl p-5 flex items-start gap-4 bg-surface border-border border"
>      <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: "oklch(0.78 0.12 75 / 15%)" }}>
        <Icon className="w-5 h-5 text-foreground" />
      </div>
      <div>
        <p className="text-muted-foreground text-xs uppercase tracking-widest mb-0.5">{label}</p>
        <p className="text-foreground text-2xl font-bold leading-none">{value}</p>
        {sub && <p className="text-muted-foreground text-xs mt-1">{sub}</p>}
      </div>
    </motion.div>
  );
}

function ContactRow({ contact, onClick, selected }: {
  contact: Contact; onClick: () => void; selected: boolean;
}) {
  const fullName = `${contact.first_name} ${contact.last_name}`.trim();
  const stageColor = STAGE_COLORS[contact.stage];
  return (
    <motion.tr variants={fadeUp}
      onClick={onClick}
      className={`cursor-pointer transition-colors border-b border-border ${selected ? "bg-primary/10" : ""}`}>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-[oklch(0.10_0.008_265)]"
            style={{ background: "oklch(0.78 0.12 75)" }}>
            {contact.first_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-foreground text-sm font-medium">{fullName}</p>
            <p className="text-muted-foreground text-xs">{contact.email}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-muted-foreground text-sm hidden md:table-cell">{contact.company}</td>
      <td className="px-4 py-3 hidden lg:table-cell">
        <span className="px-2 py-0.5 rounded text-xs capitalize"
          style={{ background: stageColor.bg, color: stageColor.text }}>
          {contact.stage}
        </span>
      </td>
      <td className="px-4 py-3 text-muted-foreground text-xs hidden xl:table-cell">
        {formatDate(contact.created_at)}
      </td>
      <td className="px-4 py-3">
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </td>
    </motion.tr>
  );
}

function NotesSection({ contactId }: { contactId: number }) {
  const [noteText, setNoteText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const utils = trpc.useUtils();

  const { data: notes, isLoading } = trpc.notes.list.useQuery({ contactId });

  const addNote = trpc.notes.add.useMutation({
    onSuccess: () => {
      setNoteText("");
      utils.notes.list.invalidate({ contactId });
    },
  });

  const deleteNote = trpc.notes.delete.useMutation({
    onSuccess: () => {
      utils.notes.list.invalidate({ contactId });
    },
  });

  const handleAdd = () => {
    const trimmed = noteText.trim();
    if (!trimmed) return;
    addNote.mutate({ contactId, note: trimmed });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      handleAdd();
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <StickyNote className="w-3.5 h-3.5 text-foreground" />
        <span className="text-muted-foreground text-xs uppercase tracking-widest">Interaction Notes</span>
        {notes && notes.length > 0 && (
          <span className="ml-auto px-1.5 py-0.5 rounded text-xs"
            style={{ background: "oklch(0.78 0.12 75 / 15%)", color: "oklch(0.78 0.12 75)" }}>
            {notes.length}
          </span>
        )}
      </div>

      {/* Add note input */}
      <div className="rounded-lg overflow-hidden border border-border">
        <textarea
          ref={textareaRef}
          value={noteText}
          onChange={e => setNoteText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add a note about this contact... (Cmd+Enter to save)"
          rows={3}
          className="w-full px-3 pt-3 pb-1 text-sm text-foreground placeholder:text-muted-foreground resize-none outline-none bg-surface"
        />
        <div className="flex items-center justify-between px-3 pb-2 bg-surface">
          <span className="text-muted-foreground text-xs">{noteText.length}/2000</span>
          <button
            onClick={handleAdd}
            disabled={!noteText.trim() || addNote.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-all disabled:opacity-40"
            style={{ background: "oklch(0.78 0.12 75)", color: "oklch(0.10 0.008 265)" }}>
            {addNote.isPending ? (
              <div className="w-3 h-3 rounded-full border border-current border-t-transparent animate-spin" />
            ) : (
              <Send className="w-3 h-3" />
            )}
            Save
          </button>
        </div>
      </div>

      {/* Notes list */}
      <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
        {isLoading ? (
          <div className="py-4 flex justify-center">
            <div className="w-4 h-4 rounded-full border border-[oklch(0.78_0.12_75)] border-t-transparent animate-spin" />
          </div>
        ) : !notes || notes.length === 0 ? (
          <p className="text-muted-foreground text-xs text-center py-4">
            No notes yet. Add your first interaction note above.
          </p>
        ) : (
          notes.map((note: any) => (
            <div key={note.id}
              className="rounded-lg p-3 group relative"
              >
              <p className="text-foreground text-sm leading-relaxed pr-6">{note.note}</p>
              <p className="text-muted-foreground text-xs mt-1.5">{formatDate(note.created_at)}</p>
              <button
                onClick={() => deleteNote.mutate({ noteId: note.id })}
                className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-500/20"
                title="Delete note">
                <Trash2 className="w-3 h-3 text-red-400" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function DetailPanel({ contact, onClose, onEdit }: { contact: Contact; onClose: () => void; onEdit: () => void }) {
  const fullName = `${contact.first_name} ${contact.last_name}`.trim();
  const stageColor = STAGE_COLORS[contact.stage];
  const utils = trpc.useUtils();

  const updateStage = trpc.contacts.updateStage.useMutation({
    onSuccess: () => utils.contacts.list.invalidate(),
  });

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="rounded-xl p-6 flex flex-col gap-5 h-fit sticky top-24 bg-surface"
      style={{ border: "1px solid oklch(0.78 0.12 75 / 25%)" }}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-[oklch(0.10_0.008_265)]"
            style={{ background: "oklch(0.78 0.12 75)" }}>
            {contact.first_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="text-foreground font-bold text-lg leading-tight">{fullName}</h3>
            <p className="text-muted-foreground text-xs">{contact.company || "No company"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onEdit}
            className="text-muted-foreground hover:text-foreground transition-colors text-xs px-2 py-1 rounded border border-border">
            Edit
          </button>
          <button onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors text-xs">
            ✕
          </button>
        </div>
      </div>

      {/* Stage */}
      <div>
        <label className="text-muted-foreground text-xs uppercase tracking-widest mb-1.5 block">Stage</label>
        <select
          value={contact.stage}
          onChange={(e) => updateStage.mutate({ contactId: contact.id, stage: e.target.value as ContactStage })}
          className="w-full px-3 py-2 rounded-lg text-sm text-foreground outline-none bg-background border border-border"
          style={{ background: stageColor.bg, color: stageColor.text }}>
          <option value="lead">Lead</option>
          <option value="contacted">Contacted</option>
          <option value="qualified">Qualified</option>
          <option value="proposal">Proposal</option>
          <option value="won">Won</option>
          <option value="lost">Lost</option>
        </select>
      </div>

      {/* Contact Info */}
      <div className="flex flex-col gap-3">
        <a href={`mailto:${contact.email}`}
          className="flex items-center gap-3 p-3 rounded-lg transition-colors hover:bg-white/5 border border-border">
          <Mail className="w-4 h-4 text-foreground flex-shrink-0" />
          <span className="text-foreground text-sm truncate">{contact.email}</span>
        </a>
        {contact.phone && (
          <a href={`tel:${contact.phone}`}
            className="flex items-center gap-3 p-3 rounded-lg transition-colors hover:bg-white/5 border border-border">
            <Phone className="w-4 h-4 text-foreground flex-shrink-0" />
            <span className="text-foreground text-sm">{contact.phone}</span>
          </a>
        )}
        {contact.company && (
          <div className="flex items-center gap-3 p-3 rounded-lg border border-border">
            <Building2 className="w-4 h-4 text-foreground flex-shrink-0" />
            <span className="text-foreground text-sm">{contact.company}</span>
          </div>
        )}
        {(contact.city || contact.state) && (
          <div className="flex items-center gap-3 p-3 rounded-lg border border-border">
            <Zap className="w-4 h-4 text-foreground flex-shrink-0" />
            <span className="text-foreground text-sm">
              {[contact.address, contact.city, contact.state, contact.zip].filter(Boolean).join(", ")}
            </span>
          </div>
        )}
        <div className="flex items-center gap-3 p-3 rounded-lg border border-border">
          <Calendar className="w-4 h-4 text-foreground flex-shrink-0" />
          <span className="text-muted-foreground text-xs">{formatDate(contact.created_at)}</span>
        </div>
      </div>

      {/* Notes Section */}
      <div className="pt-1 border-t border-border">
        <NotesSection contactId={contact.id} />
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2">
        <a href={`mailto:${contact.email}`}
          className="w-full py-2.5 rounded-lg text-sm font-semibold text-center transition-all"
          style={{ background: "oklch(0.78 0.12 75)", color: "oklch(0.10 0.008 265)" }}>
          Send Email
        </a>
        {contact.phone && (
          <a href={`sms:${contact.phone}`}
            className="w-full py-2.5 rounded-lg text-sm font-semibold text-center transition-all"
            style={{ background: "oklch(0.62 0.18 250 / 20%)", color: "oklch(0.62 0.18 250)", border: "1px solid oklch(0.62 0.18 250 / 30%)" }}>
            Send SMS
          </a>
        )}
      </div>
    </motion.div>
  );
}

function OnboardingFlow() {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [error, setError] = useState<string | null>(null);

  const createOrg = trpc.org.create.useMutation({
    onSuccess: () => {
      window.location.reload();
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    createOrg.mutate({ name: name.trim(), slug: slug.trim().toLowerCase() });
  };

  return (
    <div className="min-h-screen bg-[oklch(0.10_0.007_265)] flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-xl mx-auto mb-5 flex items-center justify-center"
            style={{ background: "oklch(0.78 0.12 75 / 15%)", border: "1px solid oklch(0.78 0.12 75 / 30%)" }}>
            <Building2 className="w-7 h-7 text-foreground" />
          </div>
          <h2 className="text-foreground text-2xl font-bold mb-2">Create Your Organization</h2>
          <p className="text-muted-foreground text-sm">Set up your organization to start using the CRM.</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="rounded-xl p-6 flex flex-col gap-4" >
            <div>
              <label className="block text-muted-foreground text-xs uppercase tracking-widest mb-1.5">
                Organization Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3 py-2.5 rounded-lg text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-[oklch(0.78_0.12_75/50%)]"
                
                placeholder="My Company"
              />
            </div>
            <div>
              <label className="block text-muted-foreground text-xs uppercase tracking-widest mb-1.5">
                Slug
              </label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                required
                pattern="^[a-z0-9-]+$"
                className="w-full px-3 py-2.5 rounded-lg text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-[oklch(0.78_0.12_75/50%)]"
                
                placeholder="my-company"
              />
              <p className="text-muted-foreground text-xs mt-1">Lowercase letters, numbers, and hyphens only</p>
            </div>

            {error && <p className="text-red-400 text-xs">{error}</p>}

            <button
              type="submit"
              disabled={createOrg.isPending}
              className="w-full py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50"
              style={{ background: "oklch(0.78 0.12 75)", color: "oklch(0.10 0.008 265)" }}>
              {createOrg.isPending ? (
                <div className="w-4 h-4 mx-auto rounded-full border-2 border-current border-t-transparent animate-spin" />
              ) : (
                "Create Organization"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CRM() {
  const { user, loading: authLoading, isAuthenticated, signOut } = useAuth();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Contact | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [showMyReferrals, setShowMyReferrals] = useState(false);
  const [copied, setCopied] = useState(false);
  const [contactFormOpen, setContactFormOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | undefined>();
  const [chatMessages, setChatMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [conversationId, setConversationId] = useState<string | undefined>();

  const utils = trpc.useUtils();

  const orgQuery = trpc.org.current.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
  });

  const { data: contacts, isLoading, refetch } = trpc.contacts.list.useQuery(undefined, {
    enabled: isAuthenticated && !!orgQuery.data,
  });

  const createContactMut = trpc.contacts.create.useMutation({
    onSuccess: () => {
      utils.contacts.list.invalidate();
      setContactFormOpen(false);
    },
  });

  const updateContactMut = trpc.contacts.update.useMutation({
    onSuccess: (data) => {
      utils.contacts.list.invalidate();
      setEditingContact(undefined);
      setContactFormOpen(false);
      if (selected && selected.id === data.id) setSelected(data as Contact);
    },
  });

  const qrQuery = trpc.qr.getMyCode.useQuery(undefined, {
    enabled: isAuthenticated && !!orgQuery.data,
  });

  const chatMutation = trpc.ai.chat.useMutation({
    onSuccess: (data) => {
      setChatMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
      if (data.conversationId) setConversationId(data.conversationId);
    },
  });

  const handleSendMessage = (content: string) => {
    const newMessages = [...chatMessages, { role: "user" as const, content }];
    setChatMessages(newMessages);
    chatMutation.mutate({ messages: newMessages, conversationId });
  };

  // Auth gate
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[oklch(0.10_0.007_265)] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[oklch(0.78_0.12_75)] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[oklch(0.10_0.007_265)] flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 rounded-xl mx-auto mb-5 flex items-center justify-center"
            style={{ background: "oklch(0.78 0.12 75 / 15%)", border: "1px solid oklch(0.78 0.12 75 / 30%)" }}>
            <Shield className="w-7 h-7 text-foreground" />
          </div>
          <h2 className="text-foreground text-2xl font-bold mb-2">Sign In to Access CRM</h2>
          <p className="text-muted-foreground text-sm mb-6">Sign in to access the GridWorker OS CRM dashboard.</p>
          <Link href="/login"
            className="inline-block px-6 py-3 rounded-lg font-semibold text-sm"
            style={{ background: "oklch(0.78 0.12 75)", color: "oklch(0.10 0.008 265)" }}>
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  // Org onboarding gate
  if (orgQuery.isLoading) {
    return (
      <div className="min-h-screen bg-[oklch(0.10_0.007_265)] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[oklch(0.78_0.12_75)] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!orgQuery.data) {
    return <OnboardingFlow />;
  }

  const orgTier = orgQuery.data.tier;

  const myReferralCode = qrQuery.data?.referralCode;

  const filtered = (contacts ?? []).filter((c: Contact) => {
    const fullName = `${c.first_name} ${c.last_name}`.toLowerCase();
    const q = search.toLowerCase();
    if (showMyReferrals && myReferralCode) {
      // Filter by referral — contacts from signup will have company = industry
      return true; // TODO: when contacts have referral tracking
    }
    return (
      fullName.includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.company.toLowerCase().includes(q) ||
      c.stage.toLowerCase().includes(q)
    );
  });

  const totalContacts = contacts?.length ?? 0;
  const byStage = (contacts ?? []).reduce<Record<string, number>>((acc, c: Contact) => {
    acc[c.stage] = (acc[c.stage] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-sm bg-gradient-to-br from-[oklch(0.78_0.12_75)] to-[oklch(0.62_0.18_250)] flex items-center justify-center">
              <LayoutGrid className="w-3.5 h-3.5 text-[oklch(0.10_0.008_265)]" />
            </div>
            <span className="font-display text-sm text-foreground tracking-[0.2em]">
              GRIDWORKER <span className="text-primary">OS</span>
            </span>
            <span className="ml-2 px-2 py-0.5 rounded text-xs font-mono"
              style={{ background: "oklch(0.78 0.12 75 / 15%)", color: "oklch(0.78 0.12 75)" }}>
              CRM
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            {/* QR Code toggle */}
            <button
              onClick={() => { setQrOpen(!qrOpen); setChatOpen(false); setSelected(null); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: qrOpen ? "oklch(0.62 0.18 250)" : "oklch(0.62 0.18 250 / 15%)",
                color: qrOpen ? "#fff" : "oklch(0.62 0.18 250)",
              }}>
              <QrCode className="w-3.5 h-3.5" />
              QR
            </button>
            {/* AI Chat toggle */}
            {orgTier !== "starter" && (
              <button
                onClick={() => { setChatOpen(!chatOpen); setQrOpen(false); setSelected(null); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={{
                  background: chatOpen ? "oklch(0.78 0.12 75)" : "oklch(0.78 0.12 75 / 15%)",
                  color: chatOpen ? "oklch(0.10 0.008 265)" : "oklch(0.78 0.12 75)",
                }}>
                <Sparkles className="w-3.5 h-3.5" />
                AI
              </button>
            )}
            <span className="text-muted-foreground text-sm hidden sm:block">{user?.email}</span>
            <button onClick={() => signOut()}
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-sm">
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:block">Sign Out</span>
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 pt-24 pb-16">
        {/* Header */}
        <motion.div initial="hidden" animate="visible" variants={stagger} className="mb-8">
          <motion.div variants={fadeUp} className="mb-6">
            <h1 className="font-display text-4xl text-foreground mb-1">
              GRID <span className="text-primary">CRM</span>
            </h1>
            <p className="text-muted-foreground text-sm">
              {orgQuery.data.name} — Contact Management & Pipeline
            </p>
          </motion.div>

          {/* Stats */}
          <motion.div variants={stagger} className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard icon={Users} label="Total Contacts" value={totalContacts} sub="All time" />
            <StatCard icon={Zap} label="Active Leads" value={byStage["lead"] ?? 0} sub="New pipeline" />
            <StatCard icon={Building2} label="In Progress" value={(byStage["contacted"] ?? 0) + (byStage["qualified"] ?? 0) + (byStage["proposal"] ?? 0)} sub="Working deals" />
            <StatCard icon={TrendingUp} label="Won" value={byStage["won"] ?? 0} sub={`${totalContacts ? Math.round((byStage["won"] ?? 0) / totalContacts * 100) : 0}% conversion`} />
          </motion.div>
        </motion.div>

        {/* Main content */}
        <div className={`grid gap-6 ${selected || chatOpen || qrOpen ? "grid-cols-1 lg:grid-cols-3" : "grid-cols-1"}`}>
          {/* Table */}
          <div className={selected || chatOpen || qrOpen ? "lg:col-span-2" : ""}>
            {/* Toolbar */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search by name, email, industry, referral..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary bg-background border border-border"
                />
              </div>
              {myReferralCode && (
                <button
                  onClick={() => setShowMyReferrals(!showMyReferrals)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    background: showMyReferrals ? "oklch(0.62 0.18 250 / 20%)" : "transparent",
                    color: showMyReferrals ? "oklch(0.62 0.18 250)" : "oklch(0.55 0.01 265)",
                    border: `1px solid ${showMyReferrals ? "oklch(0.62 0.18 250 / 40%)" : "oklch(0.22 0.009 265)"}`,
                  }}
                  title="Filter to my referrals">
                  <Filter className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">My Referrals</span>
                </button>
              )}
              <button
                onClick={() => refetch()}
                className="p-2.5 rounded-lg transition-colors hover:bg-white/5 border border-border"
                title="Refresh">
                <RefreshCw className="w-4 h-4 text-muted-foreground" />
              </button>
              {/* Add Contact button */}
              <button
                onClick={() => { setEditingContact(undefined); setContactFormOpen(true); }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all"
                style={{ background: "oklch(0.78 0.12 75)", color: "oklch(0.10 0.008 265)" }}>
                + Add
              </button>
              <a
                href={`data:text/csv;charset=utf-8,${encodeURIComponent(
                  ["First Name,Last Name,Email,Phone,Company,Stage,Created",
                    ...(contacts ?? []).map((c: Contact) =>
                      `"${c.first_name}","${c.last_name}","${c.email}","${c.phone}","${c.company}","${c.stage}","${formatDate(c.created_at)}"`
                    )].join("\n")
                )}`}
                download="gridworker-contacts.csv"
                className="p-2.5 rounded-lg transition-colors hover:bg-white/5 border border-border"
                title="Export CSV">
                <Download className="w-4 h-4 text-muted-foreground" />
              </a>
            </div>

            {/* Table */}
            <div className="rounded-xl overflow-hidden border border-border bg-surface">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted border-b border-border">
                    <th className="px-4 py-3 text-left text-muted-foreground text-xs uppercase tracking-widest font-medium">Contact</th>
                    <th className="px-4 py-3 text-left text-muted-foreground text-xs uppercase tracking-widest font-medium hidden md:table-cell">Company</th>
                    <th className="px-4 py-3 text-left text-muted-foreground text-xs uppercase tracking-widest font-medium hidden lg:table-cell">Stage</th>
                    <th className="px-4 py-3 text-left text-muted-foreground text-xs uppercase tracking-widest font-medium hidden xl:table-cell">Created</th>
                    <th className="px-4 py-3 w-8"></th>
                  </tr>
                </thead>
                <motion.tbody initial="hidden" animate="visible" variants={stagger}>
                  {isLoading ? (
                    [...Array(5)].map((_, i) => (
                      <tr key={i} className="border-b border-border">
                        <td className="px-4 py-3" colSpan={5}>
                          <div className="h-8 rounded animate-pulse bg-muted" />
                        </td>
                      </tr>
                    ))
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center">
                        <Zap className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                        <p className="text-muted-foreground text-sm">
                          {search ? "No results match your search." : "No contacts yet. Add your first contact or share your referral link."}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filtered.map((c: Contact) => (
                      <ContactRow
                        key={c.id}
                        contact={c}
                        selected={selected?.id === c.id}
                        onClick={() => setSelected(selected?.id === c.id ? null : c)}
                      />
                    ))
                  )}
                </motion.tbody>
              </table>
            </div>
            <p className="text-muted-foreground text-xs mt-3 text-right">
              {filtered.length} of {totalContacts} contacts
            </p>
          </div>

          {/* Side panels */}
          {selected && !chatOpen && !qrOpen && (
            <div>
              <DetailPanel
                contact={selected}
                onClose={() => setSelected(null)}
                onEdit={() => { setEditingContact(selected); setContactFormOpen(true); }}
              />
            </div>
          )}

          {qrOpen && (
            <div className="rounded-xl p-6 flex flex-col gap-5 h-fit sticky top-24 bg-surface"
              style={{ border: "1px solid oklch(0.62 0.18 250 / 25%)" }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-muted-foreground" />
                  <span className="text-foreground text-sm font-semibold">My QR Code</span>
                </div>
                <button onClick={() => setQrOpen(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {qrQuery.isLoading ? (
                <div className="py-12 flex justify-center">
                  <div className="w-6 h-6 rounded-full border-2 border-[oklch(0.62_0.18_250)] border-t-transparent animate-spin" />
                </div>
              ) : qrQuery.error ? (
                <p className="text-red-400 text-sm text-center py-6">{qrQuery.error.message}</p>
              ) : qrQuery.data ? (
                <>
                  <div className="flex justify-center">
                    <img
                      src={qrQuery.data.qrCodeDataUrl}
                      alt="My Referral QR Code"
                      className="w-56 h-56 rounded-lg"
                      style={{ border: "2px solid oklch(0.22 0.009 265)" }}
                    />
                  </div>

                  <div className="rounded-lg p-3 text-center" >
                    <p className="text-muted-foreground text-xs uppercase tracking-widest mb-1">Referral Code</p>
                    <p className="text-foreground text-xl font-bold font-mono tracking-wider">{qrQuery.data.referralCode}</p>
                  </div>

                  <div className="rounded-lg p-3" >
                    <p className="text-muted-foreground text-xs uppercase tracking-widest mb-1">Referral Link</p>
                    <p className="text-muted-foreground text-xs font-mono break-all">{qrQuery.data.referralUrl}</p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(qrQuery.data!.referralUrl);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="w-full py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all"
                      style={{ background: "oklch(0.62 0.18 250 / 20%)", color: "oklch(0.62 0.18 250)", border: "1px solid oklch(0.62 0.18 250 / 30%)" }}>
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copied ? "Copied!" : "Copy Link"}
                    </button>
                    <button
                      onClick={() => {
                        const link = document.createElement("a");
                        link.href = qrQuery.data!.qrCodeDataUrl;
                        link.download = `gridworker-qr-${qrQuery.data!.referralCode}.png`;
                        link.click();
                      }}
                      className="w-full py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all"
                      style={{ background: "oklch(0.78 0.12 75)", color: "oklch(0.10 0.008 265)" }}>
                      <Download className="w-4 h-4" />
                      Download QR Code
                    </button>
                  </div>

                  <p className="text-muted-foreground text-xs text-center">
                    Share this QR code or link. When scanned, it opens the signup form with your referral code pre-filled.
                  </p>
                </>
              ) : null}
            </div>
          )}

          {chatOpen && (
            <div className="rounded-xl overflow-hidden flex flex-col h-[600px] sticky top-24 bg-surface"
              style={{ border: "1px solid oklch(0.78 0.12 75 / 25%)" }}>
              <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid oklch(0.22 0.009 265)" }}>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-foreground" />
                  <span className="text-foreground text-sm font-semibold">AI Assistant</span>
                  <span className="px-1.5 py-0.5 rounded text-xs"
                    style={{ background: "oklch(0.78 0.12 75 / 15%)", color: "oklch(0.78 0.12 75)" }}>
                    {orgTier}
                  </span>
                </div>
                <button onClick={() => setChatOpen(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              {orgTier === "starter" ? (
                <div className="flex-1 flex items-center justify-center p-6 text-center">
                  <div>
                    <Sparkles className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                    <p className="text-foreground font-semibold mb-1">Upgrade to Pro</p>
                    <p className="text-muted-foreground text-sm">
                      AI features require a Pro or Enterprise plan.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex-1 overflow-hidden">
                  <AIChatBox
                    messages={chatMessages}
                    onSendMessage={handleSendMessage}
                    isLoading={chatMutation.isPending}
                    placeholder="Ask about your contacts, trends, or actions..."
                    height="100%"
                    emptyStateMessage="Ask me about your business data, contacts, or marketing strategy."
                    suggestedPrompts={[
                      "Summarize my contacts",
                      "Which industries are most common?",
                      "Draft a follow-up email for new contacts",
                    ]}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Contact Form Modal */}
      {contactFormOpen && (
        <ContactForm
          contact={editingContact}
          loading={createContactMut.isPending || updateContactMut.isPending}
          onClose={() => { setContactFormOpen(false); setEditingContact(undefined); }}
          onSubmit={(data) => {
            if (editingContact) {
              updateContactMut.mutate({ contactId: editingContact.id, ...data });
            } else {
              createContactMut.mutate(data);
            }
          }}
        />
      )}
    </div>
  );
}
