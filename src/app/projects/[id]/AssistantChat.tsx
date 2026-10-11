"use client";

import { useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { sendAssistantMessage } from "@/lib/actions/assistant";
import { REQUEST_NETWORK_ERROR } from "@/lib/upload-guard";

export interface AssistantMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export interface AssistantStatus {
  known: number;
  total: number;
  missing: string[];
}

/** Any client component can open the chat by dispatching this event (see OpenAssistantButton). */
const OPEN_EVENT = "glowupp:open-assistant";

/** The "Chat with GlowUpp assistant" button in the project header — opens the pop-up below without leaving the page. */
export function OpenAssistantButton({ label = "Chat with GlowUpp assistant" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))}
      className="inline-flex min-h-12 shrink-0 items-center rounded-full bg-[#3a6694] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#2c5075]"
    >
      {label}
    </button>
  );
}

/**
 * The GlowUpp assistant as a pop-up chat: a floating button that opens a
 * panel (a corner window on larger screens, full screen on phones) with a
 * Hide button to tuck it away again. Messages and the "details known" bar
 * come from the server; sending a message revalidates the project page, so
 * the page behind it picks up whatever the assistant changed. With a chosen design (`forDesign`) it is
 * the place to ask for changes to that design (src/lib/assistant.ts, design mode).
 */
export function AssistantChat({
  projectId,
  messages,
  status,
  forDesign = false,
}: {
  projectId: string;
  messages: AssistantMessage[];
  status: AssistantStatus | null;
  /** The homeowner has a chosen design: the chat is for asking for changes to it. */
  forDesign?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [shown, addOptimistic] = useOptimistic(messages, (current: AssistantMessage[], text: string) => [
    ...current,
    { id: `pending-${current.length}`, role: "user" as const, content: text },
  ]);

  const launcherRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // Open from the header button, or when arriving from the old /assistant URL (?chat=1).
  useEffect(() => {
    const openChat = () => setOpen(true);
    window.addEventListener(OPEN_EVENT, openChat);
    if (new URLSearchParams(window.location.search).get("chat") === "1") openChat();
    return () => window.removeEventListener(OPEN_EVENT, openChat);
  }, []);

  // Escape hides the chat.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Focus the box when the chat opens; hand focus back to the launcher when it hides.
  const wasOpen = useRef(false);
  useEffect(() => {
    if (open) inputRef.current?.focus();
    else if (wasOpen.current) launcherRef.current?.focus();
    wasOpen.current = open;
  }, [open]);

  // Keep the newest message in view.
  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ block: "end" });
  }, [open, shown.length, pending]);

  function send() {
    const text = draft.trim();
    if (!text || pending) return;
    setDraft("");
    setError(null);
    startTransition(async () => {
      addOptimistic(text);
      const fd = new FormData();
      fd.set("message", text);
      let result;
      try {
        result = await sendAssistantMessage(projectId, undefined, fd);
      } catch {
        result = { error: REQUEST_NETWORK_ERROR };
      }
      if (result?.error) {
        setError(result.error);
        setDraft(text); // let them retry without retyping
      }
    });
  }

  return (
    <>
      {!open && (
        <button
          ref={launcherRef}
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open GlowUpp assistant chat"
          className="fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full bg-[#3a6694] px-4 py-3 text-sm font-medium text-white shadow-lg shadow-blue-900/20 transition hover:bg-[#2c5075]"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z" />
          </svg>
          <span className="hidden sm:inline">Assistant</span>
        </button>
      )}

      {open && (
        <div
          role="dialog"
          aria-label="GlowUpp assistant"
          className="fixed inset-0 z-50 flex h-dvh flex-col bg-white text-[#132a4d] sm:inset-auto sm:bottom-4 sm:right-4 sm:h-[560px] sm:w-[380px] sm:rounded-2xl sm:border sm:border-zinc-200 sm:shadow-2xl sm:shadow-blue-900/20"
        >
          <div className="flex items-start justify-between gap-3 border-b border-zinc-100 px-4 py-3 sm:rounded-t-2xl">
            <div className="min-w-0">
              <p className="font-semibold">GlowUpp assistant</p>
              {status && (
                <p className="text-xs text-zinc-500">
                  {status.known} of {status.total} details known
                  {status.missing.length > 0 && <> · still needed: {status.missing.join(", ")}</>}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex shrink-0 items-center gap-1 rounded-full border border-zinc-300 px-3 py-1.5 text-xs font-medium text-[#132a4d] hover:border-[#3a6694]"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m6 9 6 6 6-6" />
              </svg>
              Hide
            </button>
          </div>

          <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
            {shown.length === 0 && (
              <p className="text-sm text-zinc-500">
                {forDesign
                  ? "Tell me what you'd like changed about your design — for example \"make the worktop darker\" or \"add warmer lighting\" — and I'll update it for you."
                  : "Tell it what you're picturing — GlowUpp will ask what it still needs to know and fill in the project brief as you go."}
              </p>
            )}
            {shown.map((m) => (
              <div
                key={m.id}
                className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${
                  m.role === "user" ? "self-end bg-[#3a6694] text-white" : "self-start border border-zinc-200 bg-blue-50"
                }`}
              >
                {m.content}
              </div>
            ))}
            {pending && <div className="self-start rounded-2xl border border-zinc-200 bg-blue-50 px-3 py-2 text-sm text-zinc-500">Thinking…</div>}
            <div ref={endRef} />
          </div>

          <div className="border-t border-zinc-100 p-3">
            {error && <p className="mb-2 text-xs text-red-600">{error}</p>}
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                rows={2}
                placeholder={forDesign ? "What would you like to change?" : "Tell GlowUpp about your project…"}
                className="min-w-0 flex-1 resize-none rounded-lg border border-zinc-300 px-3 py-2 text-sm text-[#132a4d] outline-none focus:border-[#3a6694]"
              />
              <button
                type="button"
                onClick={send}
                disabled={pending || draft.trim() === ""}
                className="rounded-full bg-[#3a6694] px-4 py-2 text-sm font-medium text-white hover:bg-[#2c5075] disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
