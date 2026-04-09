import { useState } from "react";
import { motion } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { CrmLayout, useCrmOrg } from "@/components/CrmLayout";
import type { Task } from "@shared/types";
import { CheckCircle, Circle, Plus, Calendar, AlertTriangle, Trash2, X } from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

const PRIORITY_COLORS = {
  low: { bg: "oklch(0.55 0.12 200 / 15%)", text: "oklch(0.65 0.15 200)" },
  medium: { bg: "oklch(0.65 0.12 75 / 15%)", text: "oklch(0.78 0.12 75)" },
  high: { bg: "oklch(0.55 0.15 25 / 15%)", text: "oklch(0.65 0.18 25)" },
};

function isOverdue(task: Task): boolean {
  if (!task.due_date || task.status !== "pending") return false;
  return new Date(task.due_date) < new Date(new Date().toDateString());
}

function formatDueDate(date: string | null): string {
  if (!date) return "No due date";
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function TaskRow({ task, onComplete, onDelete }: {
  task: Task;
  onComplete: () => void;
  onDelete: () => void;
}) {
  const overdue = isOverdue(task);
  const priority = PRIORITY_COLORS[task.priority];
  const completed = task.status === "completed";

  return (
    <motion.div
      variants={fadeUp}
      className={`flex items-center gap-3 p-4 rounded-lg border border-border group transition-colors ${completed ? "opacity-50" : ""}`}
    >
      <button onClick={onComplete} className="flex-shrink-0">
        {completed ? (
          <CheckCircle className="w-5 h-5 text-green-400" />
        ) : (
          <Circle className="w-5 h-5 text-muted-foreground hover:text-primary transition-colors" />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
          {task.title}
        </p>
        {task.description && (
          <p className="text-muted-foreground text-xs mt-0.5 truncate">{task.description}</p>
        )}
      </div>

      <span className="px-2 py-0.5 rounded text-xs capitalize" style={{ background: priority.bg, color: priority.text }}>
        {task.priority}
      </span>

      {task.due_date && (
        <span className={`flex items-center gap-1 text-xs ${overdue ? "text-red-400" : "text-muted-foreground"}`}>
          {overdue && <AlertTriangle className="w-3 h-3" />}
          <Calendar className="w-3 h-3" />
          {formatDueDate(task.due_date)}
        </span>
      )}

      <button onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-500/20">
        <Trash2 className="w-3.5 h-3.5 text-red-400" />
      </button>
    </motion.div>
  );
}

function AddTaskForm({ onClose, onSubmit, loading }: {
  onClose: () => void;
  onSubmit: (data: { title: string; description?: string; dueDate?: string; priority?: "low" | "medium" | "high" }) => void;
  loading: boolean;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-md rounded-xl p-6" style={{ background: "oklch(0.13 0.009 265)", border: "1px solid oklch(0.22 0.009 265)" }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-foreground font-display text-lg">ADD TASK</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); if (title.trim()) onSubmit({ title, description: description || undefined, dueDate: dueDate || undefined, priority }); }}
          className="flex flex-col gap-3">
          <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary bg-background border border-border"
            placeholder="Task title..." />
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
            className="w-full px-3 py-2.5 rounded-lg text-sm text-foreground placeholder:text-muted-foreground outline-none resize-none focus:ring-1 focus:ring-primary bg-background border border-border"
            placeholder="Description (optional)" />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-muted-foreground text-xs uppercase tracking-widest mb-1">Due Date</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm text-foreground outline-none bg-background border border-border" />
            </div>
            <div>
              <label className="block text-muted-foreground text-xs uppercase tracking-widest mb-1">Priority</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value as "low" | "medium" | "high")}
                className="w-full px-3 py-2 rounded-lg text-sm text-foreground outline-none bg-background border border-border">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
          <button type="submit" disabled={loading || !title.trim()}
            className="w-full py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50"
            style={{ background: "oklch(0.78 0.12 75)", color: "oklch(0.10 0.008 265)" }}>
            {loading ? <div className="w-4 h-4 mx-auto rounded-full border-2 border-current border-t-transparent animate-spin" /> : "Add Task"}
          </button>
        </form>
      </div>
    </div>
  );
}

function TasksContent() {
  const orgQuery = useCrmOrg();
  const utils = trpc.useUtils();
  const { data: tasks, isLoading } = trpc.tasks.list.useQuery(undefined, {
    enabled: !!orgQuery.data,
  });

  const createTaskMut = trpc.tasks.create.useMutation({
    onSuccess: () => { utils.tasks.list.invalidate(); setFormOpen(false); },
  });

  const completeTaskMut = trpc.tasks.complete.useMutation({
    onSuccess: () => utils.tasks.list.invalidate(),
  });

  const deleteTaskMut = trpc.tasks.delete.useMutation({
    onSuccess: () => utils.tasks.list.invalidate(),
  });

  const [formOpen, setFormOpen] = useState(false);

  const pending = (tasks ?? []).filter((t: Task) => t.status === "pending");
  const completed = (tasks ?? []).filter((t: Task) => t.status === "completed");
  const overdue = pending.filter(isOverdue);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 rounded-full border-2 border-[oklch(0.78_0.12_75)] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-4xl text-foreground mb-1">
            GRID <span className="text-primary">TASKS</span>
          </h1>
          <p className="text-muted-foreground text-sm">
            {pending.length} pending{overdue.length > 0 ? ` · ${overdue.length} overdue` : ""} · {completed.length} completed
          </p>
        </div>
        <button onClick={() => setFormOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold"
          style={{ background: "oklch(0.78 0.12 75)", color: "oklch(0.10 0.008 265)" }}>
          <Plus className="w-4 h-4" />
          Add Task
        </button>
      </div>

      {/* Pending tasks */}
      {pending.length > 0 && (
        <div className="mb-6">
          <h2 className="text-muted-foreground text-xs uppercase tracking-widest mb-3">Pending ({pending.length})</h2>
          <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.04 } } }}
            className="flex flex-col gap-2">
            {pending.map((task: Task) => (
              <TaskRow key={task.id} task={task}
                onComplete={() => completeTaskMut.mutate({ taskId: task.id })}
                onDelete={() => deleteTaskMut.mutate({ taskId: task.id })} />
            ))}
          </motion.div>
        </div>
      )}

      {/* Completed tasks */}
      {completed.length > 0 && (
        <div>
          <h2 className="text-muted-foreground text-xs uppercase tracking-widest mb-3">Completed ({completed.length})</h2>
          <div className="flex flex-col gap-2">
            {completed.slice(0, 10).map((task: Task) => (
              <TaskRow key={task.id} task={task}
                onComplete={() => {}}
                onDelete={() => deleteTaskMut.mutate({ taskId: task.id })} />
            ))}
          </div>
        </div>
      )}

      {pending.length === 0 && completed.length === 0 && (
        <div className="text-center py-20">
          <CheckCircle className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No tasks yet. Add your first task to stay organized.</p>
        </div>
      )}

      {formOpen && (
        <AddTaskForm
          loading={createTaskMut.isPending}
          onClose={() => setFormOpen(false)}
          onSubmit={(data) => createTaskMut.mutate(data)}
        />
      )}
    </div>
  );
}

export default function Tasks() {
  return (
    <CrmLayout>
      <TasksContent />
    </CrmLayout>
  );
}
