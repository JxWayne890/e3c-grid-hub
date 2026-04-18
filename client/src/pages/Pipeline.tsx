import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { CrmLayout, useCrmOrg } from "@/components/CrmLayout";
import type { Contact, ContactStage } from "@shared/types";
import { Building2, Clock, GripVertical } from "lucide-react";

const STAGES: { value: ContactStage; label: string; color: string }[] = [
  { value: "lead", label: "Lead", color: "oklch(0.65 0.18 250)" },
  { value: "contacted", label: "Contacted", color: "oklch(0.65 0.18 200)" },
  { value: "qualified", label: "Qualified", color: "oklch(0.65 0.18 150)" },
  { value: "proposal", label: "Proposal", color: "oklch(0.78 0.12 75)" },
  { value: "won", label: "Won", color: "oklch(0.70 0.18 145)" },
  { value: "lost", label: "Lost", color: "oklch(0.65 0.15 25)" },
];

function daysInStage(updatedAt: string): number {
  return Math.floor((Date.now() - new Date(updatedAt).getTime()) / 86400000);
}

function KanbanCard({
  contact,
  onDragStart,
}: {
  contact: Contact;
  onDragStart: (e: React.DragEvent, contact: Contact) => void;
}) {
  const fullName = `${contact.first_name} ${contact.last_name}`.trim();
  const days = daysInStage(contact.updated_at);

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e as unknown as React.DragEvent, contact)}
      className="block shrink-0 rounded-lg p-3 cursor-grab active:cursor-grabbing transition-shadow hover:shadow-md group bg-surface border border-border"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-[oklch(0.10_0.008_265)] flex-shrink-0"
            style={{ background: "oklch(0.78 0.12 75)" }}
          >
            {contact.first_name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-foreground text-sm font-medium truncate">{fullName}</p>
            <p className="text-muted-foreground text-xs truncate">{contact.email}</p>
          </div>
        </div>
        <GripVertical className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
      </div>
      <div className="flex items-center gap-3 mt-2">
        {contact.company && (
          <span className="flex items-center gap-1 text-muted-foreground text-xs">
            <Building2 className="w-3 h-3" />
            <span className="truncate max-w-[100px]">{contact.company}</span>
          </span>
        )}
        <span className="flex items-center gap-1 text-muted-foreground text-xs ml-auto">
          <Clock className="w-3 h-3" />
          {days}d
        </span>
      </div>
    </div>
  );
}

function KanbanColumn({
  stage,
  contacts,
  onDragStart,
  onDrop,
  dragOverStage,
  onDragOver,
  onDragLeave,
}: {
  stage: (typeof STAGES)[number];
  contacts: Contact[];
  onDragStart: (e: React.DragEvent, contact: Contact) => void;
  onDrop: (e: React.DragEvent, stage: ContactStage) => void;
  dragOverStage: ContactStage | null;
  onDragOver: (e: React.DragEvent, stage: ContactStage) => void;
  onDragLeave: () => void;
}) {
  const isOver = dragOverStage === stage.value;

  return (
    <div
      className={`flex flex-col rounded-xl min-h-[400px] transition-all bg-surface/40 backdrop-blur-sm ${isOver ? "ring-2 ring-primary/50 bg-surface/70" : ""}`}
      style={{ border: `1px solid ${isOver ? stage.color : "oklch(0.5 0.01 265 / 15%)"}` }}
      onDragOver={(e) => { e.preventDefault(); onDragOver(e, stage.value); }}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, stage.value)}
    >
      {/* Column header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-border/60">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: stage.color }} />
          <span className="text-foreground text-xs font-semibold uppercase tracking-widest">
            {stage.label}
          </span>
        </div>
        <span
          className="px-1.5 py-0.5 rounded text-xs font-bold"
          style={{ background: `${stage.color}20`, color: stage.color }}
        >
          {contacts.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-2 p-3 flex-1 overflow-y-auto max-h-[calc(100vh-220px)]">
        {contacts.length === 0 ? (
          <div className="flex-1 flex items-center justify-center py-8">
            <p className="text-muted-foreground text-xs text-center">
              {isOver ? "Drop here" : "No contacts"}
            </p>
          </div>
        ) : (
          contacts.map((contact) => (
            <KanbanCard
              key={contact.id}
              contact={contact}
              onDragStart={onDragStart}
            />
          ))
        )}
      </div>
    </div>
  );
}

function PipelineContent() {
  const orgQuery = useCrmOrg();
  const utils = trpc.useUtils();
  const { data: contacts, isLoading } = trpc.contacts.list.useQuery(undefined, {
    enabled: !!orgQuery.data,
  });

  const updateStage = trpc.contacts.updateStage.useMutation({
    onSuccess: () => utils.contacts.list.invalidate(),
  });

  const [draggedContact, setDraggedContact] = useState<Contact | null>(null);
  const [dragOverStage, setDragOverStage] = useState<ContactStage | null>(null);

  const handleDragStart = (e: React.DragEvent, contact: Contact) => {
    setDraggedContact(contact);
    e.dataTransfer.effectAllowed = "move";
    // Set drag image (optional — browser default works fine)
  };

  const handleDrop = (e: React.DragEvent, newStage: ContactStage) => {
    e.preventDefault();
    setDragOverStage(null);

    if (!draggedContact || draggedContact.stage === newStage) {
      setDraggedContact(null);
      return;
    }

    // Optimistic update
    utils.contacts.list.setData(undefined, (old) => {
      if (!old) return old;
      return old.map((c: Contact) =>
        c.id === draggedContact.id
          ? { ...c, stage: newStage, updated_at: new Date().toISOString() }
          : c
      );
    });

    updateStage.mutate(
      { contactId: draggedContact.id, stage: newStage },
      { onError: () => utils.contacts.list.invalidate() }
    );

    setDraggedContact(null);
  };

  const handleDragOver = (e: React.DragEvent, stage: ContactStage) => {
    e.preventDefault();
    setDragOverStage(stage);
  };

  // Group contacts by stage
  const byStage = STAGES.reduce<Record<ContactStage, Contact[]>>(
    (acc, s) => {
      acc[s.value] = (contacts ?? []).filter((c: Contact) => c.stage === s.value);
      return acc;
    },
    {} as Record<ContactStage, Contact[]>
  );

  const totalContacts = contacts?.length ?? 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 rounded-full border-2 border-[oklch(0.78_0.12_75)] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-display text-4xl text-foreground mb-1">
          GRID <span className="text-primary">PIPELINE</span>
        </h1>
        <p className="text-muted-foreground text-sm">
          {totalContacts} contacts across {STAGES.length} stages — drag to move
        </p>
      </div>

      {/* Kanban board */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {STAGES.map((stage) => (
          <KanbanColumn
            key={stage.value}
            stage={stage}
            contacts={byStage[stage.value] ?? []}
            onDragStart={handleDragStart}
            onDrop={handleDrop}
            dragOverStage={dragOverStage}
            onDragOver={handleDragOver}
            onDragLeave={() => setDragOverStage(null)}
          />
        ))}
      </div>
    </div>
  );
}

export default function Pipeline() {
  return (
    <CrmLayout>
      <PipelineContent />
    </CrmLayout>
  );
}
