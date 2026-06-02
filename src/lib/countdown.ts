/** Pure countdown math (DB-free, unit-testable). */

export interface TimeLeft {
  days: number;
  hours: number;
  mins: number;
  secs: number;
  done: boolean;
}

export function timeLeft(target: Date, now: Date = new Date()): TimeLeft {
  let ms = target.getTime() - now.getTime();
  if (ms <= 0) return { days: 0, hours: 0, mins: 0, secs: 0, done: true };
  const days = Math.floor(ms / 86_400_000);
  ms -= days * 86_400_000;
  const hours = Math.floor(ms / 3_600_000);
  ms -= hours * 3_600_000;
  const mins = Math.floor(ms / 60_000);
  ms -= mins * 60_000;
  const secs = Math.floor(ms / 1000);
  return { days, hours, mins, secs, done: false };
}
