/* ============================================================
   GRIDWORKER OS — HOME PAGE
   Design: Dark Luxury Tech — "The Grid as Infrastructure"
   Philosophy: Communicate. Collaborate. Connect.
   Sections:
     Nav, Hero, GridExpansion, HowItWorks, EcosystemMap,
     Features, WhoItsFor, Pricing, Flywheel, VisualGallery,
     BetaCTA, Footer
   ============================================================ */

import { useState, useEffect, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { toast } from "sonner";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import {
  Users, QrCode, TrendingUp, Zap, Shield, Globe,
  ChevronRight, Check, ArrowRight, Menu, LayoutGrid,
  Database, Wallet, Bell, Link2, Star, Lock, Unlock,
  Home as HomeIcon, Wrench, Sun, Wind, Droplets, ShoppingBag,
  Building2, Activity, DollarSign, GitBranch, Award, CreditCard, Bitcoin
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

// ─── CDN Assets ─────────────────────────────────────────────
const HERO_BG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663322351516/HKTda8TZGwk5KWdfM3qn3f/e3c-hero-bg-TrzfcPijoqZJCRQexpPczg.webp";
const GRID_EXPANSION = "https://d2xsxph8kpxj0f.cloudfront.net/310519663322351516/HKTda8TZGwk5KWdfM3qn3f/e3c-grid-expansion-diagram-iNJEYfrs6i4HDFKiXmgpFj.png";
const FLYWHEEL_DIAGRAM = "https://d2xsxph8kpxj0f.cloudfront.net/310519663322351516/HKTda8TZGwk5KWdfM3qn3f/e3c-os-flywheel-diagram-7rPC9nGSXJT7S4r4aUjEDh.png";
const ECOSYSTEM_MAP = "https://d2xsxph8kpxj0f.cloudfront.net/310519663322351516/HKTda8TZGwk5KWdfM3qn3f/e3c-ecosystem-interconnect-BDmEvWLuW8mu5xFVp4Vcvu.png";
const WATER_DROPLET = "https://d2xsxph8kpxj0f.cloudfront.net/310519663322351516/HKTda8TZGwk5KWdfM3qn3f/e3c-water-droplet-network-JoCm7349sbLWi3eZjryR2X.png";
const WATER_INTERNAL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663322351516/HKTda8TZGwk5KWdfM3qn3f/e3c-water-internal-grid-93U7cgDD4vqgXdXp2aV5LD.png";
const NETWORK_EXPLOSION = "https://d2xsxph8kpxj0f.cloudfront.net/310519663322351516/HKTda8TZGwk5KWdfM3qn3f/e3c-network-explosion-GRyRddgeS5UsKjqeywMyAe.png";
const PAYOUT_DIAGRAM = "https://d2xsxph8kpxj0f.cloudfront.net/310519663322351516/HKTda8TZGwk5KWdfM3qn3f/e3c-payout-diagram-9uHdz47akVEvuSDUZxBnjV.png";
const PRICING_TIERS_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663322351516/HKTda8TZGwk5KWdfM3qn3f/e3c-pricing-tiers-Fhgwishz8Mbaf3MrHxEzVx.png";

// ─── Animation helpers ──────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] } },
};
const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.6 } },
};
const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

function AnimSection({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div ref={ref} initial="hidden" animate={inView ? "visible" : "hidden"} variants={stagger} className={className}>
      {children}
    </motion.div>
  );
}

function StatCounter({ end, suffix = "" }: { end: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const duration = 1800;
    const step = Math.ceil(end / (duration / 16));
    const timer = setInterval(() => {
      start += step;
      if (start >= end) { setCount(end); clearInterval(timer); }
      else setCount(start);
    }, 16);
    return () => clearInterval(timer);
  }, [inView, end]);
  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

// ─── Section Label ──────────────────────────────────────────
function SectionLabel({ text }: { text: string }) {
  return (
    <motion.p variants={fadeUp} className="font-mono-brand text-xs text-[oklch(0.78_0.12_75)] tracking-[0.25em] uppercase mb-4">
      {text}
    </motion.p>
  );
}

// ─── Divider ────────────────────────────────────────────────
function GridDivider() {
  return (
    <div className="w-full flex items-center gap-4 px-8 my-2 opacity-20">
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[oklch(0.78_0.12_75)] to-transparent" />
      <div className="w-1.5 h-1.5 rotate-45 bg-[oklch(0.78_0.12_75)]" />
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[oklch(0.78_0.12_75)] to-transparent" />
    </div>
  );
}

// ─── Nav ────────────────────────────────────────────────────
function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);
  const links = [
    { label: "How It Works", id: "how-it-works" },
    { label: "Ecosystem", id: "ecosystem-map" },
    { label: "Features", id: "features" },
    { label: "Join", id: "pricing" },
  ];
  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "bg-background/95 backdrop-blur-md border-b border-border" : ""}`}>
      <div className="container flex items-center justify-between h-16">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-sm bg-gradient-to-br from-[oklch(0.78_0.12_75)] to-[oklch(0.62_0.18_250)] flex items-center justify-center shadow-lg">
            <LayoutGrid className="w-4 h-4 text-[oklch(0.10_0.008_265)]" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-display text-base text-foreground tracking-[0.2em]">GRIDWORKER <span className="text-[oklch(0.78_0.12_75)]">OS</span></span>
            <span className="font-mono-brand text-[9px] text-muted-foreground tracking-widest uppercase">by E3C Collective</span>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-8">
          {links.map(l => (
            <a key={l.id} href={`#${l.id}`}
              className="text-sm text-muted-foreground hover:text-[oklch(0.78_0.12_75)] transition-colors font-medium tracking-wide">
              {l.label}
            </a>
          ))}
        </div>
        <div className="hidden md:flex items-center gap-3">
          <ThemeToggle />
          <Link href="/login"
            className="text-sm text-[oklch(0.78_0.12_75)] hover:text-foreground transition-colors font-semibold tracking-wide">
            Sign In
          </Link>
          <Link href="/join"
            className="btn-gold px-5 py-2 rounded-md text-sm text-primary-foreground">
            Join Beta
          </Link>
        </div>
        <div className="flex items-center gap-4 md:hidden">
          <ThemeToggle />
          <button className="text-foreground" onClick={() => setOpen(!open)}>
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </div>
      {open && (
        <div className="md:hidden bg-background border-t border-border px-4 py-4 flex flex-col gap-4">
          {links.map(l => (
            <a key={l.id} href={`#${l.id}`} onClick={() => setOpen(false)}
              className="text-sm text-muted-foreground hover:text-[oklch(0.78_0.12_75)] transition-colors font-medium">
              {l.label}
            </a>
          ))}
          <Link href="/join" onClick={() => setOpen(false)}
            className="btn-gold px-5 py-2 rounded-md text-sm w-full text-center block text-primary-foreground">
            Join Beta
          </Link>
        </div>
      )}
    </nav>
  );
}

