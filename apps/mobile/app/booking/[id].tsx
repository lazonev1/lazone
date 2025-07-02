import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Bookings } from '@/constants/bookings';
import { Button } from '@lazone/ui';
import { Ionicons } from '@expo/vector-icons';
import { getStatusColor } from '@/components/booking/BookingStatus';
import { capitalize } from '@lazone/ui';
import { Booking, BookingStatus } from '@/types/booking';
import { useEffect } from 'react';

export default function BookingDetailsScreen() {
  const { id } = useLocalSearchParams();
  const booking = Bookings.find(b => b.id === Number(id));

  const navigation = useNavigation();
    useEffect(() => {
      navigation.setOptions({ title: 'Booking Details' });
    }, ['Booking Details']);

  if (!booking) {
    return <ThemedText>Booking not found</ThemedText>;
  }

  const statusText = `Booking ${capitalize(booking.status)}`;
  const statusColor = getStatusColor(booking.status);

  const renderActionButtons = (status: BookingStatus) => {
    return (
      <View style={styles.bottomButtons}>
        {status === 'pending' && (
          <Button
            label="Edit Booking"
            onPress={() => {}}
            variant="primary"
            style={styles.editButton}
          />
        )}
        {(status === 'accepted' || status === 'pending') && (
          <Button
            label="Cancel Appointment"
            onPress={() => {}}
            variant="secondary"
            style={styles.cancelButton}
          />
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="calendar" size={32} color={statusColor} />
        <ThemedText type="title" style={[styles.headerText, { color: statusColor }]}>
          {statusText}
        </ThemedText>
      </View>

      <View style={styles.section}>
        <ThemedText type="subtitle">Appointment Details</ThemedText>
        <ThemedView style={styles.detailsCard}>
          <Ionicons name="time-outline" size={20} color="#666" />
          <ThemedText>{booking.time}</ThemedText>
        </ThemedView>
      </View>

      <View style={styles.section}>
        <ThemedText type="subtitle">Provider Contact Info</ThemedText>
        <ThemedView style={styles.providerCard}>
          <View style={styles.providerInfo}>
            <Ionicons name="person-circle-outline" size={40} color="#666" />
            <ThemedText style={styles.providerName}>{booking.name}</ThemedText>
          </View>
          <View style={styles.contactButtons}>
            <Button
              label="Call"
              onPress={() => {}}
              variant="primary"
              size="small"
              style={styles.contactButton}
            />
            <Button
              label="Message"
              onPress={() => {}}
              variant="primary"
              size="small"
              style={styles.contactButton}
            />
          </View>
        </ThemedView>
      </View>

      {renderActionButtons(booking.status)}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  headerText: {
    color: '#4CAF50',
    marginTop: 10,
  },
  section: {
    marginBottom: 24,
  },
  detailsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
    gap: 10,
  },
  providerCard: {
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
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
  contactButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  contactButton: {
    flex: 1,
  },
  bottomButtons: {
    marginTop: 'auto',
    gap: 12,
  },
  editButton: {
    marginBottom: 8,
  },
  cancelButton: {
    backgroundColor: '#FF9900',
  },
});
