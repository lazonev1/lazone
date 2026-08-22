import { View, StyleSheet, ScrollView, Appearance, Alert, ActivityIndicator, Pressable } from 'react-native';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useBookingDetail } from '@/hooks/useBookings';
import * as bookingRepo from '@/repositories/bookingRepository';
import * as messageRepository from '@/repositories/messageRepository';
import { Button } from '@lazone/ui';
import { Ionicons } from '@expo/vector-icons';
import { getStatusColor, getStatusLabel } from '@/components/booking/BookingStatus';
import { BookingStatus, BookingStatusEvent, BookingViewModel } from '@/types/booking';
import { useEffect, useCallback, useState } from 'react';
import { Colors } from '@/constants/Colors';
import Toast from '@/components/ui/Toast';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/contexts/auth';
import { TextBox } from '@/components/ui/TextBox';
import { useTranslation } from 'react-i18next';

function formatStatus(status: BookingStatus): string {
  return getStatusLabel(status);
}

function statusEventLabelKey(event: BookingStatusEvent) {
  if (event.toStatus === 'confirmed') return 'details.timelineEvents.accepted' as const;
  if (event.toStatus === 'in_progress') {
    return event.fromStatus === 'awaiting_confirmation'
      ? ('details.timelineEvents.workResumed' as const)
      : ('details.timelineEvents.started' as const);
  }
  if (event.toStatus === 'awaiting_confirmation') return 'details.timelineEvents.completionSubmitted' as const;
  if (event.toStatus === 'completed') return 'details.timelineEvents.completed' as const;
  return event.actorRole === 'provider'
    ? ('details.timelineEvents.declined' as const)
    : ('details.timelineEvents.cancelled' as const);
}

