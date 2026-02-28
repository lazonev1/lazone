import { SafeAreaView, ScrollView, StyleSheet, RefreshControl, ActivityIndicator, View, Appearance } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import { ThemedText } from '@/components/ThemedText';
import { BookingCard } from '@/components/booking/BookingCard';
import { useBookings } from '@/hooks/useBookings';
import { useAuth } from '@/contexts/auth';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@lazone/ui';
import { Colors } from '@/constants/Colors';

export default function BookedScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { bookings, isLoading, refreshBookings } = useBookings(user?.uid);
  const colorScheme = Appearance.getColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;

  // Auto-refresh every time the tab comes into focus
  useFocusEffect(
    useCallback(() => {
      if (user?.uid) {
        refreshBookings();
      }
    }, [user?.uid, refreshBookings])
  );

  if (isLoading && bookings.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.tint} />
          <ThemedText style={styles.loadingText}>Loading bookings...</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={bookings.length === 0 ? styles.emptyContainer : styles.content}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refreshBookings} />
        }
      >
        <ThemedText type="title" style={styles.title}>My Bookings</ThemedText>

        {bookings.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color={theme.icon} />
            <ThemedText style={styles.emptyTitle}>No bookings yet</ThemedText>
            <ThemedText style={styles.emptySubtitle}>
              Browse providers and book a service to get started.
            </ThemedText>
            <Button
              label="Find a Provider"
              onPress={() => router.push('/explore/search-results')}
              variant="primary"
              style={styles.emptyButton}
            />
          </View>
        ) : (
          bookings.map((booking) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              onPress={() => router.push(`/booking/${booking.id}`)}
            />
          ))
        )}
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
  emptyContainer: {
    padding: 20,
    flexGrow: 1,
  },
  title: {
    marginBottom: 20,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    opacity: 0.7,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.7,
    marginBottom: 24,
  },
  emptyButton: {
    minWidth: 200,
  },
});
