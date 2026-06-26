/** Cron presets matching Cursor Automations UI. */
export const CRON_PRESETS = {
  hourly: "0 * * * *",
  daily: "0 9 * * *",
  weekly: "0 9 * * 1",
} as const;

export type CronPreset = keyof typeof CRON_PRESETS;

type CronFields = {
  minute: number[];
  hour: number[];
  dayOfMonth: number[];
  month: number[];
  dayOfWeek: number[];
};

function parseField(field: string, min: number, max: number): number[] {
  if (field === "*") {
    return Array.from({ length: max - min + 1 }, (_, i) => i + min);
  }

  const values = new Set<number>();

  for (const part of field.split(",")) {
    if (part.includes("/")) {
      const [base, stepStr] = part.split("/");
      const step = Number(stepStr);
      const range = base === "*" ? [min, max] : parseRange(base, min, max);
      for (let v = range[0]; v <= range[1]; v += step) values.add(v);
      continue;
    }

    if (part.includes("-")) {
      const [start, end] = parseRange(part, min, max);
      for (let v = start; v <= end; v++) values.add(v);
      continue;
    }

    const n = Number(part);
    if (!Number.isNaN(n) && n >= min && n <= max) values.add(n);
  }

  return [...values].sort((a, b) => a - b);
}

function parseRange(part: string, min: number, max: number): [number, number] {
  if (part.includes("-")) {
    const [a, b] = part.split("-").map(Number);
    return [Math.max(min, a), Math.min(max, b)];
  }
  const n = Number(part);
  return [n, n];
}

function parseCron(cron: string): CronFields | null {
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return null;

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
  return {
    minute: parseField(minute, 0, 59),
    hour: parseField(hour, 0, 23),
    dayOfMonth: parseField(dayOfMonth, 1, 31),
    month: parseField(month, 1, 12),
    dayOfWeek: parseField(dayOfWeek, 0, 7).map((d) => (d === 7 ? 0 : d)),
  };
}

function matchesCron(fields: CronFields, date: Date): boolean {
  const minute = date.getUTCMinutes();
  const hour = date.getUTCHours();
  const dayOfMonth = date.getUTCDate();
  const month = date.getUTCMonth() + 1;
  const dayOfWeek = date.getUTCDay();

  return (
    fields.minute.includes(minute) &&
    fields.hour.includes(hour) &&
    fields.dayOfMonth.includes(dayOfMonth) &&
    fields.month.includes(month) &&
    fields.dayOfWeek.includes(dayOfWeek)
  );
}

/** Returns true if cron expression is due in the given minute window. */
export function isCronDue(
  cron: string,
  lastRunAt: string | null,
  now = new Date(),
): boolean {
  const fields = parseCron(cron);
  if (!fields) return false;

  const windowStart = new Date(now);
  windowStart.setUTCSeconds(0, 0);

  if (!matchesCron(fields, windowStart)) return false;

  if (!lastRunAt) return true;

  const last = new Date(lastRunAt);
  return last.getTime() < windowStart.getTime();
}

/** Compute next run time after `from` for simple cron patterns. */
export function computeNextCronRun(cron: string, from = new Date()): string {
  const fields = parseCron(cron);
  if (!fields) {
    return new Date(from.getTime() + 60 * 60 * 1000).toISOString();
  }

  const cursor = new Date(from);
  cursor.setUTCSeconds(0, 0);
  cursor.setUTCMinutes(cursor.getUTCMinutes() + 1);

  for (let i = 0; i < 366 * 24 * 60; i++) {
    if (matchesCron(fields, cursor)) {
      return cursor.toISOString();
    }
    cursor.setUTCMinutes(cursor.getUTCMinutes() + 1);
  }

  return new Date(from.getTime() + 24 * 60 * 60 * 1000).toISOString();
}

export function presetToCron(preset: string): string {
  if (preset in CRON_PRESETS) return CRON_PRESETS[preset as CronPreset];
  return preset;
}
