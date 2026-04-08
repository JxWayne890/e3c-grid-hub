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
      className="rounded-xl p-5 flex items-start gap-4"
      style={{ background: "oklch(0.15 0.009 265)", border: "1px solid oklch(0.78 0.12 75 / 20%)" }}>
      <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: "oklch(0.78 0.12 75 / 15%)" }}>
        <Icon className="w-5 h-5 text-[oklch(0.78_0.12_75)]" />
      </div>
      <div>
        <p className="text-[oklch(0.55_0.01_265)] text-xs uppercase tracking-widest mb-0.5">{label}</p>
        <p className="text-white text-2xl font-bold leading-none">{value}</p>
        {sub && <p className="text-[oklch(0.55_0.01_265)] text-xs mt-1">{sub}</p>}
      </div>
    </motion.div>
  );
}

type Signup = {
  id: number;
  name: string;
  email: string;
  phone: string;
  industry: string;
  referral_code: string | null;
  message: string | null;
  created_at: string;
};

function SignupRow({ signup, onClick, selected }: {
  signup: Signup; onClick: () => void; selected: boolean;
}) {
  return (
    <motion.tr variants={fadeUp}
      onClick={onClick}
      className="cursor-pointer transition-colors"
      style={{
        background: selected ? "oklch(0.78 0.12 75 / 8%)" : "transparent",
        borderBottom: "1px solid oklch(0.20 0.009 265)"
      }}>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-[oklch(0.10_0.008_265)]"
            style={{ background: "oklch(0.78 0.12 75)" }}>
            {signup.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-white text-sm font-medium">{signup.name}</p>
            <p className="text-[oklch(0.50_0.01_265)] text-xs">{signup.email}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-[oklch(0.65_0.01_265)] text-sm hidden md:table-cell">{signup.industry}</td>
      <td className="px-4 py-3 hidden lg:table-cell">
        {signup.referral_code ? (
          <span className="px-2 py-0.5 rounded text-xs font-mono"
            style={{ background: "oklch(0.62 0.18 250 / 15%)", color: "oklch(0.62 0.18 250)" }}>
            {signup.referral_code}
          </span>
        ) : (
          <span className="text-[oklch(0.40_0.01_265)] text-xs">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-[oklch(0.50_0.01_265)] text-xs hidden xl:table-cell">
        {formatDate(signup.created_at)}
      </td>
      <td className="px-4 py-3">
        <ChevronRight className="w-4 h-4 text-[oklch(0.40_0.01_265)]" />
      </td>
    </motion.tr>
  );
}

function NotesSection({ signupId }: { signupId: number }) {
  const [noteText, setNoteText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const utils = trpc.useUtils();

  const { data: notes, isLoading } = trpc.notes.list.useQuery({ signupId });

  const addNote = trpc.notes.add.useMutation({
    onSuccess: () => {
      setNoteText("");
      utils.notes.list.invalidate({ signupId });
    },
  });

  const deleteNote = trpc.notes.delete.useMutation({
    onSuccess: () => {
      utils.notes.list.invalidate({ signupId });
    },
  });

  const handleAdd = () => {
    const trimmed = noteText.trim();
    if (!trimmed) return;
    addNote.mutate({ signupId, note: trimmed });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      handleAdd();
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <StickyNote className="w-3.5 h-3.5 text-[oklch(0.78_0.12_75)]" />
        <span className="text-[oklch(0.55_0.01_265)] text-xs uppercase tracking-widest">Interaction Notes</span>
        {notes && notes.length > 0 && (
          <span className="ml-auto px-1.5 py-0.5 rounded text-xs"
            style={{ background: "oklch(0.78 0.12 75 / 15%)", color: "oklch(0.78 0.12 75)" }}>
            {notes.length}
          </span>
        )}
      </div>

      {/* Add note input */}
      <div className="rounded-lg overflow-hidden" style={{ border: "1px solid oklch(0.25 0.009 265)" }}>
        <textarea
          ref={textareaRef}
          value={noteText}
          onChange={e => setNoteText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add a note about this contact... (Cmd+Enter to save)"
          rows={3}
          className="w-full px-3 pt-3 pb-1 text-sm text-white placeholder-[oklch(0.38_0.01_265)] resize-none outline-none"
          style={{ background: "oklch(0.12 0.008 265)" }}
        />
        <div className="flex items-center justify-between px-3 pb-2" style={{ background: "oklch(0.12 0.008 265)" }}>
          <span className="text-[oklch(0.35_0.01_265)] text-xs">{noteText.length}/2000</span>
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
          <p className="text-[oklch(0.38_0.01_265)] text-xs text-center py-4">
            No notes yet. Add your first interaction note above.
          </p>
        ) : (
          notes.map((note: any) => (
            <div key={note.id}
              className="rounded-lg p-3 group relative"
              style={{ background: "oklch(0.12 0.008 265)", border: "1px solid oklch(0.20 0.009 265)" }}>
              <p className="text-[oklch(0.75_0.01_265)] text-sm leading-relaxed pr-6">{note.note}</p>
              <p className="text-[oklch(0.38_0.01_265)] text-xs mt-1.5">{formatDate(note.created_at)}</p>
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

function DetailPanel({ signup, onClose }: { signup: Signup; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="rounded-xl p-6 flex flex-col gap-5 h-fit sticky top-24"
      style={{ background: "oklch(0.15 0.009 265)", border: "1px solid oklch(0.78 0.12 75 / 25%)" }}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-[oklch(0.10_0.008_265)]"
            style={{ background: "oklch(0.78 0.12 75)" }}>
            {signup.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="text-white font-bold text-lg leading-tight">{signup.name}</h3>
            <p className="text-[oklch(0.55_0.01_265)] text-xs">{signup.industry}</p>
          </div>
        </div>
        <button onClick={onClose}
          className="text-[oklch(0.45_0.01_265)] hover:text-white transition-colors text-xs">
          ✕
        </button>
      </div>

      {/* Contact Info */}
      <div className="flex flex-col gap-3">
        <a href={`mailto:${signup.email}`}
          className="flex items-center gap-3 p-3 rounded-lg transition-colors hover:bg-white/5"
          style={{ border: "1px solid oklch(0.22 0.009 265)" }}>
          <Mail className="w-4 h-4 text-[oklch(0.78_0.12_75)] flex-shrink-0" />
          <span className="text-[oklch(0.75_0.01_265)] text-sm truncate">{signup.email}</span>
        </a>
        <a href={`tel:${signup.phone}`}
          className="flex items-center gap-3 p-3 rounded-lg transition-colors hover:bg-white/5"
          style={{ border: "1px solid oklch(0.22 0.009 265)" }}>
          <Phone className="w-4 h-4 text-[oklch(0.78_0.12_75)] flex-shrink-0" />
          <span className="text-[oklch(0.75_0.01_265)] text-sm">{signup.phone}</span>
        </a>
        <div className="flex items-center gap-3 p-3 rounded-lg"
          style={{ border: "1px solid oklch(0.22 0.009 265)" }}>
          <Building2 className="w-4 h-4 text-[oklch(0.78_0.12_75)] flex-shrink-0" />
          <span className="text-[oklch(0.75_0.01_265)] text-sm">{signup.industry}</span>
        </div>
        {signup.referral_code && (
          <div className="flex items-center gap-3 p-3 rounded-lg"
            style={{ border: "1px solid oklch(0.22 0.009 265)" }}>
            <Link2 className="w-4 h-4 text-[oklch(0.62_0.18_250)] flex-shrink-0" />
            <span className="text-[oklch(0.62_0.18_250)] text-sm font-mono">{signup.referral_code}</span>
          </div>
        )}
        <div className="flex items-center gap-3 p-3 rounded-lg"
          style={{ border: "1px solid oklch(0.22 0.009 265)" }}>
          <Calendar className="w-4 h-4 text-[oklch(0.78_0.12_75)] flex-shrink-0" />
          <span className="text-[oklch(0.55_0.01_265)] text-xs">{formatDate(signup.created_at)}</span>
        </div>
      </div>

      {/* Message */}
      {signup.message && (
        <div className="rounded-lg p-4" style={{ background: "oklch(0.12 0.008 265)", border: "1px solid oklch(0.20 0.009 265)" }}>
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="w-3.5 h-3.5 text-[oklch(0.78_0.12_75)]" />
            <span className="text-[oklch(0.55_0.01_265)] text-xs uppercase tracking-widest">Message</span>
          </div>
          <p className="text-[oklch(0.70_0.01_265)] text-sm leading-relaxed">{signup.message}</p>
        </div>
      )}

      {/* Notes Section */}
      <div className="pt-1" style={{ borderTop: "1px solid oklch(0.20 0.009 265)" }}>
        <NotesSection signupId={signup.id} />
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2">
        <a href={`mailto:${signup.email}`}
          className="w-full py-2.5 rounded-lg text-sm font-semibold text-center transition-all"
          style={{ background: "oklch(0.78 0.12 75)", color: "oklch(0.10 0.008 265)" }}>
          Send Email
        </a>
        <a href={`sms:${signup.phone}`}
          className="w-full py-2.5 rounded-lg text-sm font-semibold text-center transition-all"
          style={{ background: "oklch(0.62 0.18 250 / 20%)", color: "oklch(0.62 0.18 250)", border: "1px solid oklch(0.62 0.18 250 / 30%)" }}>
          Send SMS
        </a>
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
            <Building2 className="w-7 h-7 text-[oklch(0.78_0.12_75)]" />
          </div>
          <h2 className="text-white text-2xl font-bold mb-2">Create Your Organization</h2>
          <p className="text-[oklch(0.55_0.01_265)] text-sm">Set up your organization to start using the CRM.</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="rounded-xl p-6 flex flex-col gap-4" style={{ background: "oklch(0.15 0.009 265)", border: "1px solid oklch(0.22 0.009 265)" }}>
            <div>
              <label className="block text-[oklch(0.55_0.01_265)] text-xs uppercase tracking-widest mb-1.5">
                Organization Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3 py-2.5 rounded-lg text-sm text-white placeholder-[oklch(0.38_0.01_265)] outline-none focus:ring-1 focus:ring-[oklch(0.78_0.12_75/50%)]"
                style={{ background: "oklch(0.12 0.008 265)", border: "1px solid oklch(0.25 0.009 265)" }}
                placeholder="My Company"
              />
            </div>
            <div>
              <label className="block text-[oklch(0.55_0.01_265)] text-xs uppercase tracking-widest mb-1.5">
                Slug
              </label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                required
                pattern="^[a-z0-9-]+$"
                className="w-full px-3 py-2.5 rounded-lg text-sm text-white placeholder-[oklch(0.38_0.01_265)] outline-none focus:ring-1 focus:ring-[oklch(0.78_0.12_75/50%)]"
                style={{ background: "oklch(0.12 0.008 265)", border: "1px solid oklch(0.25 0.009 265)" }}
                placeholder="my-company"
              />
              <p className="text-[oklch(0.40_0.01_265)] text-xs mt-1">Lowercase letters, numbers, and hyphens only</p>
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
  const [selected, setSelected] = useState<Signup | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [showMyReferrals, setShowMyReferrals] = useState(false);
  const [copied, setCopied] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [conversationId, setConversationId] = useState<string | undefined>();

  const orgQuery = trpc.org.current.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
  });

  const { data: signups, isLoading, refetch } = trpc.beta.listSignups.useQuery(undefined, {
    enabled: isAuthenticated && !!orgQuery.data,
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
            <Shield className="w-7 h-7 text-[oklch(0.78_0.12_75)]" />
          </div>
          <h2 className="text-white text-2xl font-bold mb-2">Sign In to Access CRM</h2>
          <p className="text-[oklch(0.55_0.01_265)] text-sm mb-6">Sign in to access the GridWorker OS CRM dashboard.</p>
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

  const filtered = (signups ?? []).filter((s: Signup) => {
    if (showMyReferrals && myReferralCode) {
      if (s.referral_code?.toUpperCase() !== myReferralCode.toUpperCase()) return false;
    }
    return (
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase()) ||
      s.industry.toLowerCase().includes(search.toLowerCase()) ||
      (s.referral_code ?? "").toLowerCase().includes(search.toLowerCase())
    );
  });

  const industries = Array.from(new Set((signups ?? []).map((s: Signup) => s.industry)));
  const withReferral = (signups ?? []).filter((s: Signup) => s.referral_code).length;

  return (
    <div className="min-h-screen bg-[oklch(0.10_0.007_265)] text-white">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/6 bg-[oklch(0.10_0.007_265/90%)] backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-sm bg-gradient-to-br from-[oklch(0.78_0.12_75)] to-[oklch(0.62_0.18_250)] flex items-center justify-center">
              <LayoutGrid className="w-3.5 h-3.5 text-[oklch(0.10_0.008_265)]" />
            </div>
            <span className="font-display text-sm text-white tracking-[0.2em]">
              GRIDWORKER <span className="text-[oklch(0.78_0.12_75)]">OS</span>
            </span>
            <span className="ml-2 px-2 py-0.5 rounded text-xs font-mono"
              style={{ background: "oklch(0.78 0.12 75 / 15%)", color: "oklch(0.78 0.12 75)" }}>
              CRM
            </span>
          </Link>
          <div className="flex items-center gap-4">
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
            <span className="text-[oklch(0.55_0.01_265)] text-sm hidden sm:block">{user?.email}</span>
            <button onClick={() => signOut()}
              className="flex items-center gap-1.5 text-[oklch(0.50_0.01_265)] hover:text-white transition-colors text-sm">
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
            <h1 className="font-display text-4xl text-white mb-1">
              GRID <span className="text-[oklch(0.78_0.12_75)]">CRM</span>
            </h1>
            <p className="text-[oklch(0.55_0.01_265)] text-sm">
              {orgQuery.data.name} — Beta Signups & Contact Management
            </p>
          </motion.div>

          {/* Stats */}
          <motion.div variants={stagger} className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard icon={Users} label="Total Signups" value={signups?.length ?? 0} sub="All time" />
            <StatCard icon={Link2} label="With Referral" value={withReferral} sub={`${signups?.length ? Math.round(withReferral / signups.length * 100) : 0}% of total`} />
            <StatCard icon={Building2} label="Industries" value={industries.length} sub="Unique sectors" />
            <StatCard icon={TrendingUp} label="This Week" value={
              (signups ?? []).filter((s: Signup) => {
                const d = new Date(s.created_at);
                const now = new Date();
                return (now.getTime() - d.getTime()) < 7 * 24 * 60 * 60 * 1000;
              }).length
            } sub="Last 7 days" />
          </motion.div>
        </motion.div>

        {/* Main content */}
        <div className={`grid gap-6 ${selected || chatOpen || qrOpen ? "grid-cols-1 lg:grid-cols-3" : "grid-cols-1"}`}>
          {/* Table */}
          <div className={selected || chatOpen || qrOpen ? "lg:col-span-2" : ""}>
            {/* Toolbar */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[oklch(0.45_0.01_265)]" />
                <input
                  type="text"
                  placeholder="Search by name, email, industry, referral..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm text-white placeholder-[oklch(0.40_0.01_265)] outline-none focus:ring-1 focus:ring-[oklch(0.78_0.12_75/50%)]"
                  style={{ background: "oklch(0.15 0.009 265)", border: "1px solid oklch(0.22 0.009 265)" }}
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
                className="p-2.5 rounded-lg transition-colors hover:bg-white/5"
                style={{ border: "1px solid oklch(0.22 0.009 265)" }}
                title="Refresh">
                <RefreshCw className="w-4 h-4 text-[oklch(0.55_0.01_265)]" />
              </button>
              <a
                href={`data:text/csv;charset=utf-8,${encodeURIComponent(
                  ["Name,Email,Phone,Industry,Referral,Signed Up",
                    ...(signups ?? []).map((s: Signup) =>
                      `"${s.name}","${s.email}","${s.phone}","${s.industry}","${s.referral_code ?? ""}","${formatDate(s.created_at)}"`
                    )].join("\n")
                )}`}
                download="gridworker-signups.csv"
                className="p-2.5 rounded-lg transition-colors hover:bg-white/5"
                style={{ border: "1px solid oklch(0.22 0.009 265)" }}
                title="Export CSV">
                <Download className="w-4 h-4 text-[oklch(0.55_0.01_265)]" />
              </a>
            </div>

            {/* Table */}
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid oklch(0.20 0.009 265)" }}>
              <table className="w-full">
                <thead>
                  <tr style={{ background: "oklch(0.13 0.008 265)", borderBottom: "1px solid oklch(0.20 0.009 265)" }}>
                    <th className="px-4 py-3 text-left text-[oklch(0.45_0.01_265)] text-xs uppercase tracking-widest font-medium">Contact</th>
                    <th className="px-4 py-3 text-left text-[oklch(0.45_0.01_265)] text-xs uppercase tracking-widest font-medium hidden md:table-cell">Industry</th>
                    <th className="px-4 py-3 text-left text-[oklch(0.45_0.01_265)] text-xs uppercase tracking-widest font-medium hidden lg:table-cell">Referral</th>
                    <th className="px-4 py-3 text-left text-[oklch(0.45_0.01_265)] text-xs uppercase tracking-widest font-medium hidden xl:table-cell">Signed Up</th>
                    <th className="px-4 py-3 w-8"></th>
                  </tr>
                </thead>
                <motion.tbody initial="hidden" animate="visible" variants={stagger}>
                  {isLoading ? (
                    [...Array(5)].map((_, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid oklch(0.18 0.009 265)" }}>
                        <td className="px-4 py-3" colSpan={5}>
                          <div className="h-8 rounded animate-pulse" style={{ background: "oklch(0.15 0.009 265)" }} />
                        </td>
                      </tr>
                    ))
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center">
                        <Zap className="w-8 h-8 text-[oklch(0.30_0.01_265)] mx-auto mb-3" />
                        <p className="text-[oklch(0.45_0.01_265)] text-sm">
                          {search ? "No results match your search." : "No signups yet. Share your link and watch the grid grow."}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filtered.map((s: Signup) => (
                      <SignupRow
                        key={s.id}
                        signup={s}
                        selected={selected?.id === s.id}
                        onClick={() => setSelected(selected?.id === s.id ? null : s)}
                      />
                    ))
                  )}
                </motion.tbody>
              </table>
            </div>
            <p className="text-[oklch(0.40_0.01_265)] text-xs mt-3 text-right">
              {filtered.length} of {signups?.length ?? 0} contacts
            </p>
          </div>

          {/* Side panels */}
          {selected && !chatOpen && !qrOpen && (
            <div>
              <DetailPanel signup={selected} onClose={() => setSelected(null)} />
            </div>
          )}

          {qrOpen && (
            <div className="rounded-xl p-6 flex flex-col gap-5 h-fit sticky top-24"
              style={{ background: "oklch(0.15 0.009 265)", border: "1px solid oklch(0.62 0.18 250 / 25%)" }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-[oklch(0.62_0.18_250)]" />
                  <span className="text-white text-sm font-semibold">My QR Code</span>
                </div>
                <button onClick={() => setQrOpen(false)}
                  className="text-[oklch(0.45_0.01_265)] hover:text-white transition-colors">
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

                  <div className="rounded-lg p-3 text-center" style={{ background: "oklch(0.12 0.008 265)", border: "1px solid oklch(0.20 0.009 265)" }}>
                    <p className="text-[oklch(0.50_0.01_265)] text-xs uppercase tracking-widest mb-1">Referral Code</p>
                    <p className="text-white text-xl font-bold font-mono tracking-wider">{qrQuery.data.referralCode}</p>
                  </div>

                  <div className="rounded-lg p-3" style={{ background: "oklch(0.12 0.008 265)", border: "1px solid oklch(0.20 0.009 265)" }}>
                    <p className="text-[oklch(0.50_0.01_265)] text-xs uppercase tracking-widest mb-1">Referral Link</p>
                    <p className="text-[oklch(0.62_0.18_250)] text-xs font-mono break-all">{qrQuery.data.referralUrl}</p>
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

                  <p className="text-[oklch(0.40_0.01_265)] text-xs text-center">
                    Share this QR code or link. When scanned, it opens the signup form with your referral code pre-filled.
                  </p>
                </>
              ) : null}
            </div>
          )}

          {chatOpen && (
            <div className="rounded-xl overflow-hidden flex flex-col h-[600px] sticky top-24"
              style={{ background: "oklch(0.15 0.009 265)", border: "1px solid oklch(0.78 0.12 75 / 25%)" }}>
              <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid oklch(0.22 0.009 265)" }}>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[oklch(0.78_0.12_75)]" />
                  <span className="text-white text-sm font-semibold">AI Assistant</span>
                  <span className="px-1.5 py-0.5 rounded text-xs"
                    style={{ background: "oklch(0.78 0.12 75 / 15%)", color: "oklch(0.78 0.12 75)" }}>
                    {orgTier}
                  </span>
                </div>
                <button onClick={() => setChatOpen(false)}
                  className="text-[oklch(0.45_0.01_265)] hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              {orgTier === "starter" ? (
                <div className="flex-1 flex items-center justify-center p-6 text-center">
                  <div>
                    <Sparkles className="w-8 h-8 text-[oklch(0.30_0.01_265)] mx-auto mb-3" />
                    <p className="text-white font-semibold mb-1">Upgrade to Pro</p>
                    <p className="text-[oklch(0.50_0.01_265)] text-sm">
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
                      "Summarize my recent signups",
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
    </div>
  );
}
