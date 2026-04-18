import { useState } from "react";
import { motion } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { CrmLayout, useCrmOrg } from "@/components/CrmLayout";
import {
  CalendarDays,
  Clock,
  MapPin,
  User,
  Plus,
  Trash2,
  X,
  Loader2,
  CalendarOff,
} from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.06 } },
};

function groupEvents(events: any[]) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const weekEnd = new Date(today);
  weekEnd.setDate(today.getDate() + 7);

  const groups: Record<string, any[]> = {
    Today: [],
    Tomorrow: [],
    "This Week": [],
    Later: [],
  };
  for (const e of events) {
    const d = new Date(e.start_at);
    if (d >= today && d < tomorrow) groups.Today.push(e);
    else if (d >= tomorrow && d < new Date(tomorrow.getTime() + 86400000))
      groups.Tomorrow.push(e);
    else if (d < weekEnd) groups["This Week"].push(e);
    else groups.Later.push(e);
  }
  return groups;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function EventCard({
  event,
  contactName,
  onDelete,
}: {
  event: any;
  contactName?: string;
  onDelete: () => void;
}) {
  return (
    <motion.div
      variants={fadeUp}
      className="rounded-xl p-5 bg-surface border border-border group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-foreground font-semibold text-sm truncate">
            {event.title}
          </h3>

          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {formatTime(event.start_at)}
              {event.end_at && <> &ndash; {formatTime(event.end_at)}</>}
            </span>

            {event.location && (
              <span className="flex items-center gap-1 truncate">
                <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                {event.location}
              </span>
            )}
          </div>

          {contactName && (
            <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
              <User className="w-3.5 h-3.5" />
              {contactName}
            </div>
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

function AddEventForm({
  contacts,
  onClose,
}: {
  contacts: any[];
  onClose: () => void;
}) {
  const utils = trpc.useUtils();
  const createMutation = trpc.calendar.create.useMutation({
    onSuccess: () => {
      utils.calendar.list.invalidate();
      onClose();
    },
  });

  const [form, setForm] = useState({
    title: "",
    description: "",
    date: "",
    startTime: "",
    endTime: "",
    location: "",
    contactId: "",
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title || !form.date || !form.startTime) return;

    const startAt = new Date(`${form.date}T${form.startTime}`).toISOString();
    const endAt = form.endTime
      ? new Date(`${form.date}T${form.endTime}`).toISOString()
      : new Date(`${form.date}T${form.startTime}`).toISOString(); // default to same as start

    createMutation.mutate({
      title: form.title,
      description: form.description || undefined,
      startAt,
      endAt,
      location: form.location || undefined,
      contactId: form.contactId ? parseInt(form.contactId) : undefined,
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
        <h3 className="text-foreground font-semibold">Add Event</h3>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-background transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelClass}>Title</label>
          <input
            className={inputClass}
            placeholder="Event title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
        </div>

        <div>
          <label className={labelClass}>Description</label>
          <textarea
            className={inputClass}
            rows={3}
            placeholder="Optional description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={labelClass}>Date</label>
            <input
              type="date"
              className={inputClass}
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              required
            />
          </div>
          <div>
            <label className={labelClass}>Start Time</label>
            <input
              type="time"
              className={inputClass}
              value={form.startTime}
              onChange={(e) => setForm({ ...form, startTime: e.target.value })}
              required
            />
          </div>
          <div>
            <label className={labelClass}>End Time</label>
            <input
              type="time"
              className={inputClass}
              value={form.endTime}
              onChange={(e) => setForm({ ...form, endTime: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>Location</label>
          <input
            className={inputClass}
            placeholder="Location"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
          />
        </div>

        <div>
          <label className={labelClass}>Contact (optional)</label>
          <select
            className={inputClass}
            value={form.contactId}
            onChange={(e) => setForm({ ...form, contactId: e.target.value })}
          >
            <option value="">None</option>
            {contacts.map((c: any) => (
              <option key={c.id} value={c.id}>
                {c.first_name} {c.last_name}
              </option>
            ))}
          </select>
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
            {createMutation.isPending ? "Saving..." : "Save Event"}
          </button>
        </div>
      </form>
    </motion.div>
  );
}

export default function CalendarPage() {
  const [showForm, setShowForm] = useState(false);

  const eventsQuery = trpc.calendar.list.useQuery();
  const contactsQuery = trpc.contacts.list.useQuery();
  const utils = trpc.useUtils();

  const deleteMutation = trpc.calendar.delete.useMutation({
    onSuccess: () => utils.calendar.list.invalidate(),
  });

  const events = eventsQuery.data ?? [];
  const contacts = contactsQuery.data ?? [];
  const contactMap = new Map(contacts.map((c: any) => [c.id, c]));
  const grouped = groupEvents(events);

  const isLoading = eventsQuery.isLoading;
  const isEmpty = events.length === 0 && !isLoading;

  return (
    <CrmLayout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <CalendarDays className="w-6 h-6" style={{ color: "oklch(0.78 0.12 75)" }} />
              Calendar
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Schedule and manage your events
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
              Add Event
            </button>
          )}
        </div>

        {/* Add Event Form */}
        {showForm && (
          <div className="mb-8">
            <AddEventForm
              contacts={contacts}
              onClose={() => setShowForm(false)}
            />
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
            <CalendarOff className="w-12 h-12 text-muted-foreground mb-4" />
            <h2 className="text-foreground font-semibold mb-1">No events yet</h2>
            <p className="text-sm text-muted-foreground">
              Create your first event to get started.
            </p>
          </div>
        )}

        {/* Grouped Events */}
        {!isLoading &&
          !isEmpty &&
          Object.entries(grouped).map(
            ([label, items]) =>
              items.length > 0 && (
                <div key={label} className="mb-8">
                  <h2 className="text-xs uppercase tracking-widest text-muted-foreground mb-3 pl-1">
                    {label}
                  </h2>
                  <motion.div
                    initial="hidden"
                    animate="visible"
                    variants={stagger}
                    className="space-y-3"
                  >
                    {items.map((event: any) => {
                      const contact = event.contact_id
                        ? contactMap.get(event.contact_id)
                        : undefined;
                      const contactName = contact
                        ? `${contact.first_name} ${contact.last_name}`
                        : undefined;
                      return (
                        <EventCard
                          key={event.id}
                          event={event}
                          contactName={contactName}
                          onDelete={() => deleteMutation.mutate({ eventId: event.id })}
                        />
                      );
                    })}
                  </motion.div>
                </div>
              )
          )}
      </div>
    </CrmLayout>
  );
}
