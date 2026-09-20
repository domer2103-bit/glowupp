import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { checkRateLimit } from "./rate-limit";

// A regression test for the exact confusion hit during Phase 12's live
// verification: a window that expires between calls must reset the count,
// not carry it forward, and the boundary (the Nth call, not the N+1th)
// is where blocking actually starts.
describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows the first call for a new key", () => {
    expect(checkRateLimit("test:a", 3, 1000)).toBe(true);
  });

  it("allows exactly `max` calls, then blocks the next one", () => {
    const key = "test:b";
    expect(checkRateLimit(key, 3, 60_000)).toBe(true); // 1
    expect(checkRateLimit(key, 3, 60_000)).toBe(true); // 2
    expect(checkRateLimit(key, 3, 60_000)).toBe(true); // 3
    expect(checkRateLimit(key, 3, 60_000)).toBe(false); // 4th — blocked
  });

  it("keeps blocking further calls within the same window, not just the one right after the limit", () => {
    const key = "test:c";
    for (let i = 0; i < 3; i++) checkRateLimit(key, 3, 60_000);
    expect(checkRateLimit(key, 3, 60_000)).toBe(false);
    expect(checkRateLimit(key, 3, 60_000)).toBe(false);
  });

  it("resets the count once the window has fully expired", () => {
    const key = "test:d";
    for (let i = 0; i < 3; i++) checkRateLimit(key, 3, 60_000);
    expect(checkRateLimit(key, 3, 60_000)).toBe(false);

    vi.advanceTimersByTime(60_001);

    expect(checkRateLimit(key, 3, 60_000)).toBe(true);
  });

  it("does not reset early — a call one millisecond before the window ends is still blocked", () => {
    const key = "test:e";
    for (let i = 0; i < 3; i++) checkRateLimit(key, 3, 60_000);
    vi.advanceTimersByTime(59_999);
    expect(checkRateLimit(key, 3, 60_000)).toBe(false);
  });

  it("tracks different keys independently", () => {
    expect(checkRateLimit("test:f1", 1, 60_000)).toBe(true);
    expect(checkRateLimit("test:f1", 1, 60_000)).toBe(false);
    expect(checkRateLimit("test:f2", 1, 60_000)).toBe(true);
  });
});
