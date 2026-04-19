import { useState } from "react";
import { Sparkles, X, Minimize2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { AIChatBox } from "./AIChatBox";

type ChatMessage = { role: "user" | "assistant"; content: string };

export function FloatingAIChat() {
  const { isAuthenticated } = useAuth();
  const orgQuery = trpc.org.current.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
  });
  const utils = trpc.useUtils();

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | undefined>();

  const chatMutation = trpc.ai.chat.useMutation({
    onSuccess: (data) => {
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
      if (data.conversationId) setConversationId(data.conversationId);
      utils.contacts.list.invalidate();
      utils.tasks.list.invalidate();
      utils.calendar.list.invalidate();
    },
    onError: (err) => {
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: `**Error:** ${err.message}`,
      }]);
    },
  });

  if (!isAuthenticated || !orgQuery.data) return null;
  if (orgQuery.data.tier === "starter") return null;

  const handleSend = (content: string) => {
    const next: ChatMessage[] = [...messages, { role: "user", content }];
    setMessages(next);
    chatMutation.mutate({ messages: next, conversationId });
  };

  return (
    <>
      {/* Floating bubble */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Open AI Assistant"
          className="fixed bottom-6 right-6 z-40 group flex items-center justify-center w-14 h-14 rounded-full transition-all hover:scale-105 active:scale-95"
          style={{
            background: "oklch(0.78 0.12 75)",
            color: "oklch(0.10 0.008 265)",
            boxShadow: "0 0 24px oklch(0.78 0.12 75 / 50%), 0 8px 24px rgba(0,0,0,0.4)",
          }}
        >
          <Sparkles className="w-6 h-6" />
          <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 border-2 border-background animate-pulse" />
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div
          className="fixed z-40 flex flex-col bg-surface border border-primary/30 shadow-2xl
                     bottom-6 right-6 w-[420px] h-[640px] rounded-2xl overflow-hidden
                     max-md:inset-0 max-md:w-auto max-md:h-auto max-md:rounded-none max-md:border-0"
          style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.5), 0 0 30px oklch(0.78 0.12 75 / 20%)" }}
        >
          <div
            className="flex items-center justify-between px-4 py-3 shrink-0"
            style={{
              borderBottom: "1px solid oklch(0.22 0.009 265)",
              background: "oklch(0.13 0.008 265)",
            }}
          >
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <span className="text-foreground text-sm font-semibold">AI Assistant</span>
              <span
                className="px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider"
                style={{ background: "oklch(0.78 0.12 75 / 15%)", color: "oklch(0.78 0.12 75)" }}
              >
                {orgQuery.data.tier}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setOpen(false)}
                aria-label="Minimize"
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors hidden md:block"
                title="Minimize"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors md:hidden"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-0">
            <AIChatBox
              messages={messages}
              onSendMessage={handleSend}
              isLoading={chatMutation.isPending}
              placeholder="Ask about contacts, tasks, calendar..."
              height="100%"
              emptyStateMessage="Ask me about your business data, contacts, or marketing strategy."
              suggestedPrompts={[
                "Summarize my contacts",
                "What's on my calendar this week?",
                "Draft a follow-up email for new leads",
              ]}
            />
          </div>
        </div>
      )}
    </>
  );
}
