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
import { Button } from '@lazone/ui';
import { useTranslation } from 'react-i18next';

export default function NewBookingScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { t } = useTranslation(['booking', 'common']);
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
        <Stack.Screen options={{ title: t('new.title') }} />
        <ActivityIndicator size="large" color={theme.tint} />
        <ThemedText style={styles.loadingText}>{t('new.loadingProvider')}</ThemedText>
      </View>
    );
  }

  if (!provider) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.background }]}>
        <Stack.Screen options={{ title: t('new.title') }} />
        <ThemedText>{t('providerNotFound')}</ThemedText>
      </View>
    );
  }

  if (provider.services.length === 0) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.background, padding: 24 }]}>
        <Stack.Screen options={{ title: t('new.unavailableTitle') }} />
        <ThemedText style={styles.unavailableTitle}>{t('new.unavailableTitle')}</ThemedText>
        <ThemedText style={styles.unavailableText}>
          {t('new.unavailableMessage')}
        </ThemedText>
        <Button label={t('new.backToProvider')} onPress={() => router.back()} variant="primary" />
      </View>
    );
  }

  const handleSubmit = async (input: CreateBookingInput) => {
    if (!user || !userProfile) {
      showToast(t('new.signInRequired'), 'error');
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
      const message = error instanceof Error ? error.message : t('errors.createFailed');
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
            title: t('new.bookProvider', { name: provider.name }),
            headerBackTitle: t('common:actions.back'),
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
  unavailableTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  unavailableText: {
    textAlign: 'center',
    opacity: 0.7,
    marginBottom: 20,
    lineHeight: 20,
  },
});