// ─── Hero ───────────────────────────────────────────────────
function Hero() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      <div className="absolute inset-0">
        <img src={HERO_BG} alt="" className="w-full h-full object-cover opacity-50" />
        <div className="absolute inset-0 bg-gradient-to-b from-[oklch(0.11_0.008_265/0.6)] via-[oklch(0.11_0.008_265/0.2)] to-[oklch(0.11_0.008_265)]" />
        <div className="absolute inset-0 bg-gradient-to-r from-[oklch(0.11_0.008_265/0.8)] via-transparent to-transparent" />
      </div>
      <div className="container relative z-10 pt-24 pb-16">
        <div className="max-w-3xl">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[oklch(0.78_0.12_75/40%)] bg-[oklch(0.78_0.12_75/8%)] mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[oklch(0.78_0.12_75)] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[oklch(0.78_0.12_75)]"></span>
            </span>
            <span className="font-mono-brand text-xs text-[oklch(0.78_0.12_75)] tracking-widest uppercase">Beta Launch — Grid Worker Movement</span>
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.55 }}
            className="font-display text-6xl md:text-8xl lg:text-[7rem] text-white leading-none mb-5">
            COMMUNICATE.<br />
            <span className="text-gold-gradient">COLLABORATE.</span><br />
            CONNECT.
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.5 }}
            className="text-lg md:text-xl text-[oklch(0.70_0.01_265)] max-w-xl leading-relaxed mb-8 font-light">
            GridWorker OS is the referral-powered operating system for your relationships. Every connection tracked. Every referral rewarded. One ecosystem — every industry.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.5 }}
            className="flex flex-col sm:flex-row gap-4">
            <button onClick={() => document.getElementById("beta-cta")?.scrollIntoView({ behavior: "smooth" })}
              className="btn-gold px-8 py-3.5 rounded-md text-base glow-pulse flex items-center gap-2 justify-center">
              Claim Your Carrier Profile <ArrowRight className="w-4 h-4" />
            </button>
            <button onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}
              className="px-8 py-3.5 rounded-md text-base border border-white/20 text-white hover:border-white/40 hover:bg-white/5 transition-all flex items-center gap-2 justify-center font-semibold tracking-wide">
              See How It Works
            </button>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7, duration: 0.6 }}
            className="flex flex-wrap gap-8 mt-12 pt-8 border-t border-white/10">
            {[
              { label: "Beta Spots Available", value: 50, suffix: "" },
              { label: "Industries Covered", value: 12, suffix: "+" },
              { label: "Gratitude Fund", value: 3, suffix: "%" },
            ].map(s => (
              <div key={s.label}>
                <div className="font-display text-3xl text-[oklch(0.78_0.12_75)]">
                  <StatCounter end={s.value} suffix={s.suffix} />
                </div>
                <div className="text-xs text-[oklch(0.50_0.01_265)] uppercase tracking-widest mt-0.5">{s.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ─── Grid Expansion Visual ──────────────────────────────────
function GridExpansion() {
  return (
    <section className="py-20 relative overflow-hidden bg-background">
      <div className="absolute inset-0 opacity-5"
        style={{ backgroundImage: "radial-gradient(circle at 50% 50%, oklch(0.78 0.12 75), transparent 60%)" }} />
      <div className="container">
        <AnimSection>
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <SectionLabel text="The Foundation" />
              <motion.h2 variants={fadeUp} className="font-display text-5xl md:text-6xl text-white leading-none mb-6">
                STABILIZE YOUR<br /><span className="text-gold-gradient">INTERNAL GRID.</span><br />EXPAND YOUR<br />EXTERNAL.
              </motion.h2>
              <motion.p variants={fadeUp} className="text-[oklch(0.65_0.01_265)] leading-relaxed mb-6">
                Every empire starts from within. GridWorker OS is built on a simple truth: when you get your internal grid right — your mindset, your relationships, your data — the external grid expands naturally. One stable node changes the whole network.
              </motion.p>
              <motion.div variants={fadeUp} className="flex flex-col gap-3">
                {[
                  { step: "01", label: "Stabilize Yourself", desc: "One relationship. One node. You." },
                  { step: "02", label: "Build Your Circle", desc: "Your internal grid — 6 trusted connections." },
                  { step: "03", label: "Expand Your Network", desc: "The external grid — infinite from here." },
                ].map(item => (
                  <div key={item.step} className="flex items-start gap-4 p-4 rounded-lg bg-white/3 border border-white/6 hover:border-[oklch(0.78_0.12_75/30%)] transition-colors">
                    <span className="font-mono-brand text-xs text-[oklch(0.78_0.12_75)] mt-0.5 shrink-0">{item.step}</span>
                    <div>
                      <p className="text-white font-semibold text-sm">{item.label}</p>
                      <p className="text-[oklch(0.55_0.01_265)] text-xs mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </motion.div>
            </div>
            <motion.div variants={fadeIn} className="relative">
              <div className="absolute -inset-4 rounded-2xl opacity-20"
                style={{ background: "radial-gradient(circle, oklch(0.78 0.12 75 / 0.4), transparent 70%)" }} />
              <img src={GRID_EXPANSION} alt="The Grid Expansion Diagram"
                className="w-full rounded-xl shadow-2xl relative z-10 border border-white/8" />
            </motion.div>
          </div>
        </AnimSection>
      </div>
    </section>
  );
}

// ─── How It Works ───────────────────────────────────────────
function HowItWorks() {
  const steps = [
    { num: "01", icon: QrCode, title: "Scan & Join", desc: "A connection scans your QR code or clicks your referral link. They land on a simple intake form and create their Carrier Profile in under 60 seconds." },
    { num: "02", icon: Users, title: "Build Your Grid", desc: "Every person you bring in is tracked under your node. You build your internal circle first — then it expands outward automatically." },
    { num: "03", icon: TrendingUp, title: "Track Everything", desc: "Your Carrier Profile dashboard shows every connection, every referral, every lead — who brought who in, and where they are in the pipeline." },
    { num: "04", icon: Zap, title: "Get Paid to Connect", desc: "When a referral converts — whether it's a Kangen water machine, a roofing job, or any service — the income flows back through the chain to you." },
  ];
  return (
    <section id="how-it-works" className="py-24 bg-surface">
      <div className="container">
        <AnimSection>
          <div className="text-center mb-16">
            <SectionLabel text="The Process" />
            <motion.h2 variants={fadeUp} className="font-display text-5xl md:text-6xl text-white">HOW IT WORKS</motion.h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((s, i) => (
              <motion.div key={s.num} variants={fadeUp}
                className="relative p-6 rounded-xl bg-[oklch(0.16_0.01_265)] border border-white/8 hover:border-[oklch(0.78_0.12_75/35%)] transition-all group">
                {i < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-8 -right-3 z-10">
                    <ChevronRight className="w-5 h-5 text-[oklch(0.78_0.12_75/40%)]" />
                  </div>
                )}
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 rounded-lg bg-[oklch(0.78_0.12_75/12%)] flex items-center justify-center group-hover:bg-[oklch(0.78_0.12_75/20%)] transition-colors">
                    <s.icon className="w-5 h-5 text-[oklch(0.78_0.12_75)]" />
                  </div>
                  <span className="font-mono-brand text-3xl text-[oklch(0.78_0.12_75/20%)] font-bold">{s.num}</span>
                </div>
                <h3 className="font-display text-xl text-white mb-2">{s.title}</h3>
                <p className="text-sm text-[oklch(0.58_0.01_265)] leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </AnimSection>
      </div>
    </section>
  );
}

// ─── Ecosystem Map ──────────────────────────────────────────
function EcosystemMap() {
  const industries = [
    { icon: HomeIcon, label: "Roofing" },
    { icon: Sun, label: "Solar" },
    { icon: Wind, label: "HVAC" },
    { icon: Droplets, label: "Plumbing" },
    { icon: Zap, label: "Electrical" },
    { icon: Users, label: "D2D Sales" },
    { icon: Building2, label: "Real Estate" },
    { icon: Activity, label: "Health & Wellness" },
    { icon: ShoppingBag, label: "Marketplace" },
    { icon: Wrench, label: "Home Services" },
    { icon: Globe, label: "1099 Entrepreneurs" },
    { icon: Star, label: "Any Industry" },
  ];
  return (
    <section id="ecosystem-map" className="py-24 bg-[oklch(0.11_0.008_265)] relative overflow-hidden">
      <div className="absolute right-0 top-0 bottom-0 w-1/2 opacity-15 hidden lg:block">
        <img src={ECOSYSTEM_MAP} alt="" className="w-full h-full object-cover object-left" />
      </div>
      <div className="container relative z-10">
        <AnimSection>
          <div className="max-w-2xl">
            <SectionLabel text="One Ecosystem. Every Industry." />
            <motion.h2 variants={fadeUp} className="font-display text-5xl md:text-6xl text-white leading-none mb-6">
              YOU ARE THE<br /><span className="text-gold-gradient">CENTER NODE.</span>
            </motion.h2>
            <motion.p variants={fadeUp} className="text-[oklch(0.65_0.01_265)] leading-relaxed mb-10 max-w-lg">
              GridWorker OS is industry-agnostic. Whether you're in roofing, solar, D2D sales, or health and wellness — every connection you make in the field becomes a tracked node in your personal grid. Your relationships. Your data. Your income.
            </motion.p>
            <motion.div variants={stagger} className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {industries.map(ind => (
                <motion.div key={ind.label} variants={fadeUp}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-[oklch(0.16_0.01_265)] border border-white/8 hover:border-[oklch(0.78_0.12_75/30%)] transition-all group">
                  <ind.icon className="w-4 h-4 text-[oklch(0.78_0.12_75)] shrink-0" />
                  <span className="text-sm text-[oklch(0.72_0.01_265)] font-medium group-hover:text-white transition-colors">{ind.label}</span>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </AnimSection>
      </div>
    </section>
  );
}

// ─── Features ───────────────────────────────────────────────
function Features() {
  const features = [
    {
      tag: "CORE", icon: QrCode, title: "Carrier Profile + QR Code",
      desc: "Every user gets a personal Carrier Profile with a unique QR code and referral link. Share it in the field, online, or anywhere.",
      free: true,
    },
    {
      tag: "CORE", icon: Users, title: "Referral Tracking Engine",
      desc: "Every connection is tracked back to the person who brought them in. The chain is permanent, transparent, and automated.",
      free: false,
    },
    {
      tag: "CORE", icon: Database, title: "Basic CRM Pipeline",
      desc: "Free users get a simple contact tracker to manage their connections and see who's in their network.",
      free: true,
    },
    {
      tag: "PRO", icon: TrendingUp, title: "Advanced CRM + Pipeline",
      desc: "Full pipeline management with stages, follow-up reminders, notes, and lead scoring. Your entire book of business in one place.",
      free: false,
    },
    {
      tag: "PRO", icon: Wallet, title: "Referral Income Dashboard",
      desc: "See exactly what you've earned, what's pending, and who generated it. Real-time income tracking tied to every node in your grid.",
      free: false,
    },
    {
      tag: "PRO", icon: Bell, title: "Automated Follow-Up Sequences",
      desc: "SMS and email automations triggered the moment someone enters your grid. Stay top of mind without lifting a finger.",
      free: false,
    },
    {
      tag: "ECOSYSTEM", icon: Globe, title: "Marketplace Access",
      desc: "List your services or find local contractors, D2D reps, and 1099 entrepreneurs. Filter by industry, location, and specialty.",
      free: false,
    },
    {
      tag: "ECOSYSTEM", icon: Link2, title: "Build-Under Network",
      desc: "Place homeowners and new contacts under existing distributor IDs. Every sale is attributed correctly, every time.",
      free: false,
    },
    {
      tag: "ECOSYSTEM", icon: Shield, title: "3% Gratitude Fund",
      desc: "A percentage of every transaction flows into the E3C Gratitude Fund — fueling community outreach and the Grid Worker Movement.",
      free: false,
    },
  ];

  const tagColors: Record<string, string> = {
    CORE: "text-[oklch(0.65_0.18_250)] bg-[oklch(0.65_0.18_250/12%)] border-[oklch(0.65_0.18_250/25%)]",
    PRO: "text-[oklch(0.78_0.12_75)] bg-[oklch(0.78_0.12_75/12%)] border-[oklch(0.78_0.12_75/25%)]",
    ECOSYSTEM: "text-[oklch(0.72_0.15_145)] bg-[oklch(0.72_0.15_145/12%)] border-[oklch(0.72_0.15_145/25%)]",
  };

  return (
    <section id="features" className="py-24 bg-surface">
      <div className="container">
        <AnimSection>
          <div className="text-center mb-16">
            <SectionLabel text="Platform Features" />
            <motion.h2 variants={fadeUp} className="font-display text-5xl md:text-6xl text-white mb-4">BUILT FOR THE FIELD.</motion.h2>
            <motion.p variants={fadeUp} className="text-[oklch(0.60_0.01_265)] max-w-xl mx-auto">
              Everything a Grid Worker needs to communicate, collaborate, and connect — from the first door knock to the full ecosystem.
            </motion.p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map(f => (
              <motion.div key={f.title} variants={fadeUp}
                className={`p-6 rounded-xl border transition-all group hover:translate-y-[-2px] ${f.free ? "bg-[oklch(0.16_0.01_265)] border-white/10" : "bg-[oklch(0.15_0.009_265)] border-white/6"}`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 rounded-lg bg-[oklch(0.78_0.12_75/10%)] flex items-center justify-center">
                    <f.icon className="w-5 h-5 text-[oklch(0.78_0.12_75)]" />
                  </div>
                  <div className="flex items-center gap-2">
                    {f.free && (
                      <span className="text-[9px] font-mono-brand px-2 py-0.5 rounded-full border text-emerald-400 bg-emerald-400/10 border-emerald-400/25 tracking-widest">FREE</span>
                    )}
                    <span className={`text-[9px] font-mono-brand px-2 py-0.5 rounded-full border tracking-widest ${tagColors[f.tag]}`}>{f.tag}</span>
                  </div>
                </div>
                <h3 className="font-semibold text-white mb-2 text-base">{f.title}</h3>
                <p className="text-sm text-[oklch(0.55_0.01_265)] leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </AnimSection>
      </div>
    </section>
  );
}

// ─── Who It's For ───────────────────────────────────────────
function WhoItsFor() {
  const personas = [
    { icon: Wrench, title: "Contractors & Tradespeople", desc: "Roofers, HVAC techs, plumbers, electricians — anyone in the field building relationships every day. Your connections are your currency." },
    { icon: Sun, title: "D2D Sales Reps", desc: "Solar, pest control, security, alarms — if you're knocking doors, you're building a grid. GridWorker OS makes sure you get paid for every connection you make." },
    { icon: HomeIcon, title: "Homeowners", desc: "Get connected to trusted local service providers, track your home service history, and earn referral rewards when you connect your neighbors." },
    { icon: Activity, title: "Health & Wellness Entrepreneurs", desc: "Kangen water distributors, coaches, biohackers — build your team and track your referral network with the same system your whole ecosystem runs on." },
    { icon: Building2, title: "Real Estate Professionals", desc: "Agents, investors, wholesalers — every deal starts with a relationship. Track your pipeline, manage your referrals, and grow your network on the grid." },
    { icon: ShoppingBag, title: "1099 Entrepreneurs", desc: "Whatever you sell, whatever you do — if your income depends on relationships, GridWorker OS is your operating system." },
  ];
  return (
    <section id="whos-it-for" className="py-24 bg-background">
      <div className="container">
        <AnimSection>
          <div className="text-center mb-16">
            <SectionLabel text="Who It's For" />
            <motion.h2 variants={fadeUp} className="font-display text-5xl md:text-6xl text-white">IF YOU BUILD<br /><span className="text-gold-gradient">RELATIONSHIPS,</span><br />YOU'RE A GRID WORKER.</motion.h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {personas.map(p => (
              <motion.div key={p.title} variants={fadeUp}
                className="p-6 rounded-xl bg-[oklch(0.15_0.009_265)] border border-white/7 hover:border-[oklch(0.78_0.12_75/25%)] transition-all group">
                <div className="w-10 h-10 rounded-lg bg-[oklch(0.78_0.12_75/10%)] flex items-center justify-center mb-4 group-hover:bg-[oklch(0.78_0.12_75/18%)] transition-colors">
                  <p.icon className="w-5 h-5 text-[oklch(0.78_0.12_75)]" />
                </div>
                <h3 className="font-semibold text-white mb-2">{p.title}</h3>
                <p className="text-sm text-[oklch(0.55_0.01_265)] leading-relaxed">{p.desc}</p>
              </motion.div>
            ))}
          </div>
        </AnimSection>
      </div>
    </section>
  );
}

// ─── Pricing ────────────────────────────────────────────────
function Pricing() {
  const tiers = [
    {
      name: "GRID OBSERVER",
      label: "Free Forever",
      color: "border-white/15",
      labelColor: "text-white/50",
      accentColor: "oklch(0.55 0.01 265)",
      badge: null,
      tierBadge: null,
      features: [
        "Carrier Profile + QR Code",
        "Basic CRM — Track Your Connections",
        "Community Access",
        "Grid Worker Movement Content",
        "Referral income unlocks on upgrade",
      ],
      locked: ["Referral Commissions", "Marketplace Listings", "Passive Income"],
      cta: "Join Free — No Card Needed",
      ctaStyle: "border border-white/20 text-white hover:bg-white/5",
    },
    {
      name: "GRID WORKER",
      label: "TIER 1 EARNER",
      color: "border-[oklch(0.65_0.18_250/40%)]",
      labelColor: "text-[oklch(0.65_0.18_250)]",
      accentColor: "oklch(0.65 0.18 250)",
      badge: null,
      tierBadge: "TIER 1 EARNER",
      features: [
        "Full CRM + Pipeline Stages",
        "9% Commission on Direct Referrals",
        "QR Code + Digital Business Card",
        "Marketplace Access",
        "Referral Income Dashboard",
      ],
      locked: ["Tier 2 & 3 Passive Income"],
      cta: "Apply for Beta",
      ctaStyle: "border border-[oklch(0.65_0.18_250/50%)] text-[oklch(0.65_0.18_250)] hover:bg-[oklch(0.65_0.18_250/10%)]",
    },
    {
      name: "GRID BUILDER",
      label: "TIER 1 + 2 EARNER",
      color: "border-[oklch(0.78_0.12_75/50%)]",
      labelColor: "text-[oklch(0.78_0.12_75)]",
      accentColor: "oklch(0.78 0.12 75)",
      badge: "MOST POPULAR",
      tierBadge: "TIER 1 + 2 EARNER",
      features: [
        "Everything in Grid Worker",
        "9% Tier 1 + 6% Tier 2 Passive Income",
        "Automated SMS & Email Follow-Ups",
        "Digital Contracts (on-platform)",
        "3% Gratitude Fund Participation",
      ],
      locked: ["Tier 3 Deep Passive Income"],
      cta: "Apply for Beta",
      ctaStyle: "btn-gold glow-pulse",
    },
    {
      name: "GRID LEADER",
      label: "FULL 3-6-9 EARNER",
      color: "border-[oklch(0.78_0.12_75/35%)]",
      labelColor: "text-[oklch(0.78_0.12_75)]",
      accentColor: "oklch(0.78 0.12 75)",
      badge: null,
      tierBadge: "FULL 3-6-9 EARNER",
      features: [
        "Everything in Grid Builder",
        "9% + 6% + 3% — Full 3-6-9 Passive Income",
        "Team & Employer Profile Linking",
        "CRM API Export (HubSpot, Salesforce, Custom)",
        "Priority Access to Ethan",
      ],
      locked: [],
      cta: "Apply for Beta",
      ctaStyle: "border border-[oklch(0.78_0.12_75/50%)] text-[oklch(0.78_0.12_75)] hover:bg-[oklch(0.78_0.12_75/10%)]",
    },
  ];

  return (
    <section id="pricing" className="py-24 bg-surface">
      <div className="container">
        <AnimSection>
          <div className="text-center mb-12">
            <SectionLabel text="Beta Access" />
            <motion.h2 variants={fadeUp} className="font-display text-5xl md:text-6xl text-white mb-4">
              GET IN<br /><span className="text-gold-gradient">FREE.</span>
            </motion.h2>
            <motion.p variants={fadeUp} className="text-[oklch(0.60_0.01_265)] max-w-xl mx-auto">
              Start free. Build your grid. Every connection you make is tracked, rewarded, and owned by you. Founding beta members get early access — no credit card required.
            </motion.p>
          </div>

          {/* Tier cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {tiers.map(t => (
              <motion.div key={t.name} variants={fadeUp}
                className={`rounded-xl p-5 flex flex-col bg-[oklch(0.15_0.009_265)] border ${t.color} relative`}
                style={t.badge === "MOST POPULAR" ? { boxShadow: "0 0 30px oklch(0.78 0.12 75 / 12%)" } : {}}>
                {t.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="font-mono-brand text-[9px] px-2.5 py-1 rounded-full tracking-widest uppercase font-bold whitespace-nowrap bg-[oklch(0.78_0.12_75)] text-[oklch(0.10_0.008_265)]">{t.badge}</span>
                  </div>
                )}
                <div className="mb-3 pt-2">
                  <p className={`font-mono-brand text-[10px] tracking-widest mb-1 ${t.labelColor}`}>{t.name}</p>
                  {t.tierBadge && (
                    <span className="inline-block font-mono-brand text-[8px] px-1.5 py-0.5 rounded tracking-widest uppercase mb-2"
                      style={{ background: `${t.accentColor.replace(')', ' / 12%)')}`, color: t.accentColor, border: `1px solid ${t.accentColor.replace(')', ' / 25%)')}` }}>
                      {t.tierBadge}
                    </span>
                  )}
                  <div className="flex items-end gap-1">
                    <span className={`font-mono-brand text-xs px-2 py-1 rounded tracking-widest ${
                      t.label === 'Free Forever'
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                        : 'bg-[oklch(0.78_0.12_75/10%)] text-[oklch(0.78_0.12_75)] border border-[oklch(0.78_0.12_75/25%)]'
                    }`}>{t.label === 'Free Forever' ? '✓ FREE FOREVER' : `⚡ ${t.label}`}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2 mb-3 flex-1">
                  {t.features.map(f => (
                    <div key={f} className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                      <span className="text-xs text-[oklch(0.65_0.01_265)] leading-relaxed">{f}</span>
                    </div>
                  ))}
                  {t.locked.map(f => (
                    <div key={f} className="flex items-start gap-2 opacity-40">
                      <Lock className="w-3.5 h-3.5 text-white/40 mt-0.5 shrink-0" />
                      <span className="text-xs text-[oklch(0.45_0.01_265)] leading-relaxed line-through">{f}</span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => document.getElementById("beta-cta")?.scrollIntoView({ behavior: "smooth" })}
                  className={`w-full py-2.5 rounded-md text-xs font-semibold tracking-wide transition-all ${t.ctaStyle}`}>
                  {t.cta}
                </button>
              </motion.div>
            ))}
          </div>

          {/* B2B Consulting — By Referral Only */}
          <motion.div variants={fadeUp} className="rounded-xl p-6 md:p-8 bg-[oklch(0.12_0.008_265)] border border-white/10 relative overflow-hidden">
            <div className="absolute inset-0 opacity-5" style={{ background: "radial-gradient(ellipse at 80% 50%, oklch(0.78 0.12 75), transparent 60%)" }} />
            <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <span className="font-mono-brand text-[9px] px-2.5 py-1 rounded-full tracking-widest uppercase font-bold bg-white/8 text-white/60 border border-white/15">HIGH TICKET</span>
                  <span className="font-mono-brand text-[9px] px-2.5 py-1 rounded-full tracking-widest uppercase font-bold border" style={{ background: "oklch(0.78 0.12 75 / 10%)", color: "oklch(0.78 0.12 75)", borderColor: "oklch(0.78 0.12 75 / 25%)" }}>BY REFERRAL ONLY</span>
                </div>
                <h3 className="font-display text-2xl md:text-3xl text-white mb-2">WORK WITH ETHAN<span className="text-gold-gradient"> DIRECTLY.</span></h3>
                <p className="text-sm text-[oklch(0.58_0.01_265)] leading-relaxed max-w-2xl">
                  24/7 AI integration, hybrid consulting, and full business growth strategy — Ethan and his team come into your business personally. One flat retainer. Every problem, every project, every system. Brand, operations, sales, AI automation — all of it. This is not a subscription. It is a partnership.
                </p>
                <div className="flex items-center gap-3 mt-3 mb-1">
                  <span className="font-mono-brand text-[8px] px-2 py-0.5 rounded-full tracking-widest uppercase border" style={{ background: "oklch(0.78 0.12 75 / 10%)", color: "oklch(0.78 0.12 75)", borderColor: "oklch(0.78 0.12 75 / 25%)" }}>BY REFERRAL ONLY</span>
                </div>
                <div className="flex flex-wrap gap-4 mt-3">
                  {["AI Business Integration", "Hybrid D2D Strategy", "Growth & Margin Optimization", "Team Systems & CRM Setup"].map(item => (
                    <div key={item} className="flex items-center gap-1.5">
                      <Zap className="w-3 h-3 text-[oklch(0.78_0.12_75)]" />
                      <span className="text-xs text-[oklch(0.65_0.01_265)]">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="shrink-0">
                <button
                  onClick={() => document.getElementById("beta-cta")?.scrollIntoView({ behavior: "smooth" })}
                  className="px-8 py-3.5 rounded-lg text-sm font-semibold tracking-wide border border-white/25 text-white hover:bg-white/5 transition-all whitespace-nowrap">
                  Get Introduced →
                </button>
              </div>
            </div>
          </motion.div>

          {/* Platform fee note */}
          <motion.p variants={fadeUp} className="text-center text-xs text-[oklch(0.40_0.01_265)] mt-8">
            3% platform fee on all transactions · Powered by XRP + Stripe · All payouts governed by digital smart contracts<br />
            <span className="text-[oklch(0.78_0.12_75)/70%]">Beta founding members lock in early access forever — no credit card required to reserve your spot.</span>
          </motion.p>
        </AnimSection>
      </div>
    </section>
  );
}

// ─── Flywheel ───────────────────────────────────────────────
function Flywheel() {
  return (
    <section className="py-24 bg-[oklch(0.11_0.008_265)] relative overflow-hidden">
      <div className="container">
        <AnimSection>
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div variants={fadeIn} className="relative order-2 md:order-1">
              <div className="absolute -inset-6 rounded-3xl opacity-15"
                style={{ background: "radial-gradient(circle, oklch(0.78 0.12 75 / 0.5), transparent 70%)" }} />
              <img src={FLYWHEEL_DIAGRAM} alt="GridWorker OS Flywheel"
                className="w-full rounded-xl shadow-2xl relative z-10 border border-white/8" />
            </motion.div>
            <div className="order-1 md:order-2">
              <SectionLabel text="The Operating System" />
              <motion.h2 variants={fadeUp} className="font-display text-5xl md:text-6xl text-white leading-none mb-6">
                THE GRIDWORKER<br /><span className="text-gold-gradient">FLYWHEEL.</span>
              </motion.h2>
              <motion.p variants={fadeUp} className="text-[oklch(0.65_0.01_265)] leading-relaxed mb-8">
                GridWorker OS is not just a referral app. It is the operating system for how you run your relationships. Communicate to build trust. Collaborate to create value. Connect to generate income. The flywheel spins — and every rotation compounds.
              </motion.p>
              <motion.div variants={stagger} className="grid grid-cols-3 gap-4">
                {[
                  { label: "COMMUNICATE", desc: "Build trust through consistent, meaningful outreach." },
                  { label: "COLLABORATE", desc: "Work together across industries and networks." },
                  { label: "CONNECT", desc: "Every connection tracked, rewarded, and compounded." },
                ].map(item => (
                  <motion.div key={item.label} variants={fadeUp}
                    className="p-4 rounded-lg bg-[oklch(0.78_0.12_75/8%)] border border-[oklch(0.78_0.12_75/20%)] text-center">
                    <p className="font-mono-brand text-[10px] text-[oklch(0.78_0.12_75)] tracking-widest mb-2">{item.label}</p>
                    <p className="text-xs text-[oklch(0.55_0.01_265)] leading-relaxed">{item.desc}</p>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </div>
        </AnimSection>
      </div>
    </section>
  );
}

// ─── Commission Breakdown ──────────────────────────────────
function CommissionBreakdown() {
  return (
    <section id="earn" className="py-24 bg-[oklch(0.11_0.008_265)] relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 80% 50% at 50% 100%, oklch(0.78 0.12 75 / 0.06), transparent)" }} />
      <div className="container relative z-10">
        <AnimSection>
          {/* Header */}
          <div className="text-center mb-16">
            <SectionLabel text="Referral Income" />
            <motion.h2 variants={fadeUp} className="font-display text-5xl md:text-6xl text-white mb-4">
              GET PAID TO<br /><span className="text-gold-gradient">CONNECT.</span>
            </motion.h2>
            <motion.p variants={fadeUp} className="text-[oklch(0.60_0.01_265)] max-w-xl mx-auto">
              Every connection you bring into the grid has value. GridWorker OS runs the 3-6-9 referral system — three tiers deep, compounding automatically. The more you connect, the more you earn.
            </motion.p>
          </div>

          {/* Payout Diagram Visual */}
          <motion.div variants={fadeIn} className="mb-14 rounded-2xl overflow-hidden border border-white/8 shadow-2xl">
            <img src={PAYOUT_DIAGRAM} alt="The 3-6-9 Payout Structure" className="w-full" />
          </motion.div>

          {/* Three-Tier Flow Diagram */}
          <motion.div variants={fadeUp} className="mb-14">
            <div className="relative max-w-4xl mx-auto">
              {/* Connecting lines */}
              <div className="hidden md:block absolute top-[52px] left-[16.5%] right-[16.5%] h-px"
                style={{ background: "linear-gradient(90deg, transparent, oklch(0.78 0.12 75 / 0.5) 20%, oklch(0.78 0.12 75 / 0.5) 80%, transparent)" }} />
              <div className="hidden md:block absolute top-[52px] left-[50%] w-px h-20"
                style={{ background: "linear-gradient(180deg, oklch(0.78 0.12 75 / 0.5), transparent)" }} />

              <div className="grid md:grid-cols-3 gap-6 items-start">
                {/* YOU — Origin Node */}
                <div className="flex flex-col items-center text-center">
                  <div className="relative mb-4">
                    <div className="w-24 h-24 rounded-full flex items-center justify-center"
                      style={{ background: "radial-gradient(circle, oklch(0.78 0.12 75 / 0.25), oklch(0.78 0.12 75 / 0.05))", border: "2px solid oklch(0.78 0.12 75 / 60%)", boxShadow: "0 0 30px oklch(0.78 0.12 75 / 25%)" }}>
                      <Zap className="w-10 h-10 text-[oklch(0.78_0.12_75)]" />
                    </div>
                    <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-[oklch(0.78_0.12_75)] flex items-center justify-center">
                      <span className="text-[8px] font-bold text-[oklch(0.10_0.008_265)]">⚡</span>
                    </div>
                  </div>
                  <div className="px-4 py-2 rounded-full mb-3" style={{ background: "oklch(0.78 0.12 75 / 12%)", border: "1px solid oklch(0.78 0.12 75 / 30%)" }}>
                    <span className="font-mono-brand text-xs text-[oklch(0.78_0.12_75)] tracking-widest uppercase">YOU — Origin Node</span>
                  </div>
                  <p className="text-sm text-[oklch(0.65_0.01_265)] leading-relaxed">
                    You make the connection in the field. You scan them in, share your link, or bring them into the ecosystem any way you connect.
                  </p>
                  <div className="mt-4 p-3 rounded-xl w-full" style={{ background: "oklch(0.78 0.12 75 / 8%)", border: "1px solid oklch(0.78 0.12 75 / 20%)" }}>
                    <p className="font-mono-brand text-[10px] text-[oklch(0.78_0.12_75)] tracking-widest uppercase mb-1">Tier 1 Earn</p>
                    <p className="font-display text-3xl text-white">9%</p>
                    <p className="text-xs text-[oklch(0.55_0.01_265)] mt-1">of every transaction your direct referral generates on the platform</p>
                  </div>
                </div>

                {/* Direct Connection — Tier 1 */}
                <div className="flex flex-col items-center text-center">
                  <div className="relative mb-4">
                    <div className="w-20 h-20 rounded-full flex items-center justify-center"
                      style={{ background: "radial-gradient(circle, oklch(0.65 0.18 250 / 0.2), oklch(0.65 0.18 250 / 0.04))", border: "2px solid oklch(0.65 0.18 250 / 50%)" }}>
                      <Users className="w-8 h-8 text-[oklch(0.65_0.18_250)]" />
                    </div>
                  </div>
                  <div className="px-4 py-2 rounded-full mb-3" style={{ background: "oklch(0.65 0.18 250 / 10%)", border: "1px solid oklch(0.65 0.18 250 / 25%)" }}>
                    <span className="font-mono-brand text-xs text-[oklch(0.65_0.18_250)] tracking-widest uppercase">Direct Connection</span>
                  </div>
                  <p className="text-sm text-[oklch(0.65_0.01_265)] leading-relaxed">
                    The person you brought in. They get their own Carrier Profile, their own QR code, and start building their own grid.
                  </p>
                  <div className="mt-4 p-3 rounded-xl w-full" style={{ background: "oklch(0.65 0.18 250 / 8%)", border: "1px solid oklch(0.65 0.18 250 / 20%)" }}>
                    <p className="font-mono-brand text-[10px] text-[oklch(0.65_0.18_250)] tracking-widest uppercase mb-1">Tier 2 Earn</p>
                    <p className="font-display text-3xl text-white">6%</p>
                    <p className="text-xs text-[oklch(0.55_0.01_265)] mt-1">of every transaction their connections generate — you earn passively from their grid</p>
                  </div>
                </div>

                {/* Their Network — Tier 2 */}
                <div className="flex flex-col items-center text-center">
                  <div className="relative mb-4">
                    <div className="w-20 h-20 rounded-full flex items-center justify-center"
                      style={{ background: "radial-gradient(circle, oklch(0.72 0.15 145 / 0.18), oklch(0.72 0.15 145 / 0.04))", border: "2px solid oklch(0.72 0.15 145 / 40%)" }}>
                      <GitBranch className="w-8 h-8 text-[oklch(0.72_0.15_145)]" />
                    </div>
                  </div>
                  <div className="px-4 py-2 rounded-full mb-3" style={{ background: "oklch(0.72 0.15 145 / 10%)", border: "1px solid oklch(0.72 0.15 145 / 25%)" }}>
                    <span className="font-mono-brand text-xs text-[oklch(0.72_0.15_145)] tracking-widest uppercase">Their Network</span>
                  </div>
                  <p className="text-sm text-[oklch(0.65_0.01_265)] leading-relaxed">
                    Everyone your connection brings in. You never have to touch them — your grid earns for you automatically because you built the chain.
                  </p>
                  <div className="mt-4 p-3 rounded-xl w-full" style={{ background: "oklch(0.72 0.15 145 / 8%)", border: "1px solid oklch(0.72 0.15 145 / 20%)" }}>
                    <p className="font-mono-brand text-[10px] text-[oklch(0.72_0.15_145)] tracking-widest uppercase mb-1">Passive Growth</p>
                    <p className="font-display text-3xl text-white">∞</p>
                    <p className="text-xs text-[oklch(0.55_0.01_265)] mt-1">your grid compounds — every node they add strengthens your network and your income</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Transaction Flow + Gratitude Fund */}
          <motion.div variants={fadeUp} className="mb-10">
            <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid oklch(0.78 0.12 75 / 20%)" }}>
              <div className="bg-[oklch(0.78_0.12_75/8%)] px-6 py-4 border-b border-white/8">
                <p className="font-mono-brand text-xs text-[oklch(0.78_0.12_75)] tracking-widest uppercase">How Every Transaction Flows</p>
              </div>
              <div className="bg-[oklch(0.14_0.009_265)] p-6">
                <div className="flex flex-col md:flex-row items-stretch gap-0">
                  {[
                    { icon: DollarSign, label: "Transaction", desc: "Service or referral closes on the platform", color: "oklch(0.78 0.12 75)", pct: "100%" },
                    { icon: Zap, label: "Tier 1 Referrer", desc: "Direct connector earns", color: "oklch(0.78 0.12 75)", pct: "9%" },
                    { icon: GitBranch, label: "Tier 2 Referrer", desc: "Their upline earns passively", color: "oklch(0.65 0.18 250)", pct: "6%" },
                    { icon: Users, label: "Tier 3 Referrer", desc: "Three levels deep, passive", color: "oklch(0.72 0.15 145)", pct: "3%" },
                    { icon: Shield, label: "Gratitude Fund", desc: "Community & Grid Worker Movement", color: "oklch(0.55 0.18 30)", pct: "3%" },
                    { icon: LayoutGrid, label: "Platform", desc: "GridWorker OS operations", color: "oklch(0.55 0.01 265)", pct: "Remainder" },
                  ].map((item, i) => (
                    <div key={item.label} className="flex md:flex-col items-center md:items-start gap-3 md:gap-2 flex-1 p-4 relative">
                      {i < 4 && (
                        <div className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-6 h-6 rounded-full items-center justify-center bg-[oklch(0.14_0.009_265)] border border-white/10">
                          <ChevronRight className="w-3 h-3 text-[oklch(0.50_0.01_265)]" />
                        </div>
                      )}
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${item.color.replace(')', ' / 12%)')}`, border: `1px solid ${item.color.replace(')', ' / 25%)')}` }}>
                        <item.icon className="w-4 h-4" style={{ color: item.color }} />
                      </div>
                      <div className="flex-1 md:flex-none">
                        <p className="font-display text-xl md:text-2xl text-white">{item.pct}</p>
                        <p className="font-semibold text-xs text-white/80 mt-0.5">{item.label}</p>
                        <p className="text-xs text-[oklch(0.50_0.01_265)] mt-0.5 leading-snug">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Payment Rails + Certification */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Payment Rails */}
            <motion.div variants={fadeUp} className="rounded-2xl p-6 bg-[oklch(0.14_0.009_265)]" style={{ border: "1px solid oklch(0.65 0.18 250 / 25%)" }}>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-lg bg-[oklch(0.65_0.18_250/12%)] flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-[oklch(0.65_0.18_250)]" />
                </div>
                <div>
                  <p className="font-semibold text-white text-sm">Payment Rails</p>
                  <p className="text-xs text-[oklch(0.50_0.01_265)]">How money moves on the grid</p>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                {[
                  { icon: Bitcoin, label: "XRP (Primary)", desc: "Instant, low-fee settlement. The preferred rail for all grid transactions.", badge: "PREFERRED", badgeColor: "oklch(0.78 0.12 75)" },
                  { icon: Bitcoin, label: "Bitcoin / Crypto", desc: "Full crypto support for grid workers who operate in digital assets.", badge: "SUPPORTED", badgeColor: "oklch(0.65 0.18 250)" },
                  { icon: CreditCard, label: "Stripe / Card", desc: "Traditional card payments for homeowners and non-crypto users.", badge: "AVAILABLE", badgeColor: "oklch(0.72 0.15 145)" },
                  { icon: DollarSign, label: "Zelle / Cash App", desc: "Phase 2 integration for familiar peer-to-peer payment flows.", badge: "PHASE 2", badgeColor: "oklch(0.55 0.01 265)" },
                ].map(p => (
                  <div key={p.label} className="flex items-start gap-3 p-3 rounded-lg bg-white/3 border border-white/6">
                    <p.icon className="w-4 h-4 mt-0.5 shrink-0" style={{ color: p.badgeColor }} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-semibold text-white">{p.label}</span>
                        <span className="font-mono-brand text-[8px] px-1.5 py-0.5 rounded-full" style={{ background: `${p.badgeColor.replace(')', ' / 12%)')}`, color: p.badgeColor, border: `1px solid ${p.badgeColor.replace(')', ' / 25%)')}` }}>{p.badge}</span>
                      </div>
                      <p className="text-xs text-[oklch(0.50_0.01_265)] leading-snug">{p.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* GridWorker Certified */}
            <motion.div variants={fadeUp} className="rounded-2xl p-6 bg-[oklch(0.14_0.009_265)]" style={{ border: "1px solid oklch(0.78 0.12 75 / 30%)", boxShadow: "0 0 30px oklch(0.78 0.12 75 / 6%)" }}>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-lg bg-[oklch(0.78_0.12_75/12%)] flex items-center justify-center">
                  <Award className="w-5 h-5 text-[oklch(0.78_0.12_75)]" />
                </div>
                <div>
                  <p className="font-semibold text-white text-sm">GridWorker Certified ⚡</p>
                  <p className="text-xs text-[oklch(0.50_0.01_265)]">The top-tier badge on the platform</p>
                </div>
              </div>
              <p className="text-sm text-[oklch(0.62_0.01_265)] leading-relaxed mb-5">
                GridWorker Certified members carry the <span className="text-[oklch(0.78_0.12_75)] font-semibold">⚡ lightning bolt</span> next to their name — the trust signal that tells homeowners and partners this person has been verified, trained, and operates at the highest standard of the Grid Worker Movement.
              </p>
              <div className="flex flex-col gap-3">
                {[
                  { check: true, label: "Verified identity and profile" },
                  { check: true, label: "Active Pro subscriber" },
                  { check: true, label: "Completed Grid Worker onboarding" },
                  { check: true, label: "Digital contract agreement signed" },
                  { check: true, label: "⚡ badge visible on all listings and referrals" },
                  { check: true, label: "Priority placement in the Marketplace" },
                  { check: false, label: "Available on Free tier" },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-2.5">
                    {item.check
                      ? <Check className="w-4 h-4 text-[oklch(0.78_0.12_75)] shrink-0" />
                      : <Lock className="w-4 h-4 text-[oklch(0.40_0.01_265)] shrink-0" />}
                    <span className={`text-sm ${item.check ? "text-[oklch(0.72_0.01_265)]" : "text-[oklch(0.40_0.01_265)] line-through"}`}>{item.label}</span>
                  </div>
                ))}
              </div>
              <div className="mt-5 p-3 rounded-xl text-center" style={{ background: "oklch(0.78 0.12 75 / 8%)", border: "1px solid oklch(0.78 0.12 75 / 20%)" }}>
                <p className="text-xs text-[oklch(0.60_0.01_265)]">Certification available at launch for all Pro beta members.</p>
              </div>
            </motion.div>
          </div>

          {/* Disclaimer */}
          <motion.p variants={fadeUp} className="text-center text-xs text-[oklch(0.38_0.01_265)] mt-8 font-mono-brand">
            3-6-9 Commission Structure: 9% Tier 1 | 6% Tier 2 | 3% Tier 3 | 3% Gratitude Fund. Free tier earns a 3% split with their referrer. All payouts governed by digital smart contracts on XRP + Stripe.
          </motion.p>
        </AnimSection>
      </div>
    </section>
  );
}

// ─── Visual Gallery ─────────────────────────────────────────
function VisualGallery() {
  const visuals = [
    { src: WATER_DROPLET, title: "One Drop. Infinite Ripples.", desc: "One person creates an infinite network." },
    { src: WATER_INTERNAL, title: "Your Internal Grid Is Alive.", desc: "You are bio-electric. Get your grid right." },
    { src: NETWORK_EXPLOSION, title: "It All Starts With One.", desc: "One stable node changes the whole grid." },
  ];
  return (
    <section className="py-24 bg-[oklch(0.13_0.009_265)]">
      <div className="container">
        <AnimSection>
          <div className="text-center mb-14">
            <SectionLabel text="The Vision" />
            <motion.h2 variants={fadeUp} className="font-display text-5xl md:text-6xl text-white">THE GRID<br /><span className="text-gold-gradient">IN MOTION.</span></motion.h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-6">
            {visuals.map(v => (
              <motion.div key={v.title} variants={fadeUp} className="group relative overflow-hidden rounded-xl border border-white/8 hover:border-[oklch(0.78_0.12_75/35%)] transition-all">
                <img src={v.src} alt={v.title} className="w-full aspect-[4/5] object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-[oklch(0.10_0.008_265/0.9)] via-transparent to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <p className="font-display text-lg text-white leading-tight mb-1">{v.title}</p>
                  <p className="text-xs text-[oklch(0.60_0.01_265)]">{v.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </AnimSection>
      </div>
    </section>
  );
}

// ─── Beta CTA ───────────────────────────────────────────────
function BetaCTA() {
  const refParam = new URLSearchParams(window.location.search).get("ref");
  const [form, setForm] = useState({ name: "", email: "", phone: "", industry: "", referral: refParam ?? "" });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const industries = [
    "Roofing", "HVAC", "Plumbing", "Electrical", "Solar",
    "D2D Sales", "Real Estate", "Health & Wellness", "Homeowner",
    "1099 Entrepreneur", "Natural/Home Goods", "Other"
  ];

  const submitMutation = trpc.beta.submit.useMutation({
    onSuccess: () => {
      setLoading(false);
      setSubmitted(true);
      toast.success("You're on the grid! Ethan will be in touch shortly.");
    },
    onError: (err) => {
      setLoading(false);
      console.error("[GridWorker] BetaCTA submit error:", err);
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
      });
    } catch (err) {
      console.error("[GridWorker] BetaCTA submit failed:", err);
    }
  };

  return (
    <section id="beta-cta" className="py-24 relative overflow-hidden bg-[oklch(0.11_0.008_265)]">
      <div className="absolute inset-0 opacity-8"
        style={{ backgroundImage: "radial-gradient(ellipse at 50% 100%, oklch(0.78 0.12 75 / 0.3), transparent 60%)" }} />
      <div className="container relative z-10">
        <AnimSection>
          <div className="max-w-2xl mx-auto">
            <motion.div variants={fadeUp} className="text-center mb-10">
              <SectionLabel text="Limited Beta Access" />
              <h2 className="font-display text-5xl md:text-6xl text-white mb-4">CLAIM YOUR NODE</h2>
              <p className="text-[oklch(0.60_0.01_265)]">50 beta spots. First come, first in. Founding members lock in the lowest pricing and shape the platform from day one. Ethan personally reaches out to every beta tester.</p>
            </motion.div>
            {!submitted ? (
              <motion.form variants={fadeUp} onSubmit={handleSubmit}
                className="rounded-2xl p-8 flex flex-col gap-4 bg-[oklch(0.15_0.009_265)]"
                style={{ border: "1px solid oklch(0.78 0.12 75 / 25%)", boxShadow: "0 0 60px oklch(0.78 0.12 75 / 6%)" }}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { key: "name", label: "Full Name *", placeholder: "Your Name", type: "text" },
                    { key: "phone", label: "Phone *", placeholder: "(404) 000-0000", type: "tel" },
                  ].map(f => (
                    <div key={f.key} className="flex flex-col gap-1.5">
                      <label className="text-xs text-[oklch(0.55_0.01_265)] uppercase tracking-widest font-mono-brand">{f.label}</label>
                      <input value={form[f.key as keyof typeof form]}
                        onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                        placeholder={f.placeholder} type={f.type}
                        className="bg-[oklch(0.19_0.012_265)] border border-white/10 rounded-md px-4 py-2.5 text-white text-sm placeholder:text-[oklch(0.38_0.01_265)] focus:outline-none focus:border-[oklch(0.78_0.12_75/50%)] transition-colors" />
                    </div>
                  ))}
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-[oklch(0.55_0.01_265)] uppercase tracking-widest font-mono-brand">Email *</label>
                  <input value={form.email} onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="you@yourdomain.com" type="email"
                    className="bg-[oklch(0.19_0.012_265)] border border-white/10 rounded-md px-4 py-2.5 text-white text-sm placeholder:text-[oklch(0.38_0.01_265)] focus:outline-none focus:border-[oklch(0.78_0.12_75/50%)] transition-colors" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-[oklch(0.55_0.01_265)] uppercase tracking-widest font-mono-brand">Industry / Role *</label>
                    <select value={form.industry} onChange={e => setForm(prev => ({ ...prev, industry: e.target.value }))}
                      className="bg-[oklch(0.19_0.012_265)] border border-white/10 rounded-md px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[oklch(0.78_0.12_75/50%)] transition-colors">
                      <option value="" disabled>Select your industry...</option>
                      {industries.map(i => <option key={i} value={i}>{i}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-[oklch(0.55_0.01_265)] uppercase tracking-widest font-mono-brand">
                      {refParam ? `Referred by: ${refParam}` : "Referral Code (optional)"}
                    </label>
                    <input value={form.referral} onChange={e => setForm(prev => ({ ...prev, referral: e.target.value }))}
                      placeholder="Who sent you?"
                      readOnly={!!refParam}
                      className={`bg-[oklch(0.19_0.012_265)] border border-white/10 rounded-md px-4 py-2.5 text-white text-sm placeholder:text-[oklch(0.38_0.01_265)] focus:outline-none focus:border-[oklch(0.78_0.12_75/50%)] transition-colors ${refParam ? "opacity-70 cursor-not-allowed" : ""}`} />
                  </div>
                </div>
                <button type="submit"
                  className="btn-gold w-full py-3.5 rounded-md text-sm mt-2 flex items-center justify-center gap-2 glow-pulse">
                  Claim My Carrier Profile <ChevronRight className="w-4 h-4" />
                </button>
                <p className="text-xs text-center text-[oklch(0.42_0.01_265)]">
                  Free tier available — no credit card required. Ethan personally reaches out to every beta tester.
                </p>
              </motion.form>
            ) : (
              <motion.div variants={fadeUp}
                className="rounded-2xl p-12 text-center bg-[oklch(0.15_0.009_265)]"
                style={{ border: "1px solid oklch(0.78 0.12 75 / 35%)", boxShadow: "0 0 50px oklch(0.78 0.12 75 / 12%)" }}>
                <div className="w-16 h-16 rounded-full bg-[oklch(0.78_0.12_75/15%)] flex items-center justify-center mx-auto mb-5">
                  <Check className="w-8 h-8 text-[oklch(0.78_0.12_75)]" />
                </div>
                <h3 className="font-display text-4xl text-white mb-3">YOU'RE ON THE GRID</h3>
                <p className="text-[oklch(0.60_0.01_265)] text-sm max-w-sm mx-auto">Your Carrier Profile spot is reserved. Ethan will be in touch personally to get you fully set up. Welcome to the Grid Worker Movement.</p>
              </motion.div>
            )}
          </div>
        </AnimSection>
      </div>
    </section>
  );
}

// ─── Footer ─────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="border-t border-white/6 py-10 bg-[oklch(0.09_0.005_265)]">
      <div className="container">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-sm bg-gradient-to-br from-[oklch(0.78_0.12_75)] to-[oklch(0.62_0.18_250)] flex items-center justify-center">
              <LayoutGrid className="w-3.5 h-3.5 text-[oklch(0.10_0.008_265)]" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-display text-base text-white tracking-[0.2em]">GRIDWORKER <span className="text-[oklch(0.78_0.12_75)]">OS</span></span>
              <span className="font-mono-brand text-[8px] text-[oklch(0.40_0.01_265)] tracking-widest uppercase">by E3C Collective</span>
            </div>
          </div>
          <p className="text-xs text-[oklch(0.38_0.01_265)] text-center font-mono-brand">
            © 2026 E3C Collective · Ethan Dixon · Grid Worker Movement · 3-6-9
          </p>
          <div className="flex items-center gap-5">
            <a
              href="https://www.instagram.com/ethandixon"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-[oklch(0.42_0.01_265)] hover:text-[oklch(0.78_0.12_75)] transition-colors tracking-wide">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
              @ethandixon
            </a>
            {["Privacy", "Terms"].map(l => (
              <button key={l} onClick={() => toast.info("Coming soon.")}
                className="text-xs text-[oklch(0.42_0.01_265)] hover:text-[oklch(0.78_0.12_75)] transition-colors tracking-wide">
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

// ─── Page ───────────────────────────────────────────────────
export default function Home() {
  return (
    <div className="min-h-screen bg-[oklch(0.11_0.008_265)]">
      <Nav />
      <Hero />
      <GridDivider />
      <GridExpansion />
      <GridDivider />
      <HowItWorks />
      <GridDivider />
      <EcosystemMap />
      <GridDivider />
      <Features />
      <GridDivider />
      <WhoItsFor />
      <GridDivider />
      <Pricing />
      <GridDivider />
      <CommissionBreakdown />
      <GridDivider />
      <Flywheel />
      <GridDivider />
      <VisualGallery />
      <BetaCTA />

      <Footer />
    </div>
  );
}