export default function BookingDetailsScreen() {
  const { id } = useLocalSearchParams();
  const bookingId = id?.toString();
  const {
    booking,
    isLoading,
    cancelBooking,
    startBooking,
    updateChecklist,
    submitForConfirmation,
    confirmCompletion,
    requestChanges,
    refreshBooking,
  } = useBookingDetail(bookingId);
  const { toast, showToast, hideToast } = useToast();
  const { t, i18n } = useTranslation(['booking', 'common']);
  const dateLocale = i18n.language === 'fr' ? 'fr-FR' : 'en-US';
  const [actionInFlight, setActionInFlight] = useState(false);
  const [changeRequest, setChangeRequest] = useState('');
  const colorScheme = Appearance.getColorScheme() || 'light';
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const { user } = useAuth();
  const isProvider = booking?.providerId === user?.uid;

  const handleMessage = async (otherUserId: string, otherUserName: string, otherUserAvatar?: string) => {
    if (!user?.uid) return;
    try {
      const conversationId = await messageRepository.findOrCreateConversation(user.uid, otherUserId);
      router.push({
        pathname: '/messages/[id]',
        params: {
          id: conversationId,
          name: otherUserName,
          avatar: otherUserAvatar ?? '',
        },
      });
    } catch (err) {
      console.error('Failed to open conversation:', err);
      showToast(t('details.toasts.conversationFailed'), 'error');
    }
  };

  const navigation = useNavigation();
  useEffect(() => {
    navigation.setOptions({ title: t('details.title') });
  }, [navigation, t]);

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
      if (isNaN(date.getTime())) return t('details.dateNotSet');
      return date.toLocaleDateString(dateLocale, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return t('details.invalidDate');
    }
  };

  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      return date.toLocaleTimeString(dateLocale, {
        hour: 'numeric',
        minute: '2-digit',
        hour12: i18n.language !== 'fr',
      });
    } catch {
      return '';
    }
  };

  const handleCancelBooking = () => {
    Alert.alert(
      t('details.alerts.cancelTitle'),
      t('details.alerts.cancelMessage'),
      [
        { text: t('details.alerts.keepBooking'), style: 'cancel' },
        {
          text: t('details.actions.cancelBooking'),
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelBooking();
              showToast(t('details.toasts.cancelled'), 'success');
            } catch {
              showToast(t('details.toasts.cancelFailed'), 'error');
            }
          },
        },
      ]
    );
  };

  const handleEditBooking = (b: BookingViewModel) => {
    if (b.status !== 'pending') {
      Alert.alert(t('details.alerts.cannotEditTitle'), t('details.alerts.cannotEditMessage'));
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
        checklist: JSON.stringify(b.checklist.map((item) => item.description)),
      },
    });
  };

  const handleAcceptBooking = async () => {
    if (!bookingId) return;
    setActionInFlight(true);
    try {
      await bookingRepo.confirmBooking(bookingId);
      showToast(t('details.toasts.accepted'), 'success');
      refreshBooking();
    } catch {
      showToast(t('details.toasts.acceptFailed'), 'error');
    } finally {
      setActionInFlight(false);
    }
  };

  const handleDeclineBooking = () => {
    if (!bookingId || !booking) return;
    Alert.alert(
      t('details.alerts.declineTitle'),
      t('details.alerts.declineMessage', { name: booking.requesterName }),
      [
        { text: t('common:actions.cancel'), style: 'cancel' },
        {
          text: t('details.actions.decline'),
          style: 'destructive',
          onPress: async () => {
            setActionInFlight(true);
            try {
              await bookingRepo.declineBooking(bookingId);
              showToast(t('details.toasts.declined'), 'success');
              refreshBooking();
            } catch {
              showToast(t('details.toasts.declineFailed'), 'error');
            } finally {
              setActionInFlight(false);
            }
          },
        },
      ]
    );
  };

  const handleProviderStatusChange = (
    nextStatus: 'in_progress' | 'awaiting_confirmation' | 'completed',
    title: string,
    message: string,
    successMessage: string
  ) => {
    if (!bookingId) return;

    Alert.alert(title, message, [
      { text: t('common:actions.cancel'), style: 'cancel' },
      {
        text: t('common:actions.confirm'),
        onPress: async () => {
          setActionInFlight(true);
          try {
            if (nextStatus === 'in_progress') await startBooking();
            else if (nextStatus === 'awaiting_confirmation') await submitForConfirmation();
            else await confirmCompletion();
            showToast(successMessage, 'success');
            await refreshBooking();
          } catch {
            showToast(t('details.toasts.statusUpdateFailed'), 'error');
          } finally {
            setActionInFlight(false);
          }
        },
      },
    ]);
  };

  const toggleChecklistItem = async (itemId: string) => {
    if (!booking) return;
    try {
      await updateChecklist(booking.checklist.map((item) => item.id === itemId ? { ...item, completed: !item.completed } : item));
    } catch (error) { showToast(error instanceof Error ? error.message : t('details.toasts.checklistUpdateFailed'), 'error'); }
  };

  const handleConfirmCompletion = () => Alert.alert(t('details.alerts.confirmCompletionTitle'), t('details.alerts.confirmCompletionMessage'), [
    { text: t('details.alerts.notYet'), style: 'cancel' },
    { text: t('common:actions.confirm'), onPress: async () => { setActionInFlight(true); try { await confirmCompletion(); showToast(t('details.toasts.completionConfirmed'), 'success'); await refreshBooking(); } catch (error) { showToast(error instanceof Error ? error.message : t('details.toasts.completionFailed'), 'error'); } finally { setActionInFlight(false); } } },
  ]);

  const handleRequestChanges = async () => {
    const reason = changeRequest.trim();
    if (!reason) { showToast(t('details.toasts.describeChanges'), 'error'); return; }
    setActionInFlight(true);
    try { await requestChanges(reason); setChangeRequest(''); showToast(t('details.toasts.changesRequested'), 'success'); }
    catch (error) { showToast(error instanceof Error ? error.message : t('details.toasts.changeRequestFailed'), 'error'); }
    finally { setActionInFlight(false); }
  };

  // Loading state
  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={theme.tint} />
        <ThemedText style={styles.loadingText}>{t('details.loading')}</ThemedText>
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Ionicons name="alert-circle-outline" size={64} color={theme.icon} />
        <ThemedText style={styles.loadingText}>{t('details.notFound')}</ThemedText>
        <Button label={t('details.goBack')} onPress={() => router.back()} variant="primary" size="small" style={{ marginTop: 16 }} />
      </View>
    );
  }

  const statusColor = getStatusColor(booking.status);

  const renderActionButtons = () => {
    if (isProvider) {
      return (
        <View style={styles.bottomButtons}>
          {booking.status === 'pending' && (
            <>
              <Button
                label={actionInFlight ? t('details.actions.accepting') : t('details.actions.acceptBooking')}
                onPress={handleAcceptBooking}
                variant="success"
                style={styles.actionButton}
                disabled={actionInFlight}
              />
              <Button
                label={actionInFlight ? t('details.actions.declining') : t('details.actions.decline')}
                onPress={handleDeclineBooking}
                variant="secondary"
                style={styles.cancelButton}
                disabled={actionInFlight}
              />
            </>
          )}
          {booking.status === 'confirmed' && (
            <Button
              label={actionInFlight ? t('details.actions.starting') : t('details.actions.startService')}
              onPress={() => handleProviderStatusChange(
                'in_progress',
                t('details.alerts.startTitle'),
                t('details.alerts.startMessage'),
                t('details.toasts.serviceInProgress')
              )}
              variant="primary"
              style={styles.actionButton}
              disabled={actionInFlight}
            />
          )}
          {booking.status === 'in_progress' && (
            <Button label={actionInFlight ? t('details.actions.submitting') : t('details.actions.submitForConfirmation')} onPress={() => handleProviderStatusChange('awaiting_confirmation', t('details.alerts.submitTitle'), t('details.alerts.submitMessage'), t('details.toasts.workSubmitted'))} variant="success" style={styles.actionButton} disabled={actionInFlight} />
          )}
          {booking.status === 'awaiting_confirmation' && (
            <ThemedText style={styles.pendingNotice}>{t('details.notices.awaitingRequesterReview')}</ThemedText>
          )}
        </View>
      );
    }

    return (
      <View style={styles.bottomButtons}>
        {booking.status === 'pending' && (
          <Button
            label={t('details.actions.editBooking')}
            onPress={() => handleEditBooking(booking)}
            variant="primary"
            style={styles.actionButton}
          />
        )}
        {(booking.status === 'pending' || booking.status === 'confirmed') && (
          <Button
            label={t('details.actions.cancelBooking')}
            onPress={handleCancelBooking}
            variant="secondary"
            style={styles.cancelButton}
          />
        )}
        {booking.status === 'awaiting_confirmation' && (
          <View style={styles.reviewActions}>
            <ThemedText style={styles.reviewNotice}>{t('details.notices.providerSubmitted')}</ThemedText>
            <Button label={t('details.actions.confirmWorkCompleted')} onPress={handleConfirmCompletion} variant="success" style={styles.actionButton} disabled={actionInFlight} />
            <TextBox label={t('details.changeRequest.label')} value={changeRequest} onChangeText={setChangeRequest} multiline numberOfLines={3} placeholder={t('details.changeRequest.placeholder')} />
            <Button label={actionInFlight ? t('details.actions.sending') : t('details.actions.requestChanges')} onPress={handleRequestChanges} variant="secondary" style={styles.cancelButton} disabled={actionInFlight || !changeRequest.trim()} />
          </View>
        )}
        {booking.status === 'completed' && (
          <Button
            label={t('details.actions.leaveReview')}
            onPress={() => router.push({ pathname: '/booking/review', params: { bookingId: booking.id } })}
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
            {t('details.banner', { status: formatStatus(booking.status) })}
          </ThemedText>
          <ThemedText style={styles.bookingRef}>{t('details.ref', { ref: booking.id.slice(0, 8) })}</ThemedText>
        </View>

        {/* Booking Details */}
        <View style={styles.section}>
          <ThemedText type="subtitle">{t('details.title')}</ThemedText>
          <ThemedView style={[styles.card, { backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#f5f5f5' }]}>
            <View style={styles.detailRow}>
              <Ionicons name="construct" size={20} color={theme.text} />
              <View style={styles.detailContent}>
                <ThemedText style={styles.detailLabel}>{t('details.service')}</ThemedText>
                <ThemedText style={styles.detailValue}>{booking.serviceName}</ThemedText>
              </View>
            </View>

            <View style={styles.detailRow}>
              <Ionicons name="cash" size={20} color={theme.text} />
              <View style={styles.detailContent}>
                <ThemedText style={styles.detailLabel}>{t('details.price')}</ThemedText>
                <ThemedText style={styles.detailValue}>{booking.price.toLocaleString()} CFA</ThemedText>
              </View>
            </View>

            <View style={styles.detailRow}>
              <Ionicons name="time" size={20} color={theme.text} />
              <View style={styles.detailContent}>
                <ThemedText style={styles.detailLabel}>{t('details.dateTime')}</ThemedText>
                <ThemedText style={styles.detailValue}>{formatDate(booking.bookingDate)}</ThemedText>
                <ThemedText style={styles.detailSubvalue}>{formatTime(booking.bookingDate)}</ThemedText>
              </View>
            </View>
          </ThemedView>
        </View>

        {/* Person Section — Provider sees client info, Requester sees provider info */}
        <View style={styles.section}>
          <ThemedText type="subtitle">
            {isProvider ? t('details.clientInformation') : t('details.providerInformation')}
          </ThemedText>
          <ThemedView style={[styles.card, { backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#f5f5f5' }]}>
            <View style={styles.providerInfo}>
              <Ionicons name="person-circle-outline" size={40} color="#666" />
              <ThemedText style={styles.providerName}>
                {isProvider ? booking.requesterName : booking.providerName}
              </ThemedText>
            </View>
            {!isProvider && (
              <View style={styles.buttonContainer}>
                <Button
                  label={t('details.viewProfile')}
                  onPress={() => router.push(`/provider/${booking.providerId}`)}
                  variant="primary"
                  size="small"
                  style={styles.providerButton}
                />
                <Button
                  label={t('details.message')}
                  onPress={() => handleMessage(booking.providerId, booking.providerName, booking.providerAvatar)}
                  variant="primary"
                  size="small"
                  style={styles.providerButton}
                />
              </View>
            )}
            {isProvider && (booking.status === 'confirmed' || booking.status === 'in_progress' || booking.status === 'awaiting_confirmation' || booking.status === 'completed') && (
              <View style={styles.buttonContainer}>
                <Button
                  label={t('details.message')}
                  onPress={() => handleMessage(booking.requesterId, booking.requesterName)}
                  variant="primary"
                  size="small"
                  style={styles.providerButton}
                />
              </View>
            )}
          </ThemedView>
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <ThemedText type="subtitle">{t('details.requestChecklist')}</ThemedText>
          <ThemedView style={[styles.card, { backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#f5f5f5' }]}>
            {booking.status === 'awaiting_confirmation' && !isProvider && <ThemedText style={styles.confirmedNotice}>{t('details.reviewChecklistNotice')}</ThemedText>}
            {booking.checklist.map((item) => (
              <Pressable key={item.id} style={styles.checklistItem} disabled={!isProvider || booking.status !== 'in_progress'} onPress={() => toggleChecklistItem(item.id)}>
                <Ionicons name={item.completed ? 'checkbox' : 'square-outline'} size={22} color={item.completed ? '#4CAF50' : theme.icon} />
                <ThemedText style={[styles.checklistText, item.completed && styles.completedText]}>{item.description}</ThemedText>
              </Pressable>
            ))}
            {booking.requesterChangeRequest && <ThemedText style={styles.changeNotice}>{t('details.changesRequested', { reason: booking.requesterChangeRequest })}</ThemedText>}
          </ThemedView>
        </View>

        {booking.notes && (
          <View style={styles.section}>
            <ThemedText type="subtitle">{t('details.additionalDetails')}</ThemedText>
            <ThemedView style={[styles.card, { backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#f5f5f5' }]}>
              <ThemedText style={styles.notesText}>{booking.notes}</ThemedText>
            </ThemedView>
          </View>
        )}

        {/* Timeline */}
        <View style={styles.section}>
          <ThemedText type="subtitle">{t('details.timelineTitle')}</ThemedText>
          {booking.timelineUnavailable && (
            <ThemedText style={styles.timelineNotice}>
              {t('details.timelineUnavailable')}
            </ThemedText>
          )}
          <ThemedView
            style={[styles.card, { backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#f5f5f5' }]}
          >
            <View style={styles.timeline}>
              <View style={styles.timelineItem}>
                <View style={[styles.timelineDot, { backgroundColor: '#4CAF50' }]} />
                <View style={styles.timelineContent}>
                  <ThemedText style={styles.timelineTitle}>{t('details.created')}</ThemedText>
                  <ThemedText style={styles.timelineDate}>
                    {formatDate(booking.createdAt)} {formatTime(booking.createdAt)}
                  </ThemedText>
                </View>
              </View>
              {booking.statusHistory.length > 0 ? (
                booking.statusHistory.map((event) => (
                  <View key={event.id} style={styles.timelineItem}>
                    <View style={[styles.timelineDot, { backgroundColor: getStatusColor(event.toStatus) }]} />
                    <View style={styles.timelineContent}>
                      <ThemedText style={styles.timelineTitle}>{t(statusEventLabelKey(event))}</ThemedText>
                      <ThemedText style={styles.timelineDate}>
                        {formatDate(event.occurredAt)} {formatTime(event.occurredAt)}
                      </ThemedText>
                    </View>
                  </View>
                ))
              ) : booking.status !== 'pending' && booking.updatedAt ? (
                <View style={styles.timelineItem}>
                  <View style={[styles.timelineDot, { backgroundColor: statusColor }]} />
                  <View style={styles.timelineContent}>
                    <ThemedText style={styles.timelineTitle}>
                      {t('details.currentStatus', { status: formatStatus(booking.status) })}
                    </ThemedText>
                    <ThemedText style={styles.timelineDate}>
                      {formatDate(booking.updatedAt)} {formatTime(booking.updatedAt)}
                    </ThemedText>
                  </View>
                </View>
              ) : null}
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
  timelineNotice: {
    marginTop: 6,
    marginBottom: 10,
    color: '#B26A00',
  },
  bottomButtons: {
    marginTop: 8,
    gap: 12,
  },
  actionButton: {},
  cancelButton: {
    backgroundColor: '#FF9900',
  },
  checklistItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  checklistText: { flex: 1 },
  completedText: { textDecorationLine: 'line-through', opacity: 0.65 },
  pendingNotice: { textAlign: 'center', opacity: 0.7, padding: 8 },
  confirmedNotice: { color: '#2E7D32', marginTop: 8, fontWeight: '600' },
  changeNotice: { color: '#B26A00', marginTop: 8 },
  reviewActions: { gap: 12, marginTop: 8 },
  reviewNotice: { opacity: 0.75, lineHeight: 20 },
});
