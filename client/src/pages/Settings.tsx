import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { CrmLayout, useCrmOrg } from "@/components/CrmLayout";
import { Building2, Users, Mail, Save, Trash2, UserCircle } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import type { Organization, OrgMember } from "@shared/types";

const inputClass = "w-full px-3 py-2.5 rounded-lg text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary bg-background border border-border";
const labelClass = "block text-muted-foreground text-xs uppercase tracking-widest mb-1.5";
const sectionClass = "rounded-xl p-6 bg-surface border border-border";

function OrgProfileSection({ org }: { org: Organization }) {
  const utils = trpc.useUtils();
  const [form, setForm] = useState({
    name: org.name || "",
    industry: org.industry || "",
    phone: org.phone || "",
    email: org.email || "",
    website: org.website || "",
    address: org.address || "",
    city: org.city || "",
    state: org.state || "",
    zip: org.zip || "",
    timezone: org.timezone || "America/Chicago",
  });

  const updateOrg = trpc.org.updateProfile.useMutation({
    onSuccess: () => utils.org.current.invalidate(),
  });

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <div className={sectionClass}>
      <div className="flex items-center gap-2 mb-5">
        <Building2 className="w-5 h-5 text-primary" />
        <h2 className="text-foreground font-semibold text-lg">Business Profile</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Business Name</label>
          <input className={inputClass} value={form.name} onChange={set("name")} placeholder="My Company" />
        </div>
        <div>
          <label className={labelClass}>Industry</label>
          <input className={inputClass} value={form.industry} onChange={set("industry")} placeholder="Cleaning Services" />
        </div>
        <div>
          <label className={labelClass}>Phone</label>
          <input className={inputClass} value={form.phone} onChange={set("phone")} placeholder="(555) 123-4567" />
        </div>
        <div>
          <label className={labelClass}>Email</label>
          <input className={inputClass} value={form.email} onChange={set("email")} placeholder="info@company.com" />
        </div>
        <div>
          <label className={labelClass}>Website</label>
          <input className={inputClass} value={form.website} onChange={set("website")} placeholder="https://company.com" />
        </div>
        <div>
          <label className={labelClass}>Timezone</label>
          <select className={inputClass} value={form.timezone} onChange={set("timezone")}>
            <option value="America/New_York">Eastern</option>
            <option value="America/Chicago">Central</option>
            <option value="America/Denver">Mountain</option>
            <option value="America/Los_Angeles">Pacific</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <label className={labelClass}>Address</label>
          <input className={inputClass} value={form.address} onChange={set("address")} placeholder="123 Main St" />
        </div>
        <div>
          <label className={labelClass}>City</label>
          <input className={inputClass} value={form.city} onChange={set("city")} placeholder="Houston" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>State</label>
            <input className={inputClass} value={form.state} onChange={set("state")} placeholder="TX" />
          </div>
          <div>
            <label className={labelClass}>Zip</label>
            <input className={inputClass} value={form.zip} onChange={set("zip")} placeholder="77001" />
          </div>
        </div>
      </div>

      <button
        onClick={() => updateOrg.mutate(form)}
        disabled={updateOrg.isPending}
        className="mt-5 flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50"
        style={{ background: "oklch(0.78 0.12 75)", color: "oklch(0.10 0.008 265)" }}>
        {updateOrg.isPending ? <div className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" /> : <Save className="w-4 h-4" />}
        Save Changes
      </button>
    </div>
  );
}

