import { useState } from "react";
import { X } from "lucide-react";
import type { Contact, ContactStage } from "@shared/types";

type ContactFormData = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  stage: ContactStage;
};

const STAGES: { value: ContactStage; label: string }[] = [
  { value: "lead", label: "Lead" },
  { value: "contacted", label: "Contacted" },
  { value: "qualified", label: "Qualified" },
  { value: "proposal", label: "Proposal" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
];

const initialForm: ContactFormData = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  company: "",
  address: "",
  city: "",
  state: "",
  zip: "",
  stage: "lead",
};

function contactToForm(contact: Contact): ContactFormData {
  return {
    firstName: contact.first_name,
    lastName: contact.last_name,
    email: contact.email,
    phone: contact.phone,
    company: contact.company,
    address: contact.address,
    city: contact.city,
    state: contact.state,
    zip: contact.zip,
    stage: contact.stage,
  };
}

const inputClass =
  "w-full px-3 py-2 rounded-lg text-sm text-white placeholder-[oklch(0.38_0.01_265)] outline-none focus:ring-1 focus:ring-[oklch(0.78_0.12_75/50%)]";
const inputStyle = { background: "oklch(0.12 0.008 265)", border: "1px solid oklch(0.25 0.009 265)" };
const labelClass = "block text-[oklch(0.55_0.01_265)] text-xs uppercase tracking-widest mb-1";

export function ContactForm({
  contact,
  onSubmit,
  onClose,
  loading,
}: {
  contact?: Contact;
  onSubmit: (data: ContactFormData) => void;
  onClose: () => void;
  loading?: boolean;
}) {
  const [form, setForm] = useState<ContactFormData>(
    contact ? contactToForm(contact) : initialForm
  );

  const isEdit = !!contact;

  const set = (field: keyof ContactFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div
        className="w-full max-w-lg rounded-xl p-6 max-h-[90vh] overflow-y-auto"
        style={{ background: "oklch(0.13 0.009 265)", border: "1px solid oklch(0.22 0.009 265)" }}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-white font-display text-lg tracking-wide">
            {isEdit ? "EDIT CONTACT" : "ADD CONTACT"}
          </h2>
          <button onClick={onClose} className="text-[oklch(0.45_0.01_265)] hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>First Name *</label>
              <input type="text" required value={form.firstName} onChange={set("firstName")}
                className={inputClass} style={inputStyle} placeholder="John" />
            </div>
            <div>
              <label className={labelClass}>Last Name</label>
              <input type="text" value={form.lastName} onChange={set("lastName")}
                className={inputClass} style={inputStyle} placeholder="Doe" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Email *</label>
              <input type="email" required value={form.email} onChange={set("email")}
                className={inputClass} style={inputStyle} placeholder="john@example.com" />
            </div>
            <div>
              <label className={labelClass}>Phone</label>
              <input type="tel" value={form.phone} onChange={set("phone")}
                className={inputClass} style={inputStyle} placeholder="(555) 123-4567" />
            </div>
          </div>

          <div>
            <label className={labelClass}>Company</label>
            <input type="text" value={form.company} onChange={set("company")}
              className={inputClass} style={inputStyle} placeholder="Acme Corp" />
          </div>

          <div>
            <label className={labelClass}>Address</label>
            <input type="text" value={form.address} onChange={set("address")}
              className={inputClass} style={inputStyle} placeholder="123 Main St" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelClass}>City</label>
              <input type="text" value={form.city} onChange={set("city")}
                className={inputClass} style={inputStyle} placeholder="Houston" />
            </div>
            <div>
              <label className={labelClass}>State</label>
              <input type="text" value={form.state} onChange={set("state")}
                className={inputClass} style={inputStyle} placeholder="TX" />
            </div>
            <div>
              <label className={labelClass}>Zip</label>
              <input type="text" value={form.zip} onChange={set("zip")}
                className={inputClass} style={inputStyle} placeholder="77001" />
            </div>
          </div>

          <div>
            <label className={labelClass}>Stage</label>
            <select value={form.stage} onChange={set("stage")}
              className={inputClass} style={inputStyle}>
              {STAGES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50"
            style={{ background: "oklch(0.78 0.12 75)", color: "oklch(0.10 0.008 265)" }}
          >
            {loading ? (
              <div className="w-4 h-4 mx-auto rounded-full border-2 border-current border-t-transparent animate-spin" />
            ) : isEdit ? "Save Changes" : "Add Contact"}
          </button>
        </form>
      </div>
    </div>
  );
}

export type { ContactFormData };
