import { ActivityIndicator, Appearance, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@lazone/ui';
import { ThemedText } from '@/components/ThemedText';
import { TextBox } from '@/components/ui/TextBox';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/contexts/auth';
import { useBookingDetail } from '@/hooks/useBookings';
import { addReview } from '@/repositories/reviewRepository';
import * as ReviewService from '@/backend/main/src/services/reviewService';
import { useTranslation } from 'react-i18next';

export default function BookingReviewScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId?: string }>();
  const router = useRouter();
  const { t } = useTranslation('booking');
  const { user } = useAuth();
  const { booking, isLoading: bookingLoading } = useBookingDetail(bookingId);
  const colorScheme = Appearance.getColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const scope = useMemo(() => ({ bookingId, uid: user?.uid, attempt }), [bookingId, user?.uid, attempt]);
  const [check, setCheck] = useState<{ scope: typeof scope; result: 'new' | 'reviewed' | 'failed' } | null>(null);
  const submissionPending = useRef(false);
  const canReview = Boolean(
    user?.uid && booking && booking.id === bookingId && booking.requesterId === user.uid && booking.status === 'completed'
  );
  const checkResult = check?.scope === scope ? check.result : null;
  const [submittedScope, setSubmittedScope] = useState<typeof scope | null>(null);
  const submitted = submittedScope === scope;
  useEffect(() => {
    if (!canReview || !scope.bookingId) return;
    let active = true;
    ReviewService.hasBookingBeenReviewed(scope.bookingId)
      .then(reviewed => { if (active) setCheck({ scope, result: reviewed ? 'reviewed' : 'new' }); })
      .catch(() => { if (active) setCheck({ scope, result: 'failed' }); });
    return () => { active = false; };
  }, [scope, canReview]);

  const handleSubmit = async () => {
    if (!booking || !bookingId || !user?.uid || !canReview || submissionPending.current || submitted || checkResult !== 'new') return;
    if (rating < 1) { setError(t('review.selectRating')); return; }
    if (comment.length > 500) { setError(t('review.tooLong')); return; }
    submissionPending.current = true;
    setSubmitting(true);
    setError('');
    try {
      await addReview(booking.providerId, { requesterId: user.uid, rating, comment: comment.trim(), bookingId, serviceId: booking.serviceId });
      setSubmittedScope(scope);
    } catch {
      setError(t('review.submitFailed'));
    } finally {
      submissionPending.current = false;
      setSubmitting(false);
    }
  };

  if (bookingLoading || (canReview && !checkResult)) {
    return <View style={[styles.centered, { backgroundColor: theme.background }]}><ActivityIndicator color={theme.tint} /></View>;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ title: t('review.title'), headerTintColor: theme.text }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {!booking || !canReview ? (
          <>
            <Ionicons name="lock-closed-outline" size={52} color={theme.icon} />
            <ThemedText type="title" style={styles.title}>{t('review.unavailableTitle')}</ThemedText>
            <ThemedText style={styles.centerText}>{t('review.unavailableMessage')}</ThemedText>
          </>
        ) : checkResult === 'failed' ? (
          <>
            <ThemedText accessibilityLiveRegion="polite" style={styles.centerText}>{t('review.checkFailed')}</ThemedText>
            <Button label={t('review.retry')} onPress={() => setAttempt(value => value + 1)} variant="primary" />
          </>
        ) : submitted || checkResult === 'reviewed' ? (
          <>
            <Ionicons name="checkmark-circle" size={64} color="#2E7D32" />
            <ThemedText type="title" style={styles.title}>{t(submitted ? 'review.submittedTitle' : 'review.alreadyReviewed')}</ThemedText>
            {submitted && <ThemedText style={styles.centerText}>{t('review.submittedMessage', { name: booking.providerName })}</ThemedText>}
            <Button label={t('review.seeProviderReviews')} onPress={() => router.push({
              pathname: '/provider/reviews', params: { id: booking.providerId },
            })} variant="primary" />
          </>
        ) : (
          <>
            <ThemedText type="title" style={styles.title}>{t('review.howWasService')}</ThemedText>
            <ThemedText style={styles.subtitle}>{t('review.serviceWith', { service: booking.serviceName, name: booking.providerName })}</ThemedText>
            <View accessibilityRole="radiogroup" style={styles.stars}>
              {[1, 2, 3, 4, 5].map((value) => (
                <TouchableOpacity
                  key={value}
                  accessibilityRole="radio"
                  accessibilityLabel={t('review.starLabel', { count: value })}
                  accessibilityState={{ selected: rating === value }}
                  disabled={submitting}
                  onPress={() => setRating(value)}
                  style={styles.starButton}
                >
                  <Ionicons name={value <= rating ? 'star' : 'star-outline'} size={38} color="#F4B400" />
                </TouchableOpacity>
              ))}
            </View>
            <TextBox
              label={t('review.commentLabel')}
              value={comment}
              onChangeText={setComment}
              multiline
              numberOfLines={5}
              maxLength={500}
              placeholder={t('review.commentPlaceholder')}
              inputStyle={styles.comment}
              editable={!submitting}
            />
            <ThemedText style={styles.counter}>{comment.length}/500</ThemedText>
            {error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}
            <Button label={submitting ? t('review.submitting') : t('review.submitReview')} onPress={handleSubmit} disabled={submitting || rating === 0} variant="primary" style={styles.submit} />
          </>
        )}
        <Button label={t('review.backToBooking')} onPress={() => bookingId ? router.replace(`/booking/${bookingId}`) : router.back()} variant="secondary" style={styles.back} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 24, alignItems: 'center', gap: 14 },
  title: { textAlign: 'center', marginTop: 8 },
  subtitle: { textAlign: 'center', opacity: 0.7, marginBottom: 12 },
  centerText: { textAlign: 'center', opacity: 0.75, lineHeight: 22 },
  stars: { flexDirection: 'row', justifyContent: 'center', marginVertical: 10 },
  starButton: { padding: 5 },
  comment: { minHeight: 120, textAlignVertical: 'top' },
  counter: { alignSelf: 'flex-end', opacity: 0.55, fontSize: 12 },
  error: { color: '#B42318', textAlign: 'center' },
  submit: { width: '100%', marginTop: 8 },
  back: { width: '100%', marginTop: 8 },
});
