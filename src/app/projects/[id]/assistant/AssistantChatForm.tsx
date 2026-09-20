"use client";

import { useActionState, useRef, useEffect } from "react";
import { sendAssistantMessage, type ActionState } from "@/lib/actions/assistant";

export function AssistantChatForm({ projectId }: { projectId: string }) {
  const boundAction = sendAssistantMessage.bind(null, projectId);
  const [state, action, pending] = useActionState<ActionState, FormData>(boundAction, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!pending && !state?.error) formRef.current?.reset();
  }, [pending, state]);

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-2">
      <textarea
        name="message"
        required
        placeholder="Tell GlowUpp about your project…"
        rows={2}
        className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
      />
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button type="submit" disabled={pending} className="self-start rounded-full bg-black px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black">
        {pending ? "Thinking…" : "Send"}
      </button>
    </form>
  );
}
