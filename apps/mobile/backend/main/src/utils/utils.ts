import { conversationDateLabel, formatConversationTime } from '@/utils/dateFormatting';

// Native localization is loaded only when a presentation helper is invoked.
function currentLocalization(): typeof import('@/localization').default {
  return require('@/localization').default;
}

export function formatMessageTime(isoString: string): string {
  const i18n = currentLocalization();
  return formatConversationTime(isoString, i18n.language);
}

export function formatDateDivider(isoString: string): string {
  const i18n = currentLocalization();
  const label = conversationDateLabel(isoString, i18n.language);
  return label.relative ? i18n.t(`common:dates.${label.relative}`) : label.text;
}
