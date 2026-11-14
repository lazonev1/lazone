export function appDateLocale(language: string): string {
  return language.toLowerCase().startsWith('fr') ? 'fr-FR' : 'en-US';
}

function validDate(value: string): Date | null {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

/** Compare local calendar dates, not elapsed 24-hour periods (DST-safe). */
export function calendarDaysAgo(date: Date, now: Date): number {
  const day = (value: Date) => Date.UTC(value.getFullYear(), value.getMonth(), value.getDate());
  return (day(now) - day(date)) / 86_400_000;
}

export function formatConversationTime(value: string, language: string, now = new Date()): string {
  const date = validDate(value);
  if (!date) return '';
  const daysAgo = calendarDaysAgo(date, now);
  const locale = appDateLocale(language);
  if (daysAgo === 0) return date.toLocaleTimeString(locale, {
    hour: '2-digit', minute: '2-digit', hour12: !language.toLowerCase().startsWith('fr'),
  });
  if (daysAgo > 0 && daysAgo < 7) return date.toLocaleDateString(locale, { weekday: 'short' });
  return date.toLocaleDateString(locale, {
    month: 'short', day: 'numeric', ...(date.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}),
  });
}

export function conversationDateLabel(value: string, language: string, now = new Date()): {
  relative?: 'today' | 'yesterday'; text: string;
} {
  const date = validDate(value);
  if (!date) return { text: '' };
  const daysAgo = calendarDaysAgo(date, now);
  if (daysAgo === 0) return { relative: 'today', text: '' };
  if (daysAgo === 1) return { relative: 'yesterday', text: '' };
  return { text: date.toLocaleDateString(appDateLocale(language), {
    month: 'long', day: 'numeric', ...(date.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}),
  }) };
}
