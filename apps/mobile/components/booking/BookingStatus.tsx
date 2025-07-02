import { StyleSheet } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { BookingStatus as StatusType } from '@/types/booking';
import { capitalize } from '@lazone/ui';

type Props = {
  status: StatusType;
};

export function BookingStatus({ status }: Props) {
  return (
    <ThemedText style={[styles.status, { color: getStatusColor(status) }]}>
      {capitalize(status)}
    </ThemedText>
  );
}

export function getStatusColor(status: StatusType): string {
  const colors = {
    accepted: 'green',
    pending: '#e1a100',
    cancelled: 'red',
  };
  return colors[status] || '#999';
}

const styles = StyleSheet.create({
  status: {
    marginTop: 6,
    fontWeight: '500',
  },
});
