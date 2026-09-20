import { describe, it, expect } from "vitest";
import { isAtOrPastStatus } from "./project-status";
import { ProjectStatus } from "@/generated/prisma/client";

describe("isAtOrPastStatus", () => {
  it("is true when status equals the milestone", () => {
    expect(isAtOrPastStatus(ProjectStatus.DESIGN_READY, ProjectStatus.DESIGN_READY)).toBe(true);
  });

  it("is true when status is further along than the milestone", () => {
    expect(isAtOrPastStatus(ProjectStatus.REQUESTING_QUOTES, ProjectStatus.DESIGN_READY)).toBe(true);
    expect(isAtOrPastStatus(ProjectStatus.PROFESSIONAL_SELECTED, ProjectStatus.DRAFT)).toBe(true);
  });

  it("is false when status hasn't reached the milestone yet", () => {
    expect(isAtOrPastStatus(ProjectStatus.DRAFT, ProjectStatus.DESIGN_READY)).toBe(false);
    expect(isAtOrPastStatus(ProjectStatus.DESIGNING, ProjectStatus.REQUESTING_QUOTES)).toBe(false);
  });

  it("CANCELLED never counts as at or past anything — it's a terminal off-ramp, not on the line", () => {
    expect(isAtOrPastStatus(ProjectStatus.CANCELLED, ProjectStatus.DRAFT)).toBe(false);
  });

  it("nothing is ever at or past CANCELLED either, for the same reason", () => {
    expect(isAtOrPastStatus(ProjectStatus.COMPLETED, ProjectStatus.CANCELLED)).toBe(false);
  });
});
