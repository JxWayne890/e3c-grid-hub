import { useState } from "react";
import { motion } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { CrmLayout, useCrmOrg } from "@/components/CrmLayout";
import { Mail, Plus, Trash2, X, Loader2, FileText } from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.06 } },
};

function TemplateCard({
  template,
  onDelete,
}: {
  template: any;
  onDelete: () => void;
}) {
  const bodyPreview =
    template.body && template.body.length > 100
      ? template.body.slice(0, 100) + "..."
      : template.body || "";

  return (
    <motion.div
      variants={fadeUp}
      className="rounded-xl p-5 bg-surface border border-border group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-foreground font-semibold text-sm truncate">
            {template.name}
          </h3>
          <p className="text-xs text-muted-foreground mt-1 truncate">
            Subject: {template.subject}
          </p>
          {bodyPreview && (
            <p className="text-xs text-muted-foreground mt-2 line-clamp-2 opacity-70">
              {bodyPreview}
            </p>
          )}
        </div>

        <button
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-all"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}

function CreateTemplateForm({ onClose }: { onClose: () => void }) {
  const utils = trpc.useUtils();
  const createMutation = trpc.emailTemplates.create.useMutation({
    onSuccess: () => {
      utils.emailTemplates.list.invalidate();
      onClose();
    },
  });

  const [form, setForm] = useState({
    name: "",
    subject: "",
    body: "",
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.subject) return;

    createMutation.mutate({
      name: form.name,
      subject: form.subject,
      body: form.body || "",
    });
  }

  const inputClass =
    "w-full px-3 py-2.5 rounded-lg text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-[oklch(0.78_0.12_75/50%)] bg-background border border-border";
  const labelClass =
    "block text-muted-foreground text-xs uppercase tracking-widest mb-1.5";

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl p-6 bg-surface border border-border"
    >
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-foreground font-semibold">Create Template</h3>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-background transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelClass}>Name</label>
          <input
            className={inputClass}
            placeholder="Template name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </div>

        <div>
          <label className={labelClass}>Subject</label>
          <input
            className={inputClass}
            placeholder="Email subject line"
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
            required
          />
        </div>

        <div>
          <label className={labelClass}>Body</label>
          <textarea
            className={inputClass}
            rows={8}
            placeholder="Email body content"
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="px-5 py-2 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-50"
            style={{
              background: "oklch(0.78 0.12 75)",
              color: "oklch(0.10 0.008 265)",
            }}
          >
            {createMutation.isPending ? "Saving..." : "Save Template"}
          </button>
        </div>
      </form>
    </motion.div>
  );
}

export default function EmailTemplatesPage() {
  const [showForm, setShowForm] = useState(false);

  const templatesQuery = trpc.emailTemplates.list.useQuery();
  const utils = trpc.useUtils();

  const deleteMutation = trpc.emailTemplates.delete.useMutation({
    onSuccess: () => utils.emailTemplates.list.invalidate(),
  });

  const templates = templatesQuery.data ?? [];
  const isLoading = templatesQuery.isLoading;
  const isEmpty = templates.length === 0 && !isLoading;

  return (
    <CrmLayout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Mail className="w-6 h-6" style={{ color: "oklch(0.78 0.12 75)" }} />
              Email Templates
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage reusable email templates
            </p>
          </div>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90"
              style={{
                background: "oklch(0.78 0.12 75)",
                color: "oklch(0.10 0.008 265)",
              }}
            >
              <Plus className="w-4 h-4" />
              Create Template
            </button>
          )}
        </div>

        {/* Create Template Form */}
        {showForm && (
          <div className="mb-8">
            <CreateTemplateForm onClose={() => setShowForm(false)} />
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Empty State */}
        {isEmpty && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <FileText className="w-12 h-12 text-muted-foreground mb-4" />
            <h2 className="text-foreground font-semibold mb-1">
              No templates yet
            </h2>
            <p className="text-sm text-muted-foreground">
              Create your first email template to get started.
            </p>
          </div>
        )}

        {/* Templates List */}
        {!isLoading && !isEmpty && (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={stagger}
            className="space-y-3"
          >
            {templates.map((template: any) => (
              <TemplateCard
                key={template.id}
                template={template}
                onDelete={() => deleteMutation.mutate({ templateId: template.id })}
              />
            ))}
          </motion.div>
        )}
      </div>
    </CrmLayout>
  );
}
