"use client";

import { useActionState } from "react";
import { sendMessage, type ActionState } from "@/lib/actions/messages";

interface MessageThreadProps {
  quoteRequestId: string;
  messages: { id: string; body: string; createdAt: Date; senderId: string; sender: { name: string } }[];
  currentUserId: string;
  disabled?: boolean;
}

/**
 * The one place message-thread UI lives — reused as-is by both the
 * homeowner's `/projects/[id]/quotes/[quoteRequestId]` page and the
 * professional's `/professional/opportunities/[quoteRequestId]` page.
 * First genuinely shared component in the codebase (everything else so
 * far is colocated per-route) because duplicating a list-plus-form this
 * size across two routes would drift the two copies apart over time.
 */
export function MessageThread({ quoteRequestId, messages, currentUserId, disabled }: MessageThreadProps) {
  const action = sendMessage.bind(null, quoteRequestId);
  const [state, dispatch, pending] = useActionState<ActionState, FormData>(action, undefined);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        {messages.length === 0 && <p className="text-sm text-zinc-500">No messages yet.</p>}
        {messages.map((m) => {
          const mine = m.senderId === currentUserId;
          return (
            <div
              key={m.id}
              className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                mine ? "self-end bg-black text-white dark:bg-white dark:text-black" : "self-start bg-zinc-200 dark:bg-zinc-800"
              }`}
            >
              <p>{m.body}</p>
              <p className={`mt-1 text-[10px] ${mine ? "text-zinc-300 dark:text-zinc-600" : "text-zinc-500"}`}>
                {mine ? "You" : m.sender.name} ·{" "}
                {new Date(m.createdAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          );
        })}
      </div>

      {disabled ? (
        <p className="text-xs text-zinc-500">This thread is closed.</p>
      ) : (
        <form action={dispatch} className="flex flex-col gap-2">
          <textarea
            name="body"
            placeholder="Write a message…"
            required
            className="rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
          {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
          {state?.info && <p className="text-xs text-zinc-500">{state.info}</p>}
          <button
            type="submit"
            disabled={pending}
            className="self-start rounded-full bg-black px-3 py-1 text-xs text-white disabled:opacity-50 dark:bg-white dark:text-black"
          >
            {pending ? "Sending…" : "Send"}
          </button>
        </form>
      )}
    </div>
  );
}
