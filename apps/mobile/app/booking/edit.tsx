import { View, StyleSheet, Alert, TouchableWithoutFeedback, Keyboard, Appearance, ActivityIndicator } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Button } from '@lazone/ui';
import { BookingRequestForm } from '@/components/booking/BookingRequestForm';
import { useProvider } from '@/hooks/useProvider';
import { useBookingDetail } from '@/hooks/useBookings';
import { useAuth } from '@/contexts/auth';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { BookingEditError, BookingViewModel, CreateBookingInput } from '@/types/booking';
import { ServiceItem } from '@/types/provider';
import Toast from '@/components/ui/Toast';
import { useToast } from '@/hooks/useToast';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

function getSingleRouteId(value: string | string[] | undefined): string | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  return normalized || undefined;
}

function hasValidEditableData(booking: BookingViewModel): boolean {
  return Boolean(
    booking.providerId
    && booking.serviceId
    && booking.serviceName
    && Number.isFinite(booking.price)
    && !Number.isNaN(new Date(booking.bookingDate).getTime())
    && Array.isArray(booking.checklist)
    && booking.checklist.length > 0
    && booking.checklist.every(item => item.id && item.description?.trim()),
  );
}

export default function EditBookingScreen() {
  const params = useLocalSearchParams<{ bookingId?: string | string[] }>();
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useTranslation(['booking', 'common']);
  const colorScheme = Appearance.getColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const bookingId = getSingleRouteId(params.bookingId);
  const {
    booking,
    isLoading: bookingLoading,
    error: bookingError,
    updateBooking,
    refreshBooking,
  } = useBookingDetail(bookingId);
  const {
    provider,
    isLoading: providerLoading,
    error: providerError,
    refetch: refetchProvider,
  } = useProvider(booking?.providerId);
  const { toast, showToast, hideToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasEditConflict, setHasEditConflict] = useState(false);

  const services = useMemo<ServiceItem[]>(() => {
    if (!booking || !provider) return [];
    if (provider.services.some(service => service.id === booking.serviceId)) return provider.services;
    // Preserve the booking snapshot if the provider later removes that service.
    return [{
      id: booking.serviceId,
      name: booking.serviceName,
      description: '',
      price: String(booking.price),
    }, ...provider.services];
  }, [booking, provider]);

  const renderState = (
    title: string,
    message: string,
    options?: { retry?: () => void; viewBooking?: boolean },
  ) => (
    <View style={[styles.container, styles.centered, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ title: t('edit.title') }} />
      <ThemedText type="subtitle" style={styles.stateTitle}>{title}</ThemedText>
      <ThemedText style={styles.stateMessage}>{message}</ThemedText>
      <View style={styles.stateActions}>
        {options?.retry && (
          <Button label={t('common:actions.retry')} onPress={options.retry} variant="primary" />
        )}
        {options?.viewBooking && bookingId && (
          <Button
            label={t('edit.viewBooking')}
            onPress={() => router.replace(`/booking/${bookingId}`)}
            variant="primary"
          />
        )}
        <Button label={t('common:actions.back')} onPress={() => router.back()} variant="secondary" />
      </View>
    </View>
  );

  if (!bookingId) {
    return renderState(t('edit.invalidLinkTitle'), t('edit.invalidLinkMessage'));
  }

  if (bookingLoading || (booking && providerLoading)) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.background }]}>
        <Stack.Screen options={{ title: t('edit.title') }} />
        <ActivityIndicator size="large" color={theme.tint} />
        <ThemedText style={styles.loadingText}>{t('edit.loading')}</ThemedText>
      </View>
    );
  }

  if (bookingError) {
    return renderState(t('edit.unavailableTitle'), t('edit.unavailableMessage'), { retry: refreshBooking });
  }

  if (!booking) {
    return renderState(t('edit.notFoundTitle'), t('edit.notFoundMessage'));
  }

  if (booking.requesterId !== user?.uid) {
    return renderState(t('edit.unauthorizedTitle'), t('edit.unauthorizedMessage'), { viewBooking: true });
  }

  if (booking.status !== 'pending') {
    return renderState(t('edit.noLongerEditableTitle'), t('edit.noLongerEditableMessage'), { viewBooking: true });
  }

  if (providerError) {
    return renderState(
      t('edit.providerUnavailableTitle'),
      t('edit.providerUnavailableMessage'),
      { retry: refetchProvider },
    );
  }

  if (!provider || !hasValidEditableData(booking)) {
    return renderState(t('edit.invalidDataTitle'), t('edit.invalidDataMessage'), { viewBooking: true });
  }

  const handleSubmit = (input: CreateBookingInput) => {
    Alert.alert(
      t('edit.confirmTitle'),
      t('edit.confirmMessage'),
      [
        { text: t('common:actions.cancel'), style: 'cancel' },
        {
          text: t('edit.update'),
          onPress: async () => {
            setIsSubmitting(true);
            try {
              await updateBooking({
                serviceId: input.serviceId,
                serviceName: input.serviceName,
                bookingDate: input.bookingDate,
                price: input.price,
                notes: input.notes,
                checklist: input.checklist,
              });
              showToast(t('edit.updated'), 'success');
              setTimeout(() => router.back(), 800);
            } catch (error) {
              if (error instanceof BookingEditError && error.code === 'not-pending') {
                setHasEditConflict(true);
              } else if (error instanceof BookingEditError && error.code === 'not-requester') {
                showToast(t('edit.unauthorizedMessage'), 'error');
              } else {
                console.error('[EditBooking] Error updating booking:', error);
                showToast(t('errors.updateFailed'), 'error');
              }
            } finally {
              setIsSubmitting(false);
            }
          },
        },
      ],
    );
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Stack.Screen
          options={{
            title: t('edit.title'),
            headerStyle: { backgroundColor: theme.background },
            headerTintColor: theme.text,
          }}
        />
        {hasEditConflict && (
          <View style={styles.conflictBanner} accessibilityRole="alert">
            <ThemedText type="defaultSemiBold">{t('edit.conflictTitle')}</ThemedText>
            <ThemedText>{t('edit.conflictMessage')}</ThemedText>
            <Button
              label={t('edit.viewBooking')}
              onPress={() => router.replace(`/booking/${bookingId}`)}
              variant="secondary"
            />
          </View>
        )}
        <BookingRequestForm
          providerId={booking.providerId}
          providerName={booking.providerName || provider.name}
          services={services}
          onSubmit={handleSubmit}
          onCancel={() => router.back()}
          isSubmitting={isSubmitting}
          submitLabel={t('edit.update')}
          submitDisabled={hasEditConflict}
          initialValues={{
            serviceId: booking.serviceId,
            scheduledDate: new Date(booking.bookingDate),
            price: String(booking.price),
            description: booking.notes || '',
            checklist: booking.checklist.map(item => item.description),
          }}
        />
        <Toast visible={toast.visible} message={toast.message} type={toast.type} onDismiss={hideToast} />
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { marginTop: 12, fontSize: 16, opacity: 0.7 },
  stateTitle: { textAlign: 'center', marginBottom: 8 },
  stateMessage: { textAlign: 'center', opacity: 0.75, marginBottom: 20 },
  stateActions: { width: '100%', maxWidth: 360, gap: 12 },
  conflictBanner: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    gap: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 149, 0, 0.14)',
  },
});
