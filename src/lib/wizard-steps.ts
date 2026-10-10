/**
 * The redesign wizard (src/app/redesign/[type]/RedesignWizard.tsx) asks its
 * questions one screen at a time instead of all on one long page, which is
 * much easier on a phone. This is the order of the screens and the rules for
 * moving between them, kept free of React so they can be unit-tested.
 */

export type WizardStepKey = "photo" | "changes" | "style" | "colours" | "budget";

export interface WizardStep {
  key: WizardStepKey;
  /** Short label for the progress line. */
  label: string;
  /** A step the person may pass over with "Skip". */
  optional: boolean;
}

export const WIZARD_STEPS: WizardStep[] = [
  { key: "photo", label: "Photo", optional: false },
  { key: "changes", label: "What to change", optional: true },
  { key: "style", label: "Style", optional: false },
  { key: "colours", label: "Colours", optional: true },
  { key: "budget", label: "Budget", optional: true },
];

export interface WizardProgress {
  photoCount: number;
  style: string;
}

/** Whether "Next" works on this screen: a photo is needed before moving on from step 1, and a style before moving on from the style step. */
export function canAdvance(step: WizardStepKey, progress: WizardProgress): boolean {
  if (step === "photo") return progress.photoCount > 0;
  if (step === "style") return progress.style.trim().length > 0;
  return true;
}

/** Whether the design can be generated at all: the photo and the style are the only things it cannot do without. */
export function canGenerate(progress: WizardProgress): boolean {
  return progress.photoCount > 0 && progress.style.trim().length > 0;
}

/** Where to open the wizard: someone returning with a photo already uploaded starts at the first question after it. */
export function startingStep(progress: WizardProgress): number {
  return progress.photoCount > 0 ? 1 : 0;
}

export function clampStep(index: number): number {
  return Math.min(Math.max(index, 0), WIZARD_STEPS.length - 1);
}

/** "Step 2 of 5" */
export function stepLabel(index: number): string {
  return `Step ${clampStep(index) + 1} of ${WIZARD_STEPS.length}`;
}
