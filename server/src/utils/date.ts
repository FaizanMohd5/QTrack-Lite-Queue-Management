export function serviceDateForTimezone(timezone: string, now = new Date()): Date {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);

  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value;

  return new Date(`${value('year')}-${value('month')}-${value('day')}T00:00:00.000Z`);
}
