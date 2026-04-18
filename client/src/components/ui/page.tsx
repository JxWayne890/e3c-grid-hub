/**
 * Shared page-level UI primitives.
 * Dark luxury aesthetic — frosted surfaces, thin borders, gold accent on focus.
 */

import type { ReactNode } from "react";

// ---------------- PageHeader ----------------

export function PageHeader({
  eyebrow,
  eyebrowIcon: EyebrowIcon,
  title,
  subtitle,
  actions,
}: {
  eyebrow?: string;
  eyebrowIcon?: React.ElementType;
  title: string;
  subtitle?: string | ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-8 flex items-start justify-between gap-6 flex-wrap">
      <div className="min-w-0">
        {eyebrow && (
          <div className="flex items-center gap-1.5 mb-2">
            {EyebrowIcon && <EyebrowIcon className="w-3 h-3 text-primary" />}
            <span className="text-[10px] font-semibold text-primary uppercase tracking-[0.22em]">
              {eyebrow}
            </span>
          </div>
        )}
        <h1 className="font-display text-[28px] leading-tight text-foreground tracking-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-muted-foreground text-sm mt-1.5 max-w-2xl">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap shrink-0">{actions}</div>}
    </div>
  );
}

// ---------------- StatCard ----------------

export function StatCard({
  label,
  value,
  sub,
  subTone,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  subTone?: "green" | "red" | "neutral";
  icon?: React.ElementType;
  accent?: boolean;
}) {
  const subColor =
    subTone === "green" ? "text-[oklch(0.70_0.18_145)]"
    : subTone === "red" ? "text-[oklch(0.70_0.18_25)]"
    : "text-muted-foreground";

  return (
    <div className="group relative rounded-xl p-5 bg-surface/60 backdrop-blur-sm border border-white/5 overflow-hidden transition-all duration-300 hover:border-primary/20 hover:bg-surface">
      {/* subtle gold halo on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br from-primary/[0.04] via-transparent to-transparent pointer-events-none" />
      {/* top accent stripe */}
      {accent && (
        <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      )}

      <div className="relative flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.18em] mb-2">
            {label}
          </p>
          <p className="text-foreground text-[28px] font-display leading-none tracking-tight tabular-nums">
            {value}
          </p>
          {sub && <p className={`text-xs mt-2 ${subColor}`}>{sub}</p>}
        </div>
        {Icon && (
          <div className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-primary/10 border border-primary/20">
            <Icon className="w-4 h-4 text-primary" />
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------- Pill (unified status/tag chip) ----------------

export type PillTone =
  | "neutral" | "primary" | "success" | "warning" | "danger" | "info" | "muted";

const PILL_STYLES: Record<PillTone, { bg: string; text: string; border: string }> = {
  neutral: { bg: "oklch(0.20 0.005 265 / 60%)", text: "oklch(0.85 0 0)",      border: "oklch(0.30 0.01 265 / 40%)" },
  primary: { bg: "oklch(0.78 0.12 75 / 12%)",    text: "oklch(0.78 0.12 75)",  border: "oklch(0.78 0.12 75 / 28%)" },
  success: { bg: "oklch(0.55 0.15 145 / 12%)",   text: "oklch(0.70 0.18 145)", border: "oklch(0.55 0.15 145 / 28%)" },
  warning: { bg: "oklch(0.72 0.15 75 / 12%)",    text: "oklch(0.78 0.12 75)",  border: "oklch(0.72 0.15 75 / 28%)" },
  danger:  { bg: "oklch(0.55 0.15 25 / 12%)",    text: "oklch(0.72 0.18 25)",  border: "oklch(0.55 0.15 25 / 28%)" },
  info:    { bg: "oklch(0.62 0.18 250 / 12%)",   text: "oklch(0.70 0.18 250)", border: "oklch(0.62 0.18 250 / 28%)" },
  muted:   { bg: "transparent",                   text: "oklch(0.65 0.01 265)", border: "oklch(0.30 0.01 265 / 40%)" },
};

export function Pill({
  children,
  tone = "neutral",
  icon: Icon,
  className = "",
}: {
  children: ReactNode;
  tone?: PillTone;
  icon?: React.ElementType;
  className?: string;
}) {
  const s = PILL_STYLES[tone];
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border leading-none whitespace-nowrap ${className}`}
      style={{ background: s.bg, color: s.text, borderColor: s.border }}
    >
      {Icon && <Icon className="w-2.5 h-2.5" />}
      {children}
    </span>
  );
}

// ---------------- SegmentedControl ----------------

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: Array<{ value: T; label: string; icon?: React.ElementType }>;
}) {
  return (
    <div className="inline-flex items-center rounded-lg border border-white/10 bg-surface/60 p-0.5">
      {options.map((opt) => {
        const Icon = opt.icon;
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              active
                ? "bg-primary/15 text-primary shadow-[0_0_10px_oklch(0.78_0.12_75/15%)]"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {Icon && <Icon className="w-3.5 h-3.5" />}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ---------------- Button primitives ----------------

export function PrimaryButton({
  children,
  onClick,
  disabled,
  icon: Icon,
  type = "button",
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  icon?: React.ElementType;
  type?: "button" | "submit";
  className?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-[0_0_20px_oklch(0.78_0.12_75/30%)] ${className}`}
      style={{ background: "oklch(0.78 0.12 75)", color: "oklch(0.10 0.008 265)" }}
    >
      {Icon && <Icon className="w-3.5 h-3.5" />}
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  onClick,
  icon: Icon,
  active,
  className = "",
}: {
  children?: ReactNode;
  onClick?: () => void;
  icon?: React.ElementType;
  active?: boolean;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-all duration-200 ${
        active
          ? "border-primary/30 bg-primary/10 text-primary"
          : "border-white/10 text-muted-foreground hover:text-foreground hover:bg-white/5"
      } ${className}`}
    >
      {Icon && <Icon className="w-3.5 h-3.5" />}
      {children}
    </button>
  );
}

// ---------------- Card wrapper ----------------

export function Card({
  children,
  className = "",
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div
      className={`relative rounded-xl bg-surface/60 backdrop-blur-sm border border-white/5 overflow-hidden ${padded ? "p-5" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

// ---------------- Toolbar (filter bar for lists) ----------------

export function Toolbar({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl bg-surface/60 backdrop-blur-sm border border-white/5 p-3 mb-4 flex items-center gap-2 flex-wrap">
      {children}
    </div>
  );
}
