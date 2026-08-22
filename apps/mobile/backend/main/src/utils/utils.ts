export function formatMessageTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const isToday = startOfDate === startOfToday;

  if (isToday) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } else {
    const daysDiff = Math.round(
      (startOfToday - startOfDate) / (1000 * 60 * 60 * 24)
    );
    if (daysDiff < 7) {
      return date.toLocaleDateString([], { weekday: "short" });
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric" });
    }
  }
}

export function formatDateDivider(isoString: string): string {
  // Lazy require keeps this module importable outside the app (i18n pulls in react-native deps).
  const i18n = require('@/localization').default;
  const date = new Date(isoString);
  const now = new Date();

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

  if (startOfDate === startOfToday) {
    return i18n.t('common:dates.today');
  }

  const startOfYesterday = startOfToday - 86400000;
  if (startOfDate === startOfYesterday) {
    return i18n.t('common:dates.yesterday');
  }

  return date.toLocaleDateString(i18n.language === 'fr' ? 'fr-FR' : 'en-US', { month: 'long', day: 'numeric' });
}
