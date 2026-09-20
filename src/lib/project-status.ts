import { ProjectStatus } from "@/generated/prisma/client";

/**
 * The project's natural forward progression, used for "has this project
 * gotten at least this far" checks (e.g. "don't allow requesting quotes
 * before a design has been selected"). CANCELLED is deliberately excluded
 * — it's a terminal off-ramp, not a point on this line.
 */
export const PROJECT_STATUS_ORDER: readonly ProjectStatus[] = [
  ProjectStatus.DRAFT,
  ProjectStatus.COLLECTING_INFORMATION,
  ProjectStatus.DESIGNING,
  ProjectStatus.DESIGN_READY,
  ProjectStatus.REQUESTING_QUOTES,
  ProjectStatus.QUOTES_RECEIVED,
  ProjectStatus.PROFESSIONAL_SELECTED,
  ProjectStatus.COMPLETED,
];

/** True if `status` is at or beyond `milestone` in the natural progression. CANCELLED never counts as "at or past" anything. */
export function isAtOrPastStatus(status: ProjectStatus, milestone: ProjectStatus): boolean {
  const i = PROJECT_STATUS_ORDER.indexOf(status);
  const m = PROJECT_STATUS_ORDER.indexOf(milestone);
  if (i === -1 || m === -1) return false;
  return i >= m;
}
