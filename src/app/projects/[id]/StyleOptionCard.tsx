import { selectDesignConcept } from "@/lib/actions/designs";
import { RetryDesignButton } from "./RetryDesignButton";

/** One style on the "choose your style" screen: the picture, its name, and one clear button. */
export function StyleOptionCard({
  projectId,
  concept,
  url,
  label,
  isCurrent,
}: {
  projectId: string;
  concept: { id: string; status: string };
  url: string | null;
  label: string;
  /** This is the style the homeowner already chose (shown when they come back to compare). */
  isCurrent: boolean;
}) {
  const ready = concept.status === "COMPLETE" && url;
  return (
    <div className={`flex flex-col gap-3 rounded-2xl border bg-white p-3 shadow-sm ${isCurrent ? "border-[#3a6694] ring-2 ring-[#3a6694]/30" : "border-zinc-200"}`}>
      {ready ? (
        <a href={url} target="_blank" rel="noopener noreferrer" aria-label={`Open the ${label} design full size`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={`${label} design`} className="aspect-video w-full rounded-xl object-cover" />
        </a>
      ) : (
        <div className="flex aspect-video items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-3 text-center text-sm text-zinc-500">
          {concept.status === "FAILED" ? "This one didn't come out" : "Creating this look…"}
        </div>
      )}
      <p className="px-1 font-semibold text-[#132a4d]">{label}</p>
      {ready && (isCurrent ? <p className="px-1 text-sm font-medium text-[#3a6694]">★ Your current style</p> : (
        <form action={selectDesignConcept.bind(null, projectId, concept.id)}>
          <button type="submit" className="min-h-12 w-full rounded-full bg-[#3a6694] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#2c5075]">
            Choose this style
          </button>
        </form>
      ))}
      {concept.status === "FAILED" && <RetryDesignButton projectId={projectId} conceptId={concept.id} />}
    </div>
  );
}
