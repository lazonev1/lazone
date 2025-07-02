import { View, StyleSheet, ScrollView, Appearance, Alert } from 'react-native';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Bookings } from '@/constants/bookings';
import { Button } from '@lazone/ui';
import { Ionicons } from '@expo/vector-icons';
import { getStatusColor } from '@/components/booking/BookingStatus';
import { capitalize } from '@lazone/ui';
import { Booking, BookingStatus } from '@/types/booking';
import { useEffect } from 'react';
import { Colors } from '@/constants/Colors';

export default function BookingDetailsScreen() {
  const { id } = useLocalSearchParams();
  const booking = Bookings.find(b => b.id === Number(id));
  const colorScheme = Appearance.getColorScheme() || 'light'; // Provide default value
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;

  const navigation = useNavigation();
  useEffect(() => {
    navigation.setOptions({ title: 'Booking Details' });
  }, []);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Date not set';
      }
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return '';
      }
      return date.toLocaleTimeString();
    } catch (error) {
      return '';
    }
  };

  const handleEditBooking = (booking: Booking) => {
    if (booking.status !== 'pending') {
      Alert.alert('Cannot Edit', 'Only pending bookings can be modified.');
      return;
    }

    router.push({
      pathname: '/booking/edit',
      params: {
        bookingId: booking.id,
        providerId: booking.providerId,
        currentDate: booking.scheduledDate,
        currentPrice: booking.price,
        currentService: booking.serviceId,
        description: booking.description || ''
      }
    });
  };

  if (!booking) {
    return <ThemedText>Booking not found</ThemedText>;
  }

  const statusText = `Booking ${capitalize(booking.status)}`;
  const statusColor = getStatusColor(booking.status);

  const renderActionButtons = (booking: Booking) => {
    return (
      <View style={styles.bottomButtons}>
        {booking.status === 'pending' && (
          <Button
            label="Edit Booking"
            onPress={() => handleEditBooking(booking)}
            variant="primary"
            style={styles.editButton}
          />
        )}
        {(booking.status === 'accepted' || booking.status === 'pending') && (
          <Button
            label="Cancel Booking"
            onPress={() => {}}
            variant="secondary"
            style={styles.cancelButton}
          />
        )}
      </View>
    );
  };

  return (
    <ScrollView style={[styles.container]}>
      {/* Status Banner */}
      <View style={styles.header}>
        <Ionicons name="calendar" size={32} color={statusColor} />
        <ThemedText type="title" style={[styles.headerText, { color: statusColor }]}>
          {statusText}
        </ThemedText>
        <ThemedText style={styles.bookingRef}>Ref: #{booking.id}</ThemedText>
      </View>

      {/* Service and Schedule Details */}
      <View style={styles.section}>
        <ThemedText type="subtitle">Booking Details</ThemedText>
        <ThemedView style={[styles.baseCard, styles.card]}>
          <View style={styles.detailRow}>
            <Ionicons name="construct" size={20} color={theme.text} />
            <View style={styles.detailContent}>
              <ThemedText style={[styles.baseText, styles.detailLabel]}>Service</ThemedText>
              <ThemedText style={styles.detailValue}>{booking.serviceName}</ThemedText>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="cash" size={20} color={theme.text} />
            <View style={styles.detailContent}>
              <ThemedText style={[styles.baseText, styles.detailLabel]}>Price</ThemedText>
              <ThemedText style={styles.detailValue}>{booking.price}</ThemedText>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="time" size={20} color={theme.text} />
            <View style={styles.detailContent}>
              <ThemedText style={[styles.baseText, styles.detailLabel]}>Date & Time</ThemedText>
              <ThemedText style={styles.detailValue}>
                {formatDate(booking.scheduledDate)}
              </ThemedText>
              <ThemedText style={[styles.baseText, styles.detailSubvalue]}>
                {formatTime(booking.scheduledDate)}
              </ThemedText>
            </View>
          </View>

          {booking.location && (
            <View style={[styles.detailRow, styles.lastDetailRow]}>
              <Ionicons name="location" size={20} color={theme.text} />
              <View style={styles.detailContent}>
                <ThemedText style={[styles.baseText, styles.detailLabel]}>Location</ThemedText>
                <ThemedText style={styles.detailValue}>{booking.location}</ThemedText>
              </View>
            </View>
          )}
        </ThemedView>
      </View>

      {/* Provider Section */}
      <View style={styles.section}>
        <ThemedText type="subtitle">Provider Information</ThemedText>
        <ThemedView style={[styles.baseCard, styles.providerCard]}>
          <View style={styles.providerInfo}>
            <Ionicons name="person-circle-outline" size={40} color="#666" />
            <ThemedText style={styles.providerName}>{booking.providerName}</ThemedText>
          </View>
          <View style={styles.buttonContainer}>
            <Button
              label="Call"
              onPress={() => {}}
              variant="primary"
              size="small"
              style={styles.button}
            />
            <Button
              label="Message"
              onPress={() => {}}
              variant="primary"
              size="small"
              style={styles.button}
            />
          </View>
        </ThemedView>
      </View>

      {/* Additional Information */}
      {booking.description && (
        <View style={styles.section}>
          <ThemedText type="subtitle">Additional Details</ThemedText>
          <ThemedView style={[styles.baseCard, styles.card]}>
            <ThemedText style={[styles.baseText, styles.description]}>{booking.description}</ThemedText>
          </ThemedView>
        </View>
      )}

      {/* Booking Timeline */}
      <View style={styles.section}>
        <ThemedText type="subtitle">Booking Timeline</ThemedText>
        <ThemedView style={[styles.baseCard, styles.card]}>
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
                    Status Updated to {capitalize(booking.status)}
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
      {renderActionButtons(booking)}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // Layout styles
  container: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },

  // Header styles
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  headerText: {
    color: '#4CAF50',
    marginTop: 10,
  },
  bookingRef: {
    fontSize: 14,
    opacity: 0.7,
    marginTop: 4,
  },

  // Card styles - combine common card properties
  baseCard: {
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
    backgroundColor: Appearance.getColorScheme() === 'dark' ? '#1c1c1e' : '#f5f5f5',
  },


  // Detail row styles
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Appearance.getColorScheme() === 'dark' ? '#333' : '#eee',
  },
  lastDetailRow: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  detailContent: {
    flex: 1,
  },

  // Text styles - combine similar text styles
  baseText: {
    fontSize: 14,
  },
  detailLabel: {
    opacity: 0.7,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  detailSubvalue: {
    opacity: 0.7,
    marginTop: 2,
  },
  description: {
    opacity: 0.7,
  },

  // Provider section styles
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

  // Button styles
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
  },
  bottomButtons: {
    marginTop: 'auto',
    gap: 12,
  },
  cancelButton: {
    backgroundColor: '#FF9900',
  },

  // Timeline styles
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
});
