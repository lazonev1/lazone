import { ActivityIndicator, Appearance, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@lazone/ui';
import { ThemedText } from '@/components/ThemedText';
import { TextBox } from '@/components/ui/TextBox';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/contexts/auth';
import { useBookingDetail } from '@/hooks/useBookings';
import { useReviews } from '@/hooks/useReviews';
import * as ReviewService from '@/backend/main/src/services/reviewService';

export default function BookingReviewScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId?: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { booking, isLoading: bookingLoading } = useBookingDetail(bookingId);
  const colorScheme = Appearance.getColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [existingReview, setExistingReview] = useState(false);
  const [checkingReview, setCheckingReview] = useState(true);
  const [error, setError] = useState('');

  const { submitReview } = useReviews(booking?.providerId, user?.uid);

  useEffect(() => {
    let active = true;
    if (!bookingId) { setCheckingReview(false); return () => { active = false; }; }
    ReviewService.getReviewByBookingId(bookingId)
      .then((review) => { if (active) setExistingReview(Boolean(review)); })
      .catch(() => { if (active) setError('We could not check this booking yet. Please try again.'); })
      .finally(() => { if (active) setCheckingReview(false); });
    return () => { active = false; };
  }, [bookingId]);

  const canReview = Boolean(
    user?.uid && booking && booking.requesterId === user.uid && booking.status === 'completed'
  );

  const handleSubmit = async () => {
    if (!booking || !bookingId || !canReview) return;
    if (rating < 1) { setError('Select a rating to continue.'); return; }
    if (comment.length > 500) { setError('Keep your review to 500 characters or fewer.'); return; }
    setSubmitting(true);
    setError('');
    try {
      await submitReview({ rating, comment: comment.trim(), bookingId, serviceId: booking.serviceId });
      setExistingReview(true);
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'Could not submit your review.');
    } finally {
      setSubmitting(false);
    }
  };

  if (bookingLoading || checkingReview) {
    return <View style={[styles.centered, { backgroundColor: theme.background }]}><ActivityIndicator color={theme.tint} /></View>;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ title: 'Review your booking', headerTintColor: theme.text }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {!booking || !canReview ? (
          <>
            <Ionicons name="lock-closed-outline" size={52} color={theme.icon} />
            <ThemedText type="title" style={styles.title}>Review unavailable</ThemedText>
            <ThemedText style={styles.centerText}>Reviews can be left by the requester after the provider completes the booking.</ThemedText>
          </>
        ) : existingReview ? (
          <>
            <Ionicons name="checkmark-circle" size={64} color="#2E7D32" />
            <ThemedText type="title" style={styles.title}>Review submitted</ThemedText>
            <ThemedText style={styles.centerText}>Thanks for sharing feedback about {booking.providerName}.</ThemedText>
          </>
        ) : (
          <>
            <ThemedText type="title" style={styles.title}>How was your service?</ThemedText>
            <ThemedText style={styles.subtitle}>{booking.serviceName} with {booking.providerName}</ThemedText>
            <View accessibilityRole="radiogroup" style={styles.stars}>
              {[1, 2, 3, 4, 5].map((value) => (
                <TouchableOpacity
                  key={value}
                  accessibilityRole="radio"
                  accessibilityLabel={`${value} star${value === 1 ? '' : 's'}`}
                  accessibilityState={{ selected: rating === value }}
                  onPress={() => setRating(value)}
                  style={styles.starButton}
                >
                  <Ionicons name={value <= rating ? 'star' : 'star-outline'} size={38} color="#F4B400" />
                </TouchableOpacity>
              ))}
            </View>
            <TextBox
              label="Tell us about your experience (optional)"
              value={comment}
              onChangeText={setComment}
              multiline
              numberOfLines={5}
              maxLength={500}
              placeholder="What went well? What could be improved?"
              inputStyle={styles.comment}
            />
            <ThemedText style={styles.counter}>{comment.length}/500</ThemedText>
            {error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}
            <Button label={submitting ? 'Submitting...' : 'Submit Review'} onPress={handleSubmit} disabled={submitting || rating === 0} variant="primary" style={styles.submit} />
          </>
        )}
        {error && (!canReview || existingReview) ? <ThemedText style={styles.error}>{error}</ThemedText> : null}
        <Button label="Back to Booking" onPress={() => bookingId ? router.replace(`/booking/${bookingId}`) : router.back()} variant="secondary" style={styles.back} />
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
