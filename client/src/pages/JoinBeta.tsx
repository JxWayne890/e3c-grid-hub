/* ============================================================
   GRIDWORKER OS — BETA ONBOARDING LANDING PAGE
   Design: Dark Luxury Tech — matching main site aesthetic
   Purpose: Capture early user info, referral source, and
            get them into the ecosystem before full launch
   ============================================================ */

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Zap, Check, ChevronRight, LayoutGrid, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] } },
};
const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const HERO_BG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663322351516/HKTda8TZGwk5KWdfM3qn3f/e3c-hero-bg-TrzfcPijoqZJCRQexpPczg.webp";

const industries = [
  "Roofing", "HVAC", "Plumbing", "Electrical", "Solar",
  "D2D Sales", "Real Estate", "Health & Wellness", "Homeowner",
  "1099 Entrepreneur", "Natural/Home Goods", "Consulting", "Other"
];

const perks = [
  { icon: "⚡", title: "First In", desc: "Founding members lock in access before the public launch" },
  { icon: "🎯", title: "Personal Onboarding", desc: "Ethan personally reaches out to every person who joins" },
  { icon: "🔗", title: "Your Carrier Profile", desc: "Get your QR code and referral link the moment we go live" },
  { icon: "💰", title: "3-6-9 Earnings", desc: "Start building your grid now — every connection you make counts from day one" },
];

