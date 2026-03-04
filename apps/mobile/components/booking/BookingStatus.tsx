import { StyleSheet } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { BookingStatus as StatusType } from '@/types/booking';

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatStatus(status: StatusType): string {
  if (status === 'in_progress') return 'In Progress';
  return capitalize(status);
}

type Props = {
  status: StatusType;
};

export function BookingStatus({ status }: Props) {
  return (
    <ThemedText style={[styles.status, { color: getStatusColor(status) }]}>
      {formatStatus(status)}
    </ThemedText>
  );
}

export function getStatusColor(status: StatusType): string {
  const colors: Record<StatusType, string> = {
    pending: '#e1a100',
    confirmed: '#0A58A5',
    in_progress: '#FF9900',
    completed: '#4CAF50',
    cancelled: '#F44336',
  };
  return colors[status] || '#999';
}

const styles = StyleSheet.create({
  status: {
    marginTop: 6,
    fontWeight: '500',
  },
});
