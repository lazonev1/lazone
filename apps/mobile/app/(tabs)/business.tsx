import {
  View,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Appearance,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/contexts/auth';
import { useProviderBookings } from '@/hooks/useBookings';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@lazone/ui';
import Toast from '@/components/ui/Toast';
import { useToast } from '@/hooks/useToast';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(isoString: string) {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatTime(isoString: string) {
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();
}

function timeAgo(isoString: string) {
  const now = new Date();
  const diff = now.getTime() - new Date(isoString).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatPrice(amount: number): string {
  return amount.toLocaleString('en-US') + ' CFA';
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function BusinessScreen() {
  const router = useRouter();
  const { user, userProfile } = useAuth();
  const colorScheme = Appearance.getColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const styles = createStyles(theme, colorScheme);
  const { toast, showToast, hideToast } = useToast();

  const isProvider = userProfile?.role === 'provider' || userProfile?.role === 'both';

  // Provider's booking data — providerId === user._id
  const {
    incomingRequests,
    upcomingBookings,
    completedBookings,
    acceptBooking,
    declineBooking,
    isLoading,
    refreshBookings,
  } = useProviderBookings(isProvider ? user?.uid : undefined);

  // Track which booking is currently being acted on (for button loading states)
  const [actionInFlight, setActionInFlight] = useState<string | null>(null);

  // Refresh bookings whenever this tab comes into focus
  useFocusEffect(
    useCallback(() => {
      if (isProvider && user?.uid) {
        refreshBookings();
      }
    }, [isProvider, user?.uid, refreshBookings])
  );

  // ── Computed metrics ──
  const totalEarnings = completedBookings.reduce((sum, b) => sum + b.price, 0);

  // ── Handlers ──
  const handleAccept = async (bookingId: string) => {
    setActionInFlight(bookingId);
    try {
      await acceptBooking(bookingId);
      showToast('Booking accepted', 'success');
    } catch {
      showToast('Failed to accept booking', 'error');
    } finally {
      setActionInFlight(null);
    }
  };

  const handleDecline = (bookingId: string, clientName: string) => {
    Alert.alert(
      'Decline Request',
      `Are you sure you want to decline the request from ${clientName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            setActionInFlight(bookingId);
            try {
              await declineBooking(bookingId);
              showToast('Request declined', 'success');
            } catch {
              showToast('Failed to decline request', 'error');
            } finally {
              setActionInFlight(null);
            }
          },
        },
      ]
    );
  };

  // Non-provider users see a prompt to register
  if (!isProvider) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.activationContainer}>
          <Ionicons name="briefcase-outline" size={64} color={theme.icon} style={{ marginBottom: 16 }} />
          <ThemedText type="subtitle" style={styles.activationTitle}>
            Start your business on LaZone
          </ThemedText>
          <ThemedText style={styles.activationSubtitle}>
            Register as a service provider to manage bookings, track earnings, and grow your client base.
          </ThemedText>
          <Button
            label="Become a Provider"
            onPress={() => router.push('/provider/registration')}
            style={styles.activationButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refreshBookings} />
        }
      >
        {/* ── Header ────────────────────────────────────── */}
        <View style={styles.titleRow}>
          <ThemedText type="title" style={styles.title}>Business</ThemedText>
          <TouchableOpacity onPress={() => router.push('/provider/registration?editMode=true')}>
            <Ionicons name="settings-outline" size={24} color={theme.text} />
          </TouchableOpacity>
        </View>

        {/* ── Performance Metrics ────────────────────────── */}
        <View style={styles.metricsGrid}>
          <MetricCard
            icon="eye-outline"
            label="Profile Views"
            value="—"
            theme={theme}
            colorScheme={colorScheme}
          />
          <MetricCard
            icon="cash-outline"
            label="Earnings"
            value={formatPrice(totalEarnings)}
            theme={theme}
            colorScheme={colorScheme}
          />
          <MetricCard
            icon="star-outline"
            label="Avg Rating"
            value="—"
            theme={theme}
            colorScheme={colorScheme}
          />
          <MetricCard
            icon="checkmark-done-outline"
            label="Completed"
            value={String(completedBookings.length)}
            theme={theme}
            colorScheme={colorScheme}
          />
        </View>

        {/* ── Incoming Requests ──────────────────────────── */}
        <SectionHeader
          title="Incoming Requests"
          count={incomingRequests.length}
          theme={theme}
        />
        {incomingRequests.length === 0 ? (
          <ThemedView style={styles.emptyCard}>
            <ThemedText style={styles.emptyText}>No pending requests</ThemedText>
          </ThemedView>
        ) : (
          incomingRequests.map((req) => (
            <TouchableOpacity
              key={req.id}
              activeOpacity={0.7}
              onPress={() => router.push(`/booking/${req.id}?role=provider`)}
            >
            <ThemedView
              style={styles.requestCard}
              lightColor={theme.background}
              darkColor="#1c1c1e"
            >
              <View style={styles.requestHeader}>
                <View style={styles.requestClient}>
                  <View style={styles.avatarPlaceholder}>
                    <Ionicons name="person" size={18} color="#fff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText type="defaultSemiBold">{req.requesterName}</ThemedText>
                    <ThemedText style={styles.requestService}>{req.serviceName}</ThemedText>
                  </View>
                  <ThemedText style={styles.timeAgo}>{timeAgo(req.createdAt)}</ThemedText>
                </View>
              </View>
              {req.notes ? (
                <ThemedText style={styles.requestMessage} numberOfLines={2}>
                  "{req.notes}"
                </ThemedText>
              ) : null}
              <View style={styles.requestMeta}>
                <View style={styles.requestDateRow}>
                  <Ionicons name="calendar-outline" size={14} color={theme.icon} />
                  <ThemedText style={styles.requestDateText}>
                    {formatDate(req.bookingDate)} at {formatTime(req.bookingDate)}
                  </ThemedText>
                </View>
                <ThemedText style={styles.requestPrice}>{formatPrice(req.price)}</ThemedText>
              </View>
              <View style={styles.requestActions}>
                <TouchableOpacity
                  style={styles.declineButton}
                  onPress={() => handleDecline(req.id, req.requesterName)}
                  disabled={actionInFlight === req.id}
                >
                  {actionInFlight === req.id ? (
                    <ActivityIndicator size="small" color={theme.text} />
                  ) : (
                    <ThemedText style={styles.declineText}>Decline</ThemedText>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.acceptButton}
                  onPress={() => handleAccept(req.id)}
                  disabled={actionInFlight === req.id}
                >
                  {actionInFlight === req.id ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <ThemedText style={styles.acceptText}>Accept</ThemedText>
                  )}
                </TouchableOpacity>
              </View>
            </ThemedView>
            </TouchableOpacity>
          ))
        )}

        {/* ── Upcoming Bookings ──────────────────────────── */}
        <SectionHeader
          title="Upcoming Bookings"
          count={upcomingBookings.length}
          theme={theme}
        />
        {upcomingBookings.length === 0 ? (
          <ThemedView style={styles.emptyCard}>
            <ThemedText style={styles.emptyText}>No upcoming bookings</ThemedText>
          </ThemedView>
        ) : (
          upcomingBookings.map((booking) => (
            <TouchableOpacity
              key={booking.id}
              activeOpacity={0.7}
              onPress={() => router.push(`/booking/${booking.id}?role=provider`)}
            >
            <ThemedView
              style={styles.bookingCard}
              lightColor={theme.background}
              darkColor="#1c1c1e"
            >
              <View style={styles.bookingRow}>
                <View style={{ flex: 1 }}>
                  <ThemedText type="defaultSemiBold">{booking.requesterName}</ThemedText>
                  <ThemedText style={styles.bookingService}>{booking.serviceName}</ThemedText>
                  <View style={styles.bookingDateRow}>
                    <Ionicons name="calendar-outline" size={14} color={theme.icon} />
                    <ThemedText style={styles.bookingDateText}>
                      {formatDate(booking.bookingDate)} at {formatTime(booking.bookingDate)}
                    </ThemedText>
                  </View>
                </View>
                <View style={styles.bookingRight}>
                  <ThemedText type="defaultSemiBold" style={styles.bookingPrice}>
                    {formatPrice(booking.price)}
                  </ThemedText>
                  <View style={styles.confirmedBadge}>
                    <ThemedText style={styles.confirmedText}>
                      {booking.status === 'in_progress' ? 'In Progress' : 'Confirmed'}
                    </ThemedText>
                  </View>
              </View>
            </View>
          </ThemedView>
          </TouchableOpacity>
          ))
        )}

        {/* ── Recent Earnings ────────────────────────────── */}
        <SectionHeader title="Recent Earnings" theme={theme} />
        {completedBookings.length === 0 ? (
          <ThemedView style={styles.emptyCard}>
            <ThemedText style={styles.emptyText}>No completed bookings yet</ThemedText>
          </ThemedView>
        ) : (
          <ThemedView
            style={styles.earningsCard}
            lightColor={theme.background}
            darkColor="#1c1c1e"
          >
            {completedBookings.map((booking, index) => (
              <TouchableOpacity
                key={booking.id}
                activeOpacity={0.7}
                onPress={() => router.push(`/booking/${booking.id}?role=provider`)}
              >
                <View style={styles.earningRow}>
                  <View style={{ flex: 1 }}>
                    <ThemedText type="defaultSemiBold">{booking.serviceName}</ThemedText>
                    <ThemedText style={styles.earningClient}>{booking.requesterName}</ThemedText>
                  </View>
                  <View style={styles.earningRight}>
                    <ThemedText type="defaultSemiBold" style={styles.earningAmount}>
                      {formatPrice(booking.price)}
                    </ThemedText>
                    <ThemedText style={styles.earningDate}>{formatDate(booking.bookingDate)}</ThemedText>
                  </View>
                </View>
                {index < completedBookings.length - 1 && <View style={styles.divider} />}
              </TouchableOpacity>
            ))}
          </ThemedView>
        )}

        {/* ── Quick Actions ──────────────────────────────── */}
        <SectionHeader title="Manage" theme={theme} />
        <View style={styles.quickActionsGrid}>
          <QuickActionCard
            icon="images-outline"
            label="Portfolio"
            onPress={() => router.push('/provider/registration?editMode=true')}
            theme={theme}
            colorScheme={colorScheme}
          />
          <QuickActionCard
            icon="pricetags-outline"
            label="Services & Pricing"
            onPress={() => router.push('/provider/registration?editMode=true')}
            theme={theme}
            colorScheme={colorScheme}
          />
          <QuickActionCard
            icon="star-outline"
            label="Reviews"
            onPress={() => router.push('/provider/reviews')}
            theme={theme}
            colorScheme={colorScheme}
          />
          <QuickActionCard
            icon="person-outline"
            label="Public Profile"
            onPress={() => router.push('/provider/preview')}
            theme={theme}
            colorScheme={colorScheme}
          />
        </View>

        {/* Bottom spacing for tab bar */}
        <View style={{ height: 32 }} />
      </ScrollView>

      {/* ── Toast notifications ──────────────────────── */}
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onDismiss={hideToast}
      />
    </SafeAreaView>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function MetricCard({
  icon,
  label,
  value,
  theme,
  colorScheme,
}: {
  icon: string;
  label: string;
  value: string;
  theme: any;
  colorScheme: string | null | undefined;
}) {
  return (
    <View
      style={[
        metricStyles.card,
        { backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : theme.background },
      ]}
    >
      <Ionicons name={icon as any} size={22} color="#0A58A5" style={metricStyles.icon} />
      <ThemedText type="defaultSemiBold" style={metricStyles.value}>
        {value}
      </ThemedText>
      <ThemedText style={metricStyles.label}>{label}</ThemedText>
    </View>
  );
}

const metricStyles = StyleSheet.create({
  card: {
    width: '48%',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  icon: { marginBottom: 8 },
  value: { fontSize: 18, marginBottom: 2 },
  label: { fontSize: 13, opacity: 0.6 },
});

function SectionHeader({
  title,
  count,
  theme,
}: {
  title: string;
  count?: number;
  theme: any;
}) {
  return (
    <View style={sectionHeaderStyles.row}>
      <ThemedText type="subtitle" style={sectionHeaderStyles.title}>
        {title}
      </ThemedText>
      {count !== undefined && (
        <View style={sectionHeaderStyles.badge}>
          <ThemedText style={sectionHeaderStyles.badgeText}>{count}</ThemedText>
        </View>
      )}
    </View>
  );
}

const sectionHeaderStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 12,
  },
  title: { flex: 1 },
  badge: {
    backgroundColor: '#0A58A5',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 2,
    minWidth: 26,
    alignItems: 'center',
  },
  badgeText: { color: '#fff', fontSize: 13, fontWeight: '600' },
});

function QuickActionCard({
  icon,
  label,
  onPress,
  theme,
  colorScheme,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  theme: any;
  colorScheme: string | null | undefined;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        quickActionStyles.card,
        { backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : theme.background },
      ]}
    >
      <Ionicons name={icon as any} size={26} color="#0A58A5" style={quickActionStyles.icon} />
      <ThemedText style={quickActionStyles.label}>{label}</ThemedText>
    </TouchableOpacity>
  );
}

const quickActionStyles = StyleSheet.create({
  card: {
    width: '48%',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 90,
  },
  icon: { marginBottom: 8 },
  label: { fontSize: 14, textAlign: 'center' },
});

// ─── Styles ──────────────────────────────────────────────────────────────────

function createStyles(theme: any, colorScheme: 'dark' | 'light' | null | undefined) {
  const cardBorder = colorScheme === 'dark' ? '#333' : '#e0e0e0';

  return StyleSheet.create({
    container: {
      flex: 1,
    },
    scrollContent: {
      padding: 16,
    },
    titleRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 12,
      marginBottom: 4,
    },
    title: {
      fontSize: 28,
    },

    // ── Activation (non-provider) ──
    activationContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 32,
    },
    activationTitle: {
      textAlign: 'center',
      marginBottom: 12,
    },
    activationSubtitle: {
      textAlign: 'center',
      opacity: 0.6,
      marginBottom: 24,
      lineHeight: 22,
    },
    activationButton: {
      paddingHorizontal: 32,
    },

    // ── Metric grid ──
    metricsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      marginTop: 16,
    },

    // ── Request cards ──
    requestCard: {
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: cardBorder,
    },
    requestHeader: {
      marginBottom: 8,
    },
    requestClient: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    avatarPlaceholder: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: '#0A58A5',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },
    requestService: {
      fontSize: 13,
      opacity: 0.6,
    },
    timeAgo: {
      fontSize: 12,
      opacity: 0.5,
    },
    requestMessage: {
      fontSize: 14,
      fontStyle: 'italic',
      opacity: 0.7,
      marginBottom: 10,
    },
    requestMeta: {
      marginBottom: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    requestDateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    requestDateText: {
      fontSize: 13,
      opacity: 0.6,
    },
    requestPrice: {
      fontSize: 14,
      fontWeight: '600',
      color: '#0A58A5',
    },
    requestActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 10,
    },
    declineButton: {
      borderWidth: 1,
      borderColor: cardBorder,
      borderRadius: 8,
      paddingVertical: 8,
      paddingHorizontal: 20,
    },
    declineText: {
      fontSize: 14,
      fontWeight: '500',
    },
    acceptButton: {
      backgroundColor: '#0A58A5',
      borderRadius: 8,
      paddingVertical: 8,
      paddingHorizontal: 20,
    },
    acceptText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '600',
    },

    // ── Booking cards ──
    bookingCard: {
      borderRadius: 12,
      padding: 16,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: cardBorder,
    },
    bookingRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    bookingService: {
      fontSize: 13,
      opacity: 0.6,
      marginTop: 2,
    },
    bookingDateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 6,
    },
    bookingDateText: {
      fontSize: 13,
      opacity: 0.6,
    },
    bookingRight: {
      alignItems: 'flex-end',
    },
    bookingPrice: {
      fontSize: 14,
      color: '#0A58A5',
    },
    confirmedBadge: {
      backgroundColor: '#e6f4ea',
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 3,
      marginTop: 6,
    },
    confirmedText: {
      color: '#1a7f37',
      fontSize: 12,
      fontWeight: '600',
    },

    // ── Earnings ──
    earningsCard: {
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: cardBorder,
    },
    earningRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
    },
    earningClient: {
      fontSize: 13,
      opacity: 0.5,
      marginTop: 2,
    },
    earningRight: {
      alignItems: 'flex-end',
    },
    earningAmount: {
      fontSize: 14,
      color: '#1a7f37',
    },
    earningDate: {
      fontSize: 12,
      opacity: 0.5,
      marginTop: 2,
    },
    divider: {
      height: 0.5,
      backgroundColor: colorScheme === 'dark' ? '#444' : '#E0E0E0',
    },

    // ── Quick actions ──
    quickActionsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },

    // ── Empty state ──
    emptyCard: {
      borderRadius: 12,
      padding: 24,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: cardBorder,
    },
    emptyText: {
      opacity: 0.5,
    },
  });
}
