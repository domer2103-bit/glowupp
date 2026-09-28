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
    <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-2">
        {messages.length === 0 && <p className="text-sm text-zinc-500">No messages yet.</p>}
        {messages.map((m) => {
          const mine = m.senderId === currentUserId;
          return (
            <div
              key={m.id}
              className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                mine ? "self-end bg-[#3a6694] text-white" : "self-start bg-blue-50 text-[#132a4d]"
              }`}
            >
              <p>{m.body}</p>
              <p className={`mt-1 text-[10px] ${mine ? "text-blue-100" : "text-zinc-500"}`}>
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
            className="rounded-lg border border-zinc-300 px-2 py-1 text-sm text-[#132a4d] outline-none focus:border-[#3a6694]"
          />
          {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
          {state?.info && <p className="text-xs text-zinc-500">{state.info}</p>}
          <button
            type="submit"
            disabled={pending}
            className="self-start rounded-full bg-[#3a6694] px-3 py-1 text-xs font-medium text-white hover:bg-[#2c5075] disabled:opacity-50"
          >
            {pending ? "Sending…" : "Send"}
          </button>
        </form>
      )}
    </div>
  );
}