export default function JoinBeta() {
  const [step, setStep] = useState<"form" | "success">("form");
  const refParam = new URLSearchParams(window.location.search).get("ref");
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    industry: "",
    referral: refParam ?? "",
    message: "",
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (key: string, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const submitMutation = trpc.beta.submit.useMutation({
    onSuccess: () => {
      setLoading(false);
      setStep("success");
      toast.success("You're on the grid. Ethan will be in touch.");
    },
    onError: (err) => {
      setLoading(false);
      console.error("[GridWorker] Beta submit error:", err);
      toast.error(err.message || "Something went wrong. Please try again.");
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.phone || !form.industry) {
      toast.error("Please fill in all required fields.");
      return;
    }
    setLoading(true);
    try {
      await submitMutation.mutateAsync({
        name: form.name,
        email: form.email,
        phone: form.phone,
        industry: form.industry,
        referralCode: form.referral || undefined,
        message: form.message || undefined,
      });
    } catch (err) {
      console.error("[GridWorker] Submit failed:", err);
      // onError handler above will show the toast
    }
  };

  return (
    <div className="min-h-screen bg-[oklch(0.10_0.007_265)] text-white">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/6 bg-[oklch(0.10_0.007_265/90%)] backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-7 h-7 rounded-sm bg-gradient-to-br from-[oklch(0.78_0.12_75)] to-[oklch(0.62_0.18_250)] flex items-center justify-center">
              <LayoutGrid className="w-3.5 h-3.5 text-[oklch(0.10_0.008_265)]" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-display text-sm text-white tracking-[0.2em]">GRIDWORKER <span className="text-[oklch(0.78_0.12_75)]">OS</span></span>
            </div>
          </Link>
          <Link href="/" className="flex items-center gap-1.5 text-xs text-[oklch(0.50_0.01_265)] hover:text-white transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to site
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <div className="relative pt-14 overflow-hidden">
        <div className="absolute inset-0 opacity-20"
          style={{ backgroundImage: `url(${HERO_BG})`, backgroundSize: "cover", backgroundPosition: "center" }} />
        <div className="absolute inset-0"
          style={{ background: "linear-gradient(to bottom, oklch(0.10 0.007 265 / 0.7) 0%, oklch(0.10 0.007 265) 100%)" }} />

        <div className="relative z-10 max-w-5xl mx-auto px-6 pt-20 pb-16 text-center">
          <motion.div
            initial="hidden" animate="visible" variants={stagger}
            className="flex flex-col items-center gap-5">
            <motion.div variants={fadeUp}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[oklch(0.78_0.12_75/30%)] bg-[oklch(0.78_0.12_75/8%)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[oklch(0.78_0.12_75)] animate-pulse" />
              <span className="font-mono-brand text-[10px] tracking-widest text-[oklch(0.78_0.12_75)] uppercase">Early Access — Limited Spots</span>
            </motion.div>
            <motion.h1 variants={fadeUp}
              className="font-display text-5xl md:text-7xl text-white leading-none tracking-tight">
              GET ON<br />
              <span className="text-[oklch(0.78_0.12_75)]">THE GRID</span>
            </motion.h1>
            <motion.p variants={fadeUp}
              className="text-[oklch(0.60_0.01_265)] text-lg max-w-xl leading-relaxed">
              GridWorker OS is launching soon. Drop your info below and Ethan will personally reach out to get you set up with your Carrier Profile and referral link before anyone else.
            </motion.p>
          </motion.div>
        </div>
      </div>

      {/* Perks Row */}
      <div className="max-w-5xl mx-auto px-6 pb-12">
        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true }}
          variants={stagger}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-14">
          {perks.map(p => (
            <motion.div key={p.title} variants={fadeUp}
              className="rounded-xl p-4 bg-[oklch(0.14_0.009_265)] border border-white/6 flex flex-col gap-2">
              <span className="text-2xl">{p.icon}</span>
              <p className="font-display text-sm text-white tracking-wide">{p.title}</p>
              <p className="text-xs text-[oklch(0.50_0.01_265)] leading-relaxed">{p.desc}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Form / Success */}
        <div className="max-w-2xl mx-auto">
          {step === "form" ? (
            <motion.div
              initial="hidden" whileInView="visible" viewport={{ once: true }}
              variants={fadeUp}>
              <div className="rounded-2xl p-8 bg-[oklch(0.14_0.009_265)]"
                style={{ border: "1px solid oklch(0.78 0.12 75 / 22%)", boxShadow: "0 0 60px oklch(0.78 0.12 75 / 5%)" }}>
                <h2 className="font-display text-3xl text-white mb-1">CLAIM YOUR SPOT</h2>
                <p className="text-xs text-[oklch(0.50_0.01_265)] mb-6 font-mono-brand tracking-wide">All fields marked * are required</p>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  {/* Name + Phone */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { key: "name", label: "Full Name *", placeholder: "Your Name", type: "text" },
                      { key: "phone", label: "Phone Number *", placeholder: "(404) 000-0000", type: "tel" },
                    ].map(f => (
                      <div key={f.key} className="flex flex-col gap-1.5">
                        <label className="text-[10px] text-[oklch(0.55_0.01_265)] uppercase tracking-widest font-mono-brand">{f.label}</label>
                        <input
                          value={form[f.key as keyof typeof form]}
                          onChange={e => handleChange(f.key, e.target.value)}
                          placeholder={f.placeholder}
                          type={f.type}
                          className="bg-[oklch(0.19_0.012_265)] border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm placeholder:text-[oklch(0.35_0.01_265)] focus:outline-none focus:border-[oklch(0.78_0.12_75/50%)] transition-colors"
                        />
                      </div>
                    ))}
                  </div>

                  {/* Email */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-[oklch(0.55_0.01_265)] uppercase tracking-widest font-mono-brand">Email Address *</label>
                    <input
                      value={form.email}
                      onChange={e => handleChange("email", e.target.value)}
                      placeholder="you@yourdomain.com"
                      type="email"
                      className="bg-[oklch(0.19_0.012_265)] border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm placeholder:text-[oklch(0.35_0.01_265)] focus:outline-none focus:border-[oklch(0.78_0.12_75/50%)] transition-colors"
                    />
                  </div>

                  {/* Industry + Referral */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] text-[oklch(0.55_0.01_265)] uppercase tracking-widest font-mono-brand">Industry / Role *</label>
                      <select
                        value={form.industry}
                        onChange={e => handleChange("industry", e.target.value)}
                        className="bg-[oklch(0.19_0.012_265)] border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[oklch(0.78_0.12_75/50%)] transition-colors">
                        <option value="" disabled>Select your industry...</option>
                        {industries.map(i => <option key={i} value={i}>{i}</option>)}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] text-[oklch(0.55_0.01_265)] uppercase tracking-widest font-mono-brand">
                        {refParam ? `Referred by code: ${refParam}` : "Referral Code (optional)"}
                      </label>
                      <input
                        value={form.referral}
                        onChange={e => handleChange("referral", e.target.value)}
                        placeholder="Who sent you?"
                        readOnly={!!refParam}
                        className={`bg-[oklch(0.19_0.012_265)] border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm placeholder:text-[oklch(0.35_0.01_265)] focus:outline-none focus:border-[oklch(0.78_0.12_75/50%)] transition-colors ${refParam ? "opacity-70 cursor-not-allowed" : ""}`}
                      />
                    </div>
                  </div>

                  {/* Message */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-[oklch(0.55_0.01_265)] uppercase tracking-widest font-mono-brand">Tell me about yourself (optional)</label>
                    <textarea
                      value={form.message}
                      onChange={e => handleChange("message", e.target.value)}
                      placeholder="What do you do? What are you building? What made you reach out?"
                      rows={3}
                      className="bg-[oklch(0.19_0.012_265)] border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm placeholder:text-[oklch(0.35_0.01_265)] focus:outline-none focus:border-[oklch(0.78_0.12_75/50%)] transition-colors resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 rounded-lg text-sm font-semibold mt-1 flex items-center justify-center gap-2 transition-all"
                    style={{
                      background: loading ? "oklch(0.55 0.08 75)" : "linear-gradient(135deg, oklch(0.78 0.12 75), oklch(0.70 0.14 75))",
                      color: "oklch(0.10 0.008 265)",
                      boxShadow: loading ? "none" : "0 0 30px oklch(0.78 0.12 75 / 25%)"
                    }}>
                    {loading ? (
                      <>
                        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4" />
                        Get Me On The Grid
                        <ChevronRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <p className="text-[10px] text-center text-[oklch(0.40_0.01_265)] font-mono-brand">
                    Free tier available — no credit card required · Ethan personally reaches out to every person
                  </p>
                </form>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial="hidden" animate="visible" variants={fadeUp}
              className="rounded-2xl p-14 text-center bg-[oklch(0.14_0.009_265)]"
              style={{ border: "1px solid oklch(0.78 0.12 75 / 35%)", boxShadow: "0 0 60px oklch(0.78 0.12 75 / 12%)" }}>
              <div className="w-16 h-16 rounded-full bg-[oklch(0.78_0.12_75/15%)] flex items-center justify-center mx-auto mb-5">
                <Check className="w-8 h-8 text-[oklch(0.78_0.12_75)]" />
              </div>
              <h3 className="font-display text-5xl text-white mb-4">YOU'RE ON<br />THE GRID</h3>
              <p className="text-[oklch(0.60_0.01_265)] text-sm max-w-sm mx-auto mb-8 leading-relaxed">
                Your spot is locked in. Ethan will be in touch personally to get you fully set up with your Carrier Profile and referral link.
              </p>
              <div className="flex flex-col gap-3 max-w-xs mx-auto">
                <div className="flex items-center gap-3 text-sm text-[oklch(0.55_0.01_265)]">
                  <Check className="w-4 h-4 text-[oklch(0.78_0.12_75)] shrink-0" />
                  <span>Info received — you're in the queue</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-[oklch(0.55_0.01_265)]">
                  <Check className="w-4 h-4 text-[oklch(0.78_0.12_75)] shrink-0" />
                  <span>Ethan will DM or text you directly</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-[oklch(0.55_0.01_265)]">
                  <Check className="w-4 h-4 text-[oklch(0.78_0.12_75)] shrink-0" />
                  <span>Your Carrier Profile will be ready at launch</span>
                </div>
              </div>
              <p className="text-xs text-[oklch(0.40_0.01_265)] mt-8 font-mono-brand tracking-widest">
                COMMUNICATE. COLLABORATE. CONNECT.
              </p>
            </motion.div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/6 py-8 mt-8">
        <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-[oklch(0.35_0.01_265)] font-mono-brand">
            © 2026 E3C Collective · Ethan Dixon · Grid Worker Movement
          </p>
          <a href="https://www.instagram.com/ethandixon" target="_blank" rel="noopener noreferrer"
            className="text-xs text-[oklch(0.42_0.01_265)] hover:text-[oklch(0.78_0.12_75)] transition-colors font-mono-brand">
            @ethandixon
          </a>
        </div>
      </footer>
    </div>
  );
}
