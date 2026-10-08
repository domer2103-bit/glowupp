import { describe, it, expect } from "vitest";
import { timeLeft } from "./countdown";
import { EARLY_BIRD_CUTOFF } from "./fees";

describe("timeLeft", () => {
  const deadline = EARLY_BIRD_CUTOFF.getTime(); // Fri 27 Nov 2026, 00:00 UK

  it("splits the time remaining into days, hours, minutes and seconds", () => {
    // 19 days, 3 hours, 25 minutes and 10 seconds before Black Friday 2026
    const now = deadline - ((19 * 24 + 3) * 3600 + 25 * 60 + 10) * 1000;
    expect(timeLeft(now, deadline)).toEqual({ expired: false, days: 19, hours: 3, minutes: 25, seconds: 10 });
  });

  it("shows the last second, then expires exactly at the deadline", () => {
    expect(timeLeft(deadline - 1000, deadline)).toEqual({ expired: false, days: 0, hours: 0, minutes: 0, seconds: 1 });
    expect(timeLeft(deadline, deadline).expired).toBe(true);
    expect(timeLeft(deadline + 5000, deadline)).toEqual({ expired: true, days: 0, hours: 0, minutes: 0, seconds: 0 });
  });

  it("rounds a part-second down so the display never runs ahead", () => {
    expect(timeLeft(deadline - 1500, deadline).seconds).toBe(1);
  });
});
