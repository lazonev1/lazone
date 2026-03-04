import { View, StyleSheet, ScrollView, Appearance, Alert, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useBookingDetail } from '@/hooks/useBookings';
import { Button } from '@lazone/ui';
import { Ionicons } from '@expo/vector-icons';
import { getStatusColor } from '@/components/booking/BookingStatus';
import { BookingStatus, BookingViewModel } from '@/types/booking';
import { useEffect, useCallback } from 'react';
import { Colors } from '@/constants/Colors';
import Toast from '@/components/ui/Toast';
import { useToast } from '@/hooks/useToast';

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatStatus(status: BookingStatus): string {
  if (status === 'in_progress') return 'In Progress';
  return capitalize(status);
}

export default function BookingDetailsScreen() {
  const { id } = useLocalSearchParams();
  const bookingId = id?.toString();
  const { booking, isLoading, cancelBooking, refreshBooking } = useBookingDetail(bookingId);
  const { toast, showToast, hideToast } = useToast();
  const colorScheme = Appearance.getColorScheme() || 'light';
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;

  const navigation = useNavigation();
  useEffect(() => {
    navigation.setOptions({ title: 'Booking Details' });
  }, [navigation]);

  // Re-fetch booking data when screen regains focus (e.g., after editing)
  useFocusEffect(
    useCallback(() => {
      if (bookingId) {
        refreshBooking();
      }
    }, [bookingId, refreshBooking])
  );

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Date not set';
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return 'Invalid date';
    }
  };

  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return '';
    }
  };

  const handleCancelBooking = () => {
    Alert.alert(
      'Cancel Booking',
      'Are you sure you want to cancel this booking? This cannot be undone.',
      [
        { text: 'Keep Booking', style: 'cancel' },
        {
          text: 'Cancel Booking',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelBooking();
              showToast('Booking cancelled', 'success');
            } catch {
              showToast('Failed to cancel booking', 'error');
            }
          },
        },
      ]
    );
  };

  const handleEditBooking = (b: BookingViewModel) => {
    if (b.status !== 'pending') {
      Alert.alert('Cannot Edit', 'Only pending bookings can be modified.');
      return;
    }

    router.push({
      pathname: '/booking/edit',
      params: {
        bookingId: b.id,
        providerId: b.providerId,
        currentDate: b.bookingDate,
        currentPrice: String(b.price),
        currentService: b.serviceId,
        description: b.notes || '',
      },
    });
  };

  // Loading state
  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={theme.tint} />
        <ThemedText style={styles.loadingText}>Loading booking...</ThemedText>
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Ionicons name="alert-circle-outline" size={64} color={theme.icon} />
        <ThemedText style={styles.loadingText}>Booking not found</ThemedText>
        <Button label="Go Back" onPress={() => router.back()} variant="primary" size="small" style={{ marginTop: 16 }} />
      </View>
    );
  }

  const statusColor = getStatusColor(booking.status);

  const renderActionButtons = () => {
    return (
      <View style={styles.bottomButtons}>
        {booking.status === 'pending' && (
          <Button
            label="Edit Booking"
            onPress={() => handleEditBooking(booking)}
            variant="primary"
            style={styles.actionButton}
          />
        )}
        {(booking.status === 'pending' || booking.status === 'confirmed') && (
          <Button
            label="Cancel Booking"
            onPress={handleCancelBooking}
            variant="secondary"
            style={styles.cancelButton}
          />
        )}
        {booking.status === 'completed' && (
          <Button
            label="Leave a Review"
            onPress={() => router.push(`/provider/reviews?id=${booking.providerId}`)}
            variant="primary"
            style={styles.actionButton}
          />
        )}
      </View>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.container}>
        {/* Status Banner */}
        <View style={styles.header}>
          <Ionicons name="calendar" size={32} color={statusColor} />
          <ThemedText type="title" style={[styles.headerText, { color: statusColor }]}>
            Booking {formatStatus(booking.status)}
          </ThemedText>
          <ThemedText style={styles.bookingRef}>Ref: #{booking.id.slice(0, 8)}</ThemedText>
        </View>

        {/* Booking Details */}
        <View style={styles.section}>
          <ThemedText type="subtitle">Booking Details</ThemedText>
          <ThemedView style={[styles.card, { backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#f5f5f5' }]}>
            <View style={styles.detailRow}>
              <Ionicons name="construct" size={20} color={theme.text} />
              <View style={styles.detailContent}>
                <ThemedText style={styles.detailLabel}>Service</ThemedText>
                <ThemedText style={styles.detailValue}>{booking.serviceName}</ThemedText>
              </View>
            </View>

            <View style={styles.detailRow}>
              <Ionicons name="cash" size={20} color={theme.text} />
              <View style={styles.detailContent}>
                <ThemedText style={styles.detailLabel}>Price</ThemedText>
                <ThemedText style={styles.detailValue}>{booking.price.toLocaleString()} CFA</ThemedText>
              </View>
            </View>

            <View style={styles.detailRow}>
              <Ionicons name="time" size={20} color={theme.text} />
              <View style={styles.detailContent}>
                <ThemedText style={styles.detailLabel}>Date & Time</ThemedText>
                <ThemedText style={styles.detailValue}>{formatDate(booking.bookingDate)}</ThemedText>
                <ThemedText style={styles.detailSubvalue}>{formatTime(booking.bookingDate)}</ThemedText>
              </View>
            </View>
          </ThemedView>
        </View>

        {/* Provider Section */}
        <View style={styles.section}>
          <ThemedText type="subtitle">Provider Information</ThemedText>
          <ThemedView style={[styles.card, { backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#f5f5f5' }]}>
            <View style={styles.providerInfo}>
              <Ionicons name="person-circle-outline" size={40} color="#666" />
              <ThemedText style={styles.providerName}>{booking.providerName}</ThemedText>
            </View>
            <View style={styles.buttonContainer}>
              <Button
                label="View Profile"
                onPress={() => router.push(`/provider/${booking.providerId}`)}
                variant="primary"
                size="small"
                style={styles.providerButton}
              />
              <Button
                label="Message"
                onPress={() => {}}
                variant="primary"
                size="small"
                style={styles.providerButton}
              />
            </View>
          </ThemedView>
        </View>

        {/* Notes */}
        {booking.notes && (
          <View style={styles.section}>
            <ThemedText type="subtitle">Additional Details</ThemedText>
            <ThemedView style={[styles.card, { backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#f5f5f5' }]}>
              <ThemedText style={styles.notesText}>{booking.notes}</ThemedText>
            </ThemedView>
          </View>
        )}

        {/* Timeline */}
        <View style={styles.section}>
          <ThemedText type="subtitle">Booking Timeline</ThemedText>
          <ThemedView style={[styles.card, { backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#f5f5f5' }]}>
            <View style={styles.timeline}>
              <View style={styles.timelineItem}>
                <View style={[styles.timelineDot, { backgroundColor: '#4CAF50' }]} />
                <View style={styles.timelineContent}>
                  <ThemedText style={styles.timelineTitle}>Booking Created</ThemedText>
                  <ThemedText style={styles.timelineDate}>
                    {formatDate(booking.createdAt)} {formatTime(booking.createdAt)}
                  </ThemedText>
                </View>
              </View>
              {booking.status !== 'pending' && booking.updatedAt && (
                <View style={styles.timelineItem}>
                  <View style={[styles.timelineDot, { backgroundColor: statusColor }]} />
                  <View style={styles.timelineContent}>
                    <ThemedText style={styles.timelineTitle}>
                      Status Updated to {formatStatus(booking.status)}
                    </ThemedText>
                    <ThemedText style={styles.timelineDate}>
                      {formatDate(booking.updatedAt)} {formatTime(booking.updatedAt)}
                    </ThemedText>
                  </View>
                </View>
              )}
            </View>
          </ThemedView>
        </View>

        {/* Action Buttons */}
        {renderActionButtons()}

        {/* Bottom spacing */}
        <View style={{ height: 40 }} />
      </ScrollView>

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onDismiss={hideToast}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    opacity: 0.7,
  },
  section: {
    marginBottom: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  headerText: {
    marginTop: 10,
  },
  bookingRef: {
    fontSize: 14,
    opacity: 0.7,
    marginTop: 4,
  },
  card: {
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128,128,128,0.2)',
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  detailSubvalue: {
    fontSize: 14,
    opacity: 0.7,
    marginTop: 2,
  },
  providerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  providerName: {
    marginLeft: 12,
    fontSize: 18,
    fontWeight: '600',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  providerButton: {
    flex: 1,
  },
  notesText: {
    fontSize: 14,
    opacity: 0.7,
  },
  timeline: {
    paddingVertical: 8,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
    marginTop: 4,
  },
  timelineContent: {
    flex: 1,
  },
  timelineTitle: {
    fontWeight: '500',
    marginBottom: 4,
  },
  timelineDate: {
    fontSize: 13,
    opacity: 0.7,
  },
  bottomButtons: {
    marginTop: 8,
    gap: 12,
  },
  actionButton: {},
  cancelButton: {
    backgroundColor: '#FF9900',
  },
});
