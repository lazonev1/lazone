import { View, StyleSheet, Alert, TouchableWithoutFeedback, Keyboard, Appearance, ActivityIndicator } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { BookingRequestForm } from '@/components/booking/BookingRequestForm';
import { useProvider } from '@/hooks/useProvider';
import { useBookingDetail } from '@/hooks/useBookings';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { CreateBookingInput } from '@/types/booking';
import Toast from '@/components/ui/Toast';
import { useToast } from '@/hooks/useToast';
import { useState } from 'react';

export default function EditBookingScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const colorScheme = Appearance.getColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;

  const bookingId = params.bookingId as string;
  const providerId = params.providerId as string;

  const { provider, isLoading: providerLoading } = useProvider(providerId);
  const { updateBooking } = useBookingDetail(bookingId);
  const { toast, showToast, hideToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (providerLoading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.background }]}>
        <Stack.Screen options={{ title: 'Edit Booking' }} />
        <ActivityIndicator size="large" color={theme.tint} />
        <ThemedText style={styles.loadingText}>Loading...</ThemedText>
      </View>
    );
  }

  if (!provider) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.background }]}>
        <Stack.Screen options={{ title: 'Edit Booking' }} />
        <ThemedText>Provider not found</ThemedText>
      </View>
    );
  }

  const handleSubmit = (input: CreateBookingInput) => {
    Alert.alert(
      'Confirm Changes',
      'Are you sure you want to modify this booking?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Update',
          onPress: async () => {
            setIsSubmitting(true);
            try {
              await updateBooking({
                serviceId: input.serviceId,
                serviceName: input.serviceName,
                bookingDate: input.bookingDate,
                price: input.price,
                notes: input.notes,
              });
              showToast('Booking updated', 'success');
              // Small delay so the user sees the toast before navigating back
              setTimeout(() => router.back(), 800);
            } catch (error) {
              console.error('[EditBooking] Error updating booking:', error);
              const message = error instanceof Error ? error.message : 'Failed to update booking';
              showToast(message, 'error');
            } finally {
              setIsSubmitting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Stack.Screen
          options={{
            title: 'Edit Booking',
            headerStyle: { backgroundColor: theme.background },
            headerTintColor: theme.text,
          }}
        />
        <BookingRequestForm
          providerId={providerId}
          providerName={provider.name}
          services={provider.services}
          onSubmit={handleSubmit}
          onCancel={() => router.back()}
          isSubmitting={isSubmitting}
          initialValues={{
            serviceId: params.currentService as string,
            scheduledDate: params.currentDate ? new Date(params.currentDate as string) : undefined,
            price: params.currentPrice as string,
            description: params.description as string,
          }}
        />

        <Toast
          visible={toast.visible}
          message={toast.message}
          type={toast.type}
          onDismiss={hideToast}
        />
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
});
