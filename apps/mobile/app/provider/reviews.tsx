import { SafeAreaView, ScrollView, Appearance } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Colors } from '@/constants/Colors';
import ReviewsComponent from '@/components/reviews/ReviewsComponent';
import { useReviews } from '@/hooks/useReviews';
import { useAuth } from '@/contexts/auth';
import { requireAuth } from '@/utils/auth';
import Toast from '@/components/ui/Toast';
import { useToast } from '@/hooks/useToast';

/** Public review list. New reviews are created from a completed booking. */
export default function ProviderReviewsScreen() {
  const { id } = useLocalSearchParams();
  const providerId = id?.toString();
  const colorScheme = Appearance.getColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const { user } = useAuth();
  const currentUserId = user?.uid;
  const { toast, showToast, hideToast } = useToast();
  const { reviews, stats, isLoading, respondToReview, updateReview, markHelpful, deleteReview } = useReviews(providerId, currentUserId);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Stack.Screen options={{ title: 'Reviews', headerTintColor: theme.text }} />
      <ScrollView style={{ flex: 1 }}>
        <ReviewsComponent
          reviews={reviews}
          stats={stats}
          isLoading={isLoading}
          allowResponding={currentUserId === providerId}
          showStats={true}
          showFilters={true}
          currentUserId={currentUserId}
          onRespondToReview={async (reviewId, responseText) => {
            try { await respondToReview(reviewId, responseText); showToast('Response submitted', 'success'); }
            catch { showToast('Failed to submit response', 'error'); }
          }}
          onUpdateReview={async (reviewId, data) => {
            try { await updateReview(reviewId, data); showToast('Review updated', 'success'); }
            catch { showToast('Failed to update review', 'error'); }
          }}
          onMarkHelpful={async (reviewId) => {
            if (!requireAuth(currentUserId, 'Please sign in to vote.')) return;
            try { await markHelpful(reviewId); } catch { showToast('Failed to update vote', 'error'); }
          }}
          onDeleteReview={async (reviewId) => {
            try { await deleteReview(reviewId); showToast('Review deleted', 'success'); }
            catch { showToast('Failed to delete review', 'error'); }
          }}
          expandedByDefault={true}
        />
      </ScrollView>
      <Toast visible={toast.visible} message={toast.message} type={toast.type} onDismiss={hideToast} />
    </SafeAreaView>
  );
}
