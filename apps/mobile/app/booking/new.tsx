import { View, StyleSheet, TouchableWithoutFeedback, Keyboard, Appearance, ActivityIndicator } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { BookingRequestForm } from '@/components/booking/BookingRequestForm';
import { useProvider } from '@/hooks/useProvider';
import { useBookings } from '@/hooks/useBookings';
import { useAuth } from '@/contexts/auth';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { CreateBookingInput } from '@/types/booking';
import Toast from '@/components/ui/Toast';
import { useToast } from '@/hooks/useToast';
import { useState } from 'react';

export default function NewBookingScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const colorScheme = Appearance.getColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;

  const providerId = params.providerId as string;
  const { provider, isLoading: providerLoading } = useProvider(providerId);
  const { user, userProfile } = useAuth();
  const { createBooking } = useBookings(user?.uid);
  const { toast, showToast, hideToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (providerLoading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.background }]}>
        <Stack.Screen options={{ title: 'Book a Service' }} />
        <ActivityIndicator size="large" color={theme.tint} />
        <ThemedText style={styles.loadingText}>Loading provider...</ThemedText>
      </View>
    );
  }

  if (!provider) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.background }]}>
        <Stack.Screen options={{ title: 'Book a Service' }} />
        <ThemedText>Provider not found</ThemedText>
      </View>
    );
  }

  const handleSubmit = async (input: CreateBookingInput) => {
    if (!user || !userProfile) {
      showToast('Please sign in to book a service', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      const requesterName = `${userProfile.firstName || ''} ${userProfile.lastName || ''}`.trim() || 'User';
      const newBooking = await createBooking(requesterName, input);

      router.replace({
        pathname: '/booking/success',
        params: {
          bookingId: newBooking.id,
          providerId: provider.id,
          providerName: provider.name,
        },
      });
    } catch (error) {
      console.error('[NewBooking] Error creating booking:', error);
      const message = error instanceof Error ? error.message : 'Failed to create booking';
      showToast(message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Stack.Screen
          options={{
            title: `Book ${provider.name}`,
            headerBackTitle: 'Back',
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
