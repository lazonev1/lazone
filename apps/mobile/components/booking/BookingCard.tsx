import { StyleSheet, View, Appearance } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Booking, BookingStatus as StatusType } from '@/types/booking';
import { BookingStatus, getStatusColor } from './BookingStatus';
import { ArrowButton } from '@/components/ui/ArrowButton';
import { Colors } from '@/constants/Colors';

type Props = {
  booking: Booking;
  onPress?: (booking: Booking) => void;
};

export function BookingCard({ booking, onPress }: Props) {
  const colorScheme = Appearance.getColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;

  return (
    <ThemedView
      style={[styles.card, { borderLeftWidth: 5, borderLeftColor: getStatusColor(booking.status) }]}
      lightColor={theme.background}
      darkColor="#333"
    >
      <View style={styles.content}>
        <View style={styles.details}>
          <ThemedText type="defaultSemiBold">{booking.name}</ThemedText>
          <ThemedText>{booking.service}</ThemedText>
          <ThemedText>{booking.time}</ThemedText>
          <BookingStatus status={booking.status} />
        </View>
        <ArrowButton 
          onPress={() => onPress?.(booking)} 
          color={colorScheme === 'dark' ? '#fff' : '#666'}
        />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  details: {
    flex: 1,
  },
});
