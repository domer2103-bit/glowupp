export interface TimeLeft {
  expired: boolean;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

/** Whole days/hours/minutes/seconds from `nowMs` until `deadlineMs`; all zero (and `expired`) once the deadline has passed. */
export function timeLeft(nowMs: number, deadlineMs: number): TimeLeft {
  const total = Math.floor((deadlineMs - nowMs) / 1000);
  if (total <= 0) return { expired: true, days: 0, hours: 0, minutes: 0, seconds: 0 };
  return {
    expired: false,
    days: Math.floor(total / 86_400),
    hours: Math.floor((total % 86_400) / 3_600),
    minutes: Math.floor((total % 3_600) / 60),
    seconds: total % 60,
  };
}
