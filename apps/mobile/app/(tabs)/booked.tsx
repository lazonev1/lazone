import { SafeAreaView, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { BookingCard } from '@/components/booking/BookingCard';
import { Bookings } from '@/constants/bookings';

export default function BookedScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="title" style={styles.title}>My Bookings</ThemedText>
        {Bookings.map((booking) => (
          <BookingCard
            key={booking.id}
            booking={booking}
            onPress={(booking) => router.push(`/booking/${booking.id}`)}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    padding: 20,
    flexGrow: 1,
  },
  title: {
    marginBottom: 20,
  },
});
