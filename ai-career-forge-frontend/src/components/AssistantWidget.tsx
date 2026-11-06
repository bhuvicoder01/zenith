"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { isAxiosError } from "axios";
import {
  ArrowUpRight,
  Loader2,
  RotateCcw,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import api from "@/lib/api";
import useAuthStore from "@/store/useAuthStore";
type ChatAction = { label: string; action: string; payload: string };
type ChatMessage = {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
  actions?: ChatAction[];
};
const welcome: ChatMessage = {
  id: "welcome",
  role: "ASSISTANT",
  content:
    "Hi. I can help you think through your profile, role requirements, or interview preparation. What would you like to work on?",
};
const allowedRoutes = new Set([
  "/dashboard",
  "/dashboard/profile",
  "/dashboard/jobs",
  "/dashboard/applications",
  "/dashboard/portfolio",
  "/dashboard/settings",
  "/dashboard/notifications",
  "/dashboard/connections",
  "/dashboard/messages",
]);
export function safeAssistantRoute(path: string) {
  return (
    allowedRoutes.has(path) ||
    /^\/dashboard\/(jobs\/[a-zA-Z0-9_-]+|applications\/[a-zA-Z0-9_-]+\/prep)$/.test(
      path,
    )
  );
}
export default function AssistantWidget() {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([welcome]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>();
  const [error, setError] = useState("");
  const scroll = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setMessages([welcome]);
    setSessionId(undefined);
    setInput("");
    setOpen(false);
    setError("");
  }, [user?.id]);
  useEffect(() => {
    scroll.current?.scrollTo({ top: scroll.current.scrollHeight });
  }, [messages, loading, open]);
  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    const message = input.trim();
    if (!message || message.length > 8000 || loading || !isAuthenticated)
      return;
    setMessages((previous) => [
      ...previous,
      { id: crypto.randomUUID(), role: "USER", content: message },
    ]);
    setInput("");
    setLoading(true);
    setError("");
    try {
      const response = await api.post("/assistant/chat", {
        ...(sessionId ? { sessionId } : {}),
        message,
      });
      setMessages((previous) => [
        ...previous,
        {
          ...response.data,
          id: response.data.id || crypto.randomUUID(),
          role: "ASSISTANT",
        },
      ]);
      setSessionId(response.data.sessionId || sessionId);
    } catch (cause) {
      const status = isAxiosError(cause) ? cause.response?.status : undefined;
      if (status === 404) {
        setSessionId(undefined);
        setError(
          "That conversation is no longer available. Send your message again to start a new one.",
        );
      } else {
        setError(
          status === 401
            ? "Please sign in again to use the assistant."
            : "The assistant could not respond. Your message is below so you can retry.",
        );
      }
      setInput(message);
    } finally {
      setLoading(false);
    }
  };
  if (
    !isAuthenticated ||
    !pathname.startsWith("/dashboard") ||
    pathname.startsWith("/dashboard/messages") ||
    pathname.startsWith("/dashboard/portfolio")
  )
    return null;
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          className="fixed bottom-24 right-4 md:bottom-6 md:right-6 z-[70] inline-flex gap-2 items-center rounded-full border border-border bg-primary text-primary-foreground px-4 py-3 shadow-lg text-xs font-medium"
          aria-label="Open career assistant"
        >
          <Sparkles size={17} />
          <span className="hidden sm:inline">Career assistant</span>
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/25 backdrop-blur-sm z-[100]" />
        <Dialog.Content className="fixed right-0 top-0 bottom-0 w-full sm:max-w-[430px] bg-card text-card-foreground border-l border-border shadow-2xl z-[101] flex flex-col">
          <div className="p-6 border-b border-border flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-accent text-accent-foreground">
              <Sparkles size={20} />
            </div>
            <div className="flex-1">
              <Dialog.Title className="text-base font-semibold">
                Career assistant
              </Dialog.Title>
              <Dialog.Description className="text-xs text-muted-foreground mt-1">
                A little help with your next step.
              </Dialog.Description>
            </div>
            <button
              aria-label="Start a new conversation"
              disabled={loading}
              onClick={() => {
                setMessages([welcome]);
                setSessionId(undefined);
                setError("");
                setInput("");
              }}
              className="p-2 text-muted-foreground"
            >
              <RotateCcw size={16} />
            </button>
            <Dialog.Close
              aria-label="Close career assistant"
              className="p-2 text-muted-foreground"
            >
              <X size={18} />
            </Dialog.Close>
          </div>
          <div
            className="flex-1 overflow-y-auto p-6 space-y-5"
            ref={scroll}
            role="log"
            aria-live="polite"
          >
            {messages.map((message) => (
              <div
                key={message.id}
                className={message.role === "USER" ? "ml-6" : "mr-3"}
              >
                <span className="text-[10px] text-muted-foreground mb-2 block">
                  {message.role === "USER" ? "You" : "Zenith"}
                </span>
                <div
                  className={`rounded-xl p-4 text-sm leading-relaxed ${message.role === "USER" ? "bg-primary text-primary-foreground" : "bg-secondary"}`}
                >
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      p: ({ children }) => (
                        <p className="mb-2 last:mb-0">{children}</p>
                      ),
                      ul: ({ children }) => (
                        <ul className="list-disc pl-4 my-2">{children}</ul>
                      ),
                      a: ({ href, children }) =>
                        href && safeAssistantRoute(href) ? (
                          <a href={href} className="underline">
                            {children}
                          </a>
                        ) : (
                          <span>{children}</span>
                        ),
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                </div>
                {message.actions
                  ?.filter(
                    (action) =>
                      action.action === "NAVIGATE" &&
                      safeAssistantRoute(action.payload),
                  )
                  .map((action, index) => (
                    <button
                      key={index}
                      className="mt-2 mr-2 px-3 py-2 border border-border rounded-lg text-xs inline-flex gap-2 items-center"
                      onClick={() => {
                        router.push(action.payload);
                        setOpen(false);
                      }}
                    >
                      {action.label}
                      <ArrowUpRight size={13} />
                    </button>
                  ))}
              </div>
            ))}
            {loading && (
              <p
                className="text-xs text-muted-foreground flex gap-2 items-center"
                role="status"
              >
                <Loader2 size={15} className="animate-spin" />
                Thinking through your question…
              </p>
            )}
          </div>
          <form
            onSubmit={send}
            className="p-5 border-t border-border space-y-3"
          >
            {error && (
              <p role="alert" className="text-xs text-destructive">
                {error}
              </p>
            )}
            <label htmlFor="assistant-message" className="sr-only">
              Message to career assistant
            </label>
            <div className="flex items-end gap-2">
              <textarea
                id="assistant-message"
                value={input}
                maxLength={8000}
                onChange={(event) => setInput(event.target.value)}
                rows={2}
                placeholder="What would you like to work on?"
                className="flex-1 min-w-0 resize-none rounded-xl border border-border bg-background p-3 text-sm"
              />
              <button
                type="submit"
                aria-label="Send message"
                disabled={loading || !input.trim()}
                className="p-3.5 rounded-xl bg-primary text-primary-foreground disabled:opacity-40"
              >
                <Send size={17} />
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Review AI suggestions for accuracy. Nothing is applied or sent for
              you.
            </p>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
