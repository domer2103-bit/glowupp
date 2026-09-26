"use client";

import { useActionState, useMemo, useState } from "react";
import { uploadRedesignPhoto, submitRedesignBrief, type ActionState } from "@/lib/actions/redesign-wizard";

export interface ChangeOption {
  key: string;
  label: string;
}

const STYLE_OPTIONS = [
  { key: "Modern", label: "Modern", gradient: "from-slate-200 to-slate-400" },
  { key: "Contemporary", label: "Contemporary", gradient: "from-blue-100 to-blue-300" },
  { key: "Minimal", label: "Minimal", gradient: "from-zinc-100 to-zinc-300" },
  { key: "Traditional", label: "Traditional", gradient: "from-amber-100 to-amber-300" },
  { key: "Industrial", label: "Industrial", gradient: "from-neutral-300 to-neutral-500" },
  { key: "Scandinavian", label: "Scandinavian", gradient: "from-orange-50 to-orange-200" },
  { key: "I'm not sure", label: "I'm not sure", gradient: "from-blue-50 to-white" },
];

const COLOUR_OPTIONS = [
  { key: "white", label: "White" },
  { key: "cream", label: "Cream" },
  { key: "grey", label: "Grey" },
  { key: "green", label: "Green" },
  { key: "blue", label: "Blue" },
  { key: "black", label: "Black" },
  { key: "wood", label: "Wood" },
  { key: "surprise_me", label: "Surprise me" },
];

const BUDGET_OPTIONS = [
  { key: "under_5000", label: "Under £5,000" },
  { key: "5000_10000", label: "£5,000–£10,000" },
  { key: "10000_20000", label: "£10,000–£20,000" },
  { key: "over_20000", label: "£20,000+" },
  { key: "not_sure", label: "Not sure yet" },
];

function Chip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-sm transition ${
        selected
          ? "border-[#3a6694] bg-[#3a6694] text-white"
          : "border-zinc-300 bg-white text-[#132a4d] hover:border-[#3a6694]"
      }`}
    >
      {label}
    </button>
  );
}

function AssistantBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#132a4d] text-xs font-semibold text-white">
        G
      </span>
      <div className="flex-1 rounded-2xl rounded-tl-sm border border-zinc-200 bg-white px-4 py-3 text-sm text-[#132a4d] shadow-sm">
        {children}
      </div>
    </div>
  );
}

function CheckRow({ label, value, done }: { label: string; value?: string; done: boolean }) {
  return (
    <li className="flex items-start gap-2 text-sm">
      <span
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] ${
          done ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-400"
        }`}
      >
        {done ? "✓" : ""}
      </span>
      <span>
        <span className="font-medium text-[#132a4d]">{label}</span>
        {value && <span className="block text-xs text-zinc-500">{value}</span>}
      </span>
    </li>
  );
}

interface Photo {
  id: string;
  url: string | null;
}