function EmailSettingsSection({ org }: { org: Organization }) {
  const utils = trpc.useUtils();
  const [form, setForm] = useState({
    emailFromName: org.email_from_name || "",
    emailReplyTo: org.email_reply_to || "",
    emailSignature: org.email_signature || "",
  });

  const updateOrg = trpc.org.updateProfile.useMutation({
    onSuccess: () => utils.org.current.invalidate(),
  });

  return (
    <div className={sectionClass}>
      <div className="flex items-center gap-2 mb-5">
        <Mail className="w-5 h-5 text-primary" />
        <h2 className="text-foreground font-semibold text-lg">Email Settings</h2>
      </div>

      <div className="flex flex-col gap-4">
        <div>
          <label className={labelClass}>From Name</label>
          <input className={inputClass} value={form.emailFromName} onChange={(e) => setForm((f) => ({ ...f, emailFromName: e.target.value }))}
            placeholder="My Company" />
          <p className="text-muted-foreground text-xs mt-1">Emails will be sent as "My Company {'<'}onboarding@resend.dev{'>'}"</p>
        </div>
        <div>
          <label className={labelClass}>Reply-To Email</label>
          <input className={inputClass} value={form.emailReplyTo} onChange={(e) => setForm((f) => ({ ...f, emailReplyTo: e.target.value }))}
            placeholder="info@company.com" />
          <p className="text-muted-foreground text-xs mt-1">When clients reply, it goes to this address</p>
        </div>
        <div>
          <label className={labelClass}>Email Signature</label>
          <textarea className={inputClass + " min-h-[80px] resize-y"} value={form.emailSignature} onChange={(e) => setForm((f) => ({ ...f, emailSignature: e.target.value }))}
            placeholder="Best regards,&#10;John Johnson&#10;Master Clean HQ&#10;(555) 123-4567" rows={4} />
        </div>
      </div>

      <button
        onClick={() => updateOrg.mutate(form)}
        disabled={updateOrg.isPending}
        className="mt-5 flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50"
        style={{ background: "oklch(0.78 0.12 75)", color: "oklch(0.10 0.008 265)" }}>
        {updateOrg.isPending ? <div className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" /> : <Save className="w-4 h-4" />}
        Save Email Settings
      </button>
    </div>
  );
}

function TeamSection({ members }: { members: OrgMember[] }) {
  const utils = trpc.useUtils();
  const updateMember = trpc.org.updateMember.useMutation({
    onSuccess: () => utils.org.members.invalidate(),
  });

  return (
    <div className={sectionClass}>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <h2 className="text-foreground font-semibold text-lg">Team Members</h2>
          <span className="px-1.5 py-0.5 rounded text-xs" style={{ background: "oklch(0.78 0.12 75 / 15%)", color: "oklch(0.78 0.12 75)" }}>
            {members.length}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {members.map((m) => (
          <MemberRow key={m.id} member={m} onUpdate={(data) => updateMember.mutate({ memberId: m.id, ...data })} />
        ))}
      </div>
    </div>
  );
}

function MemberRow({ member, onUpdate }: { member: OrgMember; onUpdate: (data: Record<string, string>) => void }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    firstName: member.first_name || "",
    lastName: member.last_name || "",
    phone: member.phone || "",
    title: member.title || "",
  });

  if (!editing) {
    const name = `${member.first_name || ""} ${member.last_name || ""}`.trim() || "(no name)";
    return (
      <div className="flex items-center justify-between p-4 rounded-lg border border-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold"
            style={{ background: "oklch(0.78 0.12 75)", color: "oklch(0.10 0.008 265)" }}>
            {(member.first_name || "?").charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-foreground text-sm font-medium">{name}</p>
            <p className="text-muted-foreground text-xs">
              {member.title || member.role} {member.phone ? `· ${member.phone}` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded text-xs capitalize" style={{ background: "oklch(0.78 0.12 75 / 15%)", color: "oklch(0.78 0.12 75)" }}>
            {member.role}
          </span>
          <button onClick={() => setEditing(true)} className="text-muted-foreground hover:text-foreground text-xs px-2 py-1 rounded border border-border">
            Edit
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-lg border border-primary/30">
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className={labelClass}>First Name</label>
          <input className={inputClass} value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} />
        </div>
        <div>
          <label className={labelClass}>Last Name</label>
          <input className={inputClass} value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} />
        </div>
        <div>
          <label className={labelClass}>Title</label>
          <input className={inputClass} value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Sales Rep" />
        </div>
        <div>
          <label className={labelClass}>Phone</label>
          <input className={inputClass} value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="(555) 123-4567" />
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={() => { onUpdate(form); setEditing(false); }}
          className="px-4 py-2 rounded-lg text-xs font-semibold"
          style={{ background: "oklch(0.78 0.12 75)", color: "oklch(0.10 0.008 265)" }}>
          Save
        </button>
        <button onClick={() => setEditing(false)} className="px-4 py-2 rounded-lg text-xs text-muted-foreground border border-border">
          Cancel
        </button>
      </div>
    </div>
  );
}

