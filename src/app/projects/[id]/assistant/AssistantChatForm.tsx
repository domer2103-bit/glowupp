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
        className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-[#132a4d] outline-none focus:border-[#3a6694]"
      />
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-full bg-[#3a6694] px-4 py-2 text-sm font-medium text-white hover:bg-[#2c5075] disabled:opacity-50"
      >
        {pending ? "Thinking…" : "Send"}
      </button>
    </form>
  );
}