export function RedesignWizard({
  projectId,
  redesignPath,
  categoryLabel,
  changeOptions,
  photos,
  initialStyle,
  initialChanges,
  initialColours,
  initialNotes,
  initialBudgetPreset,
}: {
  projectId: string;
  redesignPath: string;
  categoryLabel: string;
  changeOptions: ChangeOption[];
  photos: Photo[];
  initialStyle: string;
  initialChanges: string[];
  initialColours: string[];
  initialNotes: string;
  initialBudgetPreset: string;
}) {
  const [style, setStyle] = useState(initialStyle);
  const [changes, setChanges] = useState<string[]>(initialChanges);
  const [colours, setColours] = useState<string[]>(initialColours);
  const [budgetPreset, setBudgetPreset] = useState(initialBudgetPreset);
  const [notes, setNotes] = useState(initialNotes);

  const boundUpload = uploadRedesignPhoto.bind(null, projectId, redesignPath);
  const [uploadState, uploadAction, uploadPending] = useActionState<ActionState, FormData>(boundUpload, undefined);

  const latestPhoto = photos[photos.length - 1];
  const boundSubmit = submitRedesignBrief.bind(null, projectId, latestPhoto?.id ?? "");
  const [submitState, submitAction, submitPending] = useActionState<ActionState, FormData>(boundSubmit, undefined);

  const stepsDone = [photos.length > 0, style.length > 0, changes.length > 0 || colours.length > 0, budgetPreset.length > 0].filter(Boolean).length;
  const canGenerate = photos.length > 0 && style.length > 0 && !submitPending;

  const hiddenFields = useMemo(
    () => (
      <>
        <input type="hidden" name="desiredStyle" value={style} />
        {changes.map((c) => (
          <input key={c} type="hidden" name="changesWanted" value={c} />
        ))}
        {colours.map((c) => (
          <input key={c} type="hidden" name="coloursPreference" value={c} />
        ))}
        <input type="hidden" name="mustHaveFeatures" value={notes} />
        <input type="hidden" name="budgetPreset" value={budgetPreset} />
      </>
    ),
    [style, changes, colours, notes, budgetPreset]
  );

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div className="flex flex-col gap-5 rounded-[28px] border border-zinc-200 bg-white/70 p-6 shadow-sm sm:p-8">
        <div>
          <h1 className="text-3xl font-bold text-[#132a4d] sm:text-4xl">Let&apos;s redesign your {categoryLabel.toLowerCase()}.</h1>
          <p className="mt-2 text-sm text-zinc-600">I&apos;ll ask you a few questions so the design feels right for your space.</p>
        </div>

        <AssistantBubble>First, show me the space you&apos;d like to transform.</AssistantBubble>
        <div className="ml-11 flex flex-wrap items-center gap-3">
          {photos.map((photo) => (
            <div key={photo.id} className="h-20 w-28 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100">
              {photo.url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photo.url} alt={`Uploaded ${categoryLabel.toLowerCase()}`} className="h-full w-full object-cover" />
              )}
            </div>
          ))}
          <form action={uploadAction}>
            <label className="flex h-20 w-28 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-zinc-300 text-center text-[11px] text-zinc-500 hover:border-[#3a6694] hover:text-[#3a6694]">
              <span>{uploadPending ? "Uploading…" : "↑ Upload photo"}</span>
              <input
                type="file"
                name="file"
                accept="image/jpeg,image/png,image/webp,image/heic"
                className="hidden"
                onChange={(e) => e.currentTarget.form?.requestSubmit()}
              />
            </label>
          </form>
        </div>
        {uploadState?.error && <p className="ml-11 text-xs text-red-600">{uploadState.error}</p>}

        <AssistantBubble>What would you like to change?</AssistantBubble>
        <div className="ml-11 flex flex-wrap gap-2">
          {changeOptions.map((opt) => (
            <Chip
              key={opt.key}
              label={opt.label}
              selected={changes.includes(opt.key)}
              onClick={() => setChanges((prev) => (prev.includes(opt.key) ? prev.filter((c) => c !== opt.key) : [...prev, opt.key]))}
            />
          ))}
        </div>

        <AssistantBubble>What style are you imagining?</AssistantBubble>
        <div className="ml-11 grid grid-cols-3 gap-3 sm:grid-cols-4">
          {STYLE_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setStyle(opt.key)}
              className={`flex flex-col items-center gap-1.5 rounded-xl border p-1.5 transition ${
                style === opt.key ? "border-[#3a6694] ring-2 ring-[#3a6694]/40" : "border-zinc-200 hover:border-[#3a6694]"
              }`}
            >
              <span className={`h-12 w-full rounded-lg bg-gradient-to-br ${opt.gradient}`} />
              <span className="text-xs text-[#132a4d]">{opt.label}</span>
            </button>
          ))}
        </div>

        <AssistantBubble>What colours do you prefer?</AssistantBubble>
        <div className="ml-11 flex flex-wrap gap-2">
          {COLOUR_OPTIONS.map((opt) => (
            <Chip
              key={opt.key}
              label={opt.label}
              selected={colours.includes(opt.key)}
              onClick={() => setColours((prev) => (prev.includes(opt.key) ? prev.filter((c) => c !== opt.key) : [...prev, opt.key]))}
            />
          ))}
        </div>

        <AssistantBubble>What is your approximate budget?</AssistantBubble>
        <div className="ml-11 flex flex-wrap gap-2">
          {BUDGET_OPTIONS.map((opt) => (
            <Chip key={opt.key} label={opt.label} selected={budgetPreset === opt.key} onClick={() => setBudgetPreset(opt.key)} />
          ))}
        </div>

        <AssistantBubble>Anything else you&apos;d like me to know?</AssistantBubble>
        <div className="ml-11">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add your text here… (optional)"
            rows={2}
            className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm text-[#132a4d] placeholder:text-zinc-400 focus:border-[#3a6694] focus:outline-none"
          />
        </div>
      </div>

      <aside className="h-fit rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm lg:sticky lg:top-8">
        <h2 className="text-lg font-bold text-[#132a4d]">Your Design Brief</h2>
        <p className="text-sm text-zinc-500">Your {categoryLabel}</p>
        <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-[#3a6694]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#3a6694]" />
          {canGenerate ? "Ready to generate" : "Almost ready"}
        </span>

        <ul className="mt-5 flex flex-col gap-3">
          <CheckRow label="Photos" value={photos.length > 0 ? `${photos.length} photo${photos.length > 1 ? "s" : ""} uploaded` : undefined} done={photos.length > 0} />
          <CheckRow label="Space" value={categoryLabel} done />
          <CheckRow label="Style" value={style || undefined} done={style.length > 0} />
          <CheckRow
            label="Colours"
            value={colours.length > 0 ? colours.map((c) => COLOUR_OPTIONS.find((o) => o.key === c)?.label).join(", ") : undefined}
            done={colours.length > 0}
          />
          <CheckRow
            label="Changes"
            value={changes.length > 0 ? changes.map((c) => changeOptions.find((o) => o.key === c)?.label).join(", ") : undefined}
            done={changes.length > 0}
          />
          <CheckRow label="Budget" value={BUDGET_OPTIONS.find((o) => o.key === budgetPreset)?.label} done={budgetPreset.length > 0} />
        </ul>

        <p className="mt-5 text-xs text-zinc-500">
          GlowUpp will use your original photo as the foundation and redesign the same space while keeping the existing
          structure and perspective realistic.
        </p>

        <form action={submitAction} className="mt-5">
          {hiddenFields}
          <button
            type="submit"
            disabled={!canGenerate}
            className="w-full rounded-full bg-[#3a6694] px-4 py-3 text-sm font-medium text-white transition hover:bg-[#2c5075] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitPending ? "Generating…" : "Generate My Design →"}
          </button>
          {submitState?.error && <p className="mt-2 text-xs text-red-600">{submitState.error}</p>}
        </form>

        <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
          <div className="h-full rounded-full bg-[#3a6694] transition-all" style={{ width: `${(stepsDone / 4) * 100}%` }} />
        </div>
        <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-500">
          <span>Step {stepsDone} of 4</span>
          <span>Estimated generation time: ~2 minutes</span>
        </div>
      </aside>
    </div>
  );
}
