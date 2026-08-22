import { StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ThemedText } from '@/components/ThemedText';
import { BookingStatus as StatusType } from '@/types/booking';
import i18n from '@/localization';

// For non-component callers; components should prefer useTranslation so they
// re-render on language change.
export function getStatusLabel(status: StatusType): string {
  return i18n.t(`booking:status.${status}`);
}

type Props = {
  status: StatusType;
};

export function BookingStatus({ status }: Props) {
  const { t } = useTranslation('booking');
  return (
    <ThemedText style={[styles.status, { color: getStatusColor(status) }]}>
      {t(`status.${status}`)}
    </ThemedText>
  );
}

export function getStatusColor(status: StatusType): string {
  const colors: Record<StatusType, string> = {
    pending: '#9A6700',
    confirmed: '#0A58A5',
    in_progress: '#FF9900',
    awaiting_confirmation: '#6D28D9',
    completed: '#2E7D32',
    cancelled: '#B42318',
  };
  return colors[status] || '#999';
}

export function getStatusBackgroundColor(status: StatusType): string {
  const backgrounds: Record<StatusType, string> = {
    pending: '#FFF4CC',
    confirmed: '#E8F1FB',
    in_progress: '#FFF0D6',
    awaiting_confirmation: '#EEE9FF',
    completed: '#E8F5E9',
    cancelled: '#FDECEC',
  };
  return backgrounds[status] || '#F2F2F2';
}

const styles = StyleSheet.create({
  status: {
    marginTop: 6,
    fontWeight: '500',
  },
});
