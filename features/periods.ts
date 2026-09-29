const MONTH_LABEL = new Intl.DateTimeFormat("es-CO", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

export function colombiaToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function colombiaDaysAgo(days: number): string {
  const [year, month, day] = colombiaToday().split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day - days)).toISOString().slice(0, 10);
}

export type PeriodOption = { value: string; label: string };

export function periodOptions(monthsBack: number, monthsAhead = 0): PeriodOption[] {
  const [year, month] = colombiaToday().split("-").map(Number);
  const options: PeriodOption[] = [];
  for (let offset = monthsAhead; offset >= -monthsBack; offset -= 1) {
    const date = new Date(Date.UTC(year, month - 1 + offset, 1));
    const value = date.toISOString().slice(0, 7);
    const label = MONTH_LABEL.format(date);
    options.push({ value, label: `${value} · ${label.charAt(0).toUpperCase()}${label.slice(1)}` });
  }
  return options;
}
