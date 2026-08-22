import { SafeAreaView, ScrollView, StyleSheet, RefreshControl, ActivityIndicator, View, Appearance, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState, useMemo } from 'react';
import { ThemedText } from '@/components/ThemedText';
import { BookingCard } from '@/components/booking/BookingCard';
import { useBookings } from '@/hooks/useBookings';
import { useAuth } from '@/contexts/auth';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@lazone/ui';
import { Colors } from '@/constants/Colors';
import { BookingViewModel } from '@/types/booking';
import { LoginPrompt } from "@/components/auth/LoginPrompt";
import { useTranslation } from 'react-i18next';

type BookingFilter = 'active' | 'completed' | 'cancelled';

export default function BookedScreen() {
  const router = useRouter();
  const { t } = useTranslation('booking');
  const { user } = useAuth();
  const { bookings, isLoading, refreshBookings } = useBookings(user?.uid);
  const colorScheme = Appearance.getColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const [activeFilter, setActiveFilter] = useState<BookingFilter>('active');

  // Auto-refresh every time the tab comes into focus
  useFocusEffect(
    useCallback(() => {
      if (user?.uid) {
        refreshBookings();
      }
    }, [user?.uid, refreshBookings])
  );

  // Partition bookings by filter category
  const activeBookings = useMemo(
    () => bookings.filter((b) => b.status === 'pending' || b.status === 'confirmed' || b.status === 'in_progress' || b.status === 'awaiting_confirmation'),
    [bookings]
  );
  const completedBookings = useMemo(
    () => bookings.filter((b) => b.status === 'completed'),
    [bookings]
  );
  const cancelledBookings = useMemo(
    () => bookings.filter((b) => b.status === 'cancelled'),
    [bookings]
  );

  if (!user) { return <LoginPrompt title={t('booked.loginTitle')} message={t('booked.loginMessage')} />; }

  const filteredBookings: BookingViewModel[] =
    activeFilter === 'active' ? activeBookings
    : activeFilter === 'completed' ? completedBookings
    : cancelledBookings;

  const filters: { id: BookingFilter; label: string; count: number }[] = [
    { id: 'active', label: t('booked.filters.active'), count: activeBookings.length },
    { id: 'completed', label: t('booked.filters.completed'), count: completedBookings.length },
    { id: 'cancelled', label: t('booked.filters.cancelled'), count: cancelledBookings.length },
  ];

  const emptyMessages: Record<BookingFilter, { title: string; subtitle: string }> = {
    active: {
      title: t('booked.empty.activeTitle'),
      subtitle: t('booked.empty.browseSubtitle'),
    },
    completed: {
      title: t('booked.empty.completedTitle'),
      subtitle: t('booked.empty.completedSubtitle'),
    },
    cancelled: {
      title: t('booked.empty.cancelledTitle'),
      subtitle: t('booked.empty.cancelledSubtitle'),
    },
  };

  if (isLoading && bookings.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.tint} />
          <ThemedText style={styles.loadingText}>{t('booked.loading')}</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refreshBookings} />
        }
      >
        <ThemedText type="title" style={styles.title}>{t('booked.title')}</ThemedText>

        {/* ── Filter Tabs ──────────────────────────────── */}
        {bookings.length > 0 && (
          <View style={styles.filterRow}>
            {filters.map((filter) => {
              const isActive = activeFilter === filter.id;
              return (
                <TouchableOpacity
                  key={filter.id}
                  style={[
                    styles.filterTab,
                    isActive && styles.activeFilterTab,
                    colorScheme === 'dark' && !isActive && styles.filterTabDark,
                  ]}
                  onPress={() => setActiveFilter(filter.id)}
                  activeOpacity={0.7}
                >
                  <ThemedText style={[
                    styles.filterTabText,
                    isActive && styles.activeFilterTabText,
                  ]}>
                    {filter.label}
                  </ThemedText>
                  {filter.count > 0 && (
                    <View style={[
                      styles.filterBadge,
                      isActive && styles.activeFilterBadge,
                    ]}>
                      <ThemedText style={[
                        styles.filterBadgeText,
                        isActive && styles.activeFilterBadgeText,
                      ]}>
                        {filter.count}
                      </ThemedText>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* ── Booking List ─────────────────────────────── */}
        {bookings.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color={theme.icon} />
            <ThemedText style={styles.emptyTitle}>{t('booked.empty.noneTitle')}</ThemedText>
            <ThemedText style={styles.emptySubtitle}>
              {t('booked.empty.browseSubtitle')}
            </ThemedText>
            <Button
              label={t('booked.empty.findProvider')}
              onPress={() => router.push('/explore/search-results')}
              variant="primary"
              style={styles.emptyButton}
            />
          </View>
        ) : filteredBookings.length === 0 ? (
          <View style={styles.emptyFilterState}>
            <Ionicons
              name={activeFilter === 'completed' ? 'checkmark-circle-outline' : activeFilter === 'cancelled' ? 'close-circle-outline' : 'calendar-outline'}
              size={48}
              color={theme.icon}
            />
            <ThemedText style={styles.emptyTitle}>{emptyMessages[activeFilter].title}</ThemedText>
            <ThemedText style={styles.emptySubtitle}>{emptyMessages[activeFilter].subtitle}</ThemedText>
          </View>
        ) : (
          filteredBookings.map((booking) => (
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
  title: {
    marginBottom: 16,
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

  // ── Filter tabs ──
  filterRow: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 8,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    gap: 6,
  },
  filterTabDark: {
    borderColor: '#444',
  },
  activeFilterTab: {
    backgroundColor: '#0A58A5',
    borderColor: '#0A58A5',
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  activeFilterTabText: {
    color: '#fff',
    fontWeight: '600',
  },
  filterBadge: {
    backgroundColor: '#E0E0E0',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  activeFilterBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  filterBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#555',
  },
  activeFilterBadgeText: {
    color: '#fff',
  },

  // ── Empty states ──
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyFilterState: {
    alignItems: 'center',
    paddingVertical: 48,
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