function YourProfileSection({ members }: { members: OrgMember[] }) {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const updateName = trpc.auth.updateName.useMutation();

  // Find the current user's member record
  const myMember = members.find((m) => m.user_id === user?.id);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    title: "",
  });
  const [initialized, setInitialized] = useState(false);

  // Initialize form when member data loads
  if (myMember && !initialized) {
    setForm({
      firstName: myMember.first_name || "",
      lastName: myMember.last_name || "",
      phone: myMember.phone || "",
      title: myMember.title || "",
    });
    setInitialized(true);
  }

  const updateMember = trpc.org.updateMember.useMutation({
    onSuccess: () => utils.org.members.invalidate(),
  });

  const handleSave = () => {
    if (!myMember) return;
    updateMember.mutate({ memberId: myMember.id, ...form });
    // Also update the Supabase auth name
    const fullName = `${form.firstName} ${form.lastName}`.trim();
    if (fullName) updateName.mutate({ fullName });
  };

  return (
    <div className={sectionClass}>
      <div className="flex items-center gap-2 mb-5">
        <UserCircle className="w-5 h-5 text-primary" />
        <h2 className="text-foreground font-semibold text-lg">Your Profile</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>First Name</label>
          <input className={inputClass} value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} placeholder="John" />
        </div>
        <div>
          <label className={labelClass}>Last Name</label>
          <input className={inputClass} value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} placeholder="Johnson" />
        </div>
        <div>
          <label className={labelClass}>Title / Role</label>
          <input className={inputClass} value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Owner, Sales Rep, etc." />
        </div>
        <div>
          <label className={labelClass}>Phone</label>
          <input className={inputClass} value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="(555) 123-4567" />
        </div>
      </div>
      <p className="text-muted-foreground text-xs mt-2">
        Email: {user?.email} (managed by your login account)
      </p>

      <button
        onClick={handleSave}
        disabled={updateMember.isPending}
        className="mt-4 flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50"
        style={{ background: "oklch(0.78 0.12 75)", color: "oklch(0.10 0.008 265)" }}>
        {updateMember.isPending ? <div className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" /> : <Save className="w-4 h-4" />}
        Save Profile
      </button>
    </div>
  );
}

function SettingsContent() {
  const orgQuery = useCrmOrg();
  const membersQuery = trpc.org.members.useQuery(undefined, { enabled: !!orgQuery.data });

  if (!orgQuery.data) return null;

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-4xl text-foreground mb-1">
          GRID <span className="text-primary">SETTINGS</span>
        </h1>
        <p className="text-muted-foreground text-sm">
          {orgQuery.data.name} — Organization Settings
        </p>
      </div>

      <div className="flex flex-col gap-6">
        <YourProfileSection members={(membersQuery.data ?? []) as OrgMember[]} />
        <OrgProfileSection org={orgQuery.data as Organization} />
        <EmailSettingsSection org={orgQuery.data as Organization} />
        <TeamSection members={(membersQuery.data ?? []) as OrgMember[]} />
      </div>
    </div>
  );
}

export default function Settings() {
  return (
    <CrmLayout>
      <SettingsContent />
    </CrmLayout>
  );
}
