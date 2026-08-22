import { StyleSheet } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { BookingStatus as StatusType } from '@/types/booking';

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function getStatusLabel(status: StatusType): string {
  if (status === 'confirmed') return 'Accepted';
  if (status === 'in_progress') return 'In Progress';
  if (status === 'awaiting_confirmation') return 'Awaiting Confirmation';
  return capitalize(status);
}

type Props = {
  status: StatusType;
};

export function BookingStatus({ status }: Props) {
  return (
    <ThemedText style={[styles.status, { color: getStatusColor(status) }]}>
      {getStatusLabel(status)}
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
