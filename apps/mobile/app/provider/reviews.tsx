import { SafeAreaView, ScrollView, Appearance, Alert, View, TouchableOpacity, Modal, TextInput } from 'react-native';
import { useState } from 'react';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Colors } from '@/constants/Colors';
import ReviewsComponent from '@/components/reviews/ReviewsComponent';
import { useReviews } from '@/hooks/useReviews';
import { useAuth } from '@/contexts/auth';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Button } from '@lazone/ui';
import { Ionicons } from '@expo/vector-icons';
import Toast from '@/components/ui/Toast';
import { useToast } from '@/hooks/useToast';

export default function ProviderReviewsScreen() {
  const { id } = useLocalSearchParams();
  const colorScheme = Appearance.getColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  
  const [activeFilter, setActiveFilter] = useState<'all' | 'recent' | 'highest' | 'lowest'>('all');
  const { toast, showToast, hideToast } = useToast();

  // Convert the id param to a string
  const providerId = id?.toString();
  
  // Get current user
  const { user } = useAuth();
  const currentUserId = user?.uid;

  // Use enhanced reviews hook
  const {
    reviews,
    stats,
    isLoading,
    canReview,
    canReviewReason,
    submitReview,
    respondToReview,
    markHelpful,
    deleteReview,
    refreshReviews,
  } = useReviews(providerId, currentUserId);

  // Review modal state
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [newReviewRating, setNewReviewRating] = useState(0);
  const [newReviewComment, setNewReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Handle opening review modal with validation
  const handleOpenReviewModal = () => {
    if (!currentUserId) {
      Alert.alert('Sign In Required', 'Please sign in to leave a review');
      return;
    }

    // TODO: Toggle this to enable/disable review eligibility check
    // Set to `true` to enforce booking requirement, `false` to skip for testing
    const ENFORCE_BOOKING_CHECK = false;

    if (ENFORCE_BOOKING_CHECK && !canReview && canReviewReason) {
      Alert.alert('Cannot Review', canReviewReason);
      return;
    }

    setReviewModalVisible(true);
  };

  // Filter reviews based on active filter
  const filteredReviews = [...reviews].sort((a, b) => {
    switch (activeFilter) {
      case 'recent':
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      case 'highest':
        return b.rating - a.rating;
      case 'lowest':
        return a.rating - b.rating;
      default:
        return 0;
    }
  });

  // Handle filter changes
  const handleFilterChange = (filter: 'all' | 'recent' | 'highest' | 'lowest') => {
    setActiveFilter(filter);
  };

  // Handle review submission
  const handleSubmitReview = async () => {
    if (newReviewRating === 0) {
      Alert.alert('Rating Required', 'Please select a star rating');
      return;
    }

    if (!newReviewComment.trim()) {
      Alert.alert('Comment Required', 'Please share your experience');
      return;
    }

    setSubmittingReview(true);
    console.log('[Reviews] Submitting review...');

    try {
      await submitReview({
        rating: newReviewRating,
        comment: newReviewComment,
      });

      setReviewModalVisible(false);
      setNewReviewRating(0);
      setNewReviewComment('');
      showToast('Your review has been submitted!', 'success');
    } catch (error) {
      console.error('[Reviews] Error submitting review:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit review';
      showToast(errorMessage, 'error');
    } finally {
      setSubmittingReview(false);
    }
  };

  const StarRatingSelector = ({ rating, onRatingChange }: { rating: number; onRatingChange: (rating: number) => void }) => {
    return (
      <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 20 }}>
        {[1, 2, 3, 4, 5].map(star => (
          <TouchableOpacity
            key={star}
            onPress={() => onRatingChange(star)}
            style={{ padding: 5 }}
          >
            <Ionicons
              name={star <= rating ? "star" : "star-outline"}
              size={32}
              color="#FFD700"
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Stack.Screen
        options={{
          title: 'Reviews',
          headerTintColor: theme.text,
          headerRight: () => (
            <TouchableOpacity onPress={handleOpenReviewModal}>
              <Ionicons name="create-outline" size={24} color={theme.tint} />
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView style={{ flex: 1 }}>
        <ReviewsComponent
          reviews={filteredReviews}
          stats={stats}
          isLoading={isLoading}
          allowResponding={true}
          showStats={true}
          showFilters={true}
          currentUserId={currentUserId}
          onFilterChange={handleFilterChange}
          onRespondToReview={async (reviewId: string, responseText: string) => {
            try {
              await respondToReview(reviewId, responseText);
              showToast('Response submitted', 'success');
            } catch {
              showToast('Failed to submit response', 'error');
            }
          }}
          onMarkHelpful={async (reviewId: string) => {
            if (!currentUserId) {
              Alert.alert('Sign In Required', 'Please sign in to vote');
              return;
            }
            try {
              await markHelpful(reviewId);
            } catch {
              showToast('Failed to update vote', 'error');
            }
          }}
          onDeleteReview={async (reviewId: string) => {
            try {
              await deleteReview(reviewId);
              showToast('Review deleted', 'success');
            } catch {
              showToast('Failed to delete review', 'error');
            }
          }}
          expandedByDefault={true}
        />
      </ScrollView>

      {/* Write Review Modal - Industry Standard Design */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={reviewModalVisible}
        onRequestClose={() => setReviewModalVisible(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          justifyContent: 'flex-end',
        }}>
          <ThemedView style={{
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 20,
            paddingBottom: 40,
            maxHeight: '90%',
          }}>
            {/* Header */}
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 24,
              paddingBottom: 16,
              borderBottomWidth: 1,
              borderBottomColor: 'rgba(128, 128, 128, 0.2)',
            }}>
              <View>
                <ThemedText style={{ fontSize: 20, fontWeight: '700' }}>Write a Review</ThemedText>
                <ThemedText style={{ fontSize: 14, opacity: 0.6, marginTop: 4 }}>Share your experience</ThemedText>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setReviewModalVisible(false);
                  setNewReviewRating(0);
                  setNewReviewComment('');
                }}
                style={{
                  padding: 8,
                  borderRadius: 20,
                  backgroundColor: 'rgba(128, 128, 128, 0.1)',
                }}
              >
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Rating Section */}
              <View style={{ marginBottom: 24 }}>
                <ThemedText style={{ fontSize: 16, fontWeight: '600', marginBottom: 12 }}>
                  How would you rate your experience?
                </ThemedText>
                <StarRatingSelector
                  rating={newReviewRating}
                  onRatingChange={setNewReviewRating}
                />
                {newReviewRating > 0 && (
                  <ThemedText style={{ textAlign: 'center', opacity: 0.7, marginTop: 8 }}>
                    {newReviewRating === 5 ? 'Excellent!' :
                     newReviewRating === 4 ? 'Very Good' :
                     newReviewRating === 3 ? 'Good' :
                     newReviewRating === 2 ? 'Fair' : 'Poor'}
                  </ThemedText>
                )}
              </View>

              {/* Comment Section */}
              <View style={{ marginBottom: 24 }}>
                <ThemedText style={{ fontSize: 16, fontWeight: '600', marginBottom: 12 }}>
                  Tell us more about your experience
                </ThemedText>
                <TextInput
                  style={{
                    borderWidth: 1,
                    borderRadius: 12,
                    padding: 16,
                    minHeight: 120,
                    textAlignVertical: 'top',
                    color: theme.text,
                    borderColor: theme.icon,
                    fontSize: 16,
                    lineHeight: 24,
                  }}
                  placeholder="What did you like? What could be improved?"
                  placeholderTextColor={theme.icon}
                  multiline
                  numberOfLines={5}
                  value={newReviewComment}
                  onChangeText={setNewReviewComment}
                />
                <ThemedText style={{ fontSize: 12, opacity: 0.5, marginTop: 8, textAlign: 'right' }}>
                  {newReviewComment.length}/500 characters
                </ThemedText>
              </View>

              {/* Image Attachment Section - Coming Soon */}
              <View style={{
                marginBottom: 24,
                padding: 16,
                backgroundColor: 'rgba(128, 128, 128, 0.1)',
                borderRadius: 12,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Ionicons name="camera-outline" size={20} color={theme.icon} />
                  <ThemedText style={{ fontSize: 16, fontWeight: '600', marginLeft: 8 }}>
                    Add Photos
                  </ThemedText>
                  <View style={{
                    backgroundColor: theme.tint,
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 8,
                    marginLeft: 8,
                  }}>
                    <ThemedText style={{ fontSize: 10, color: 'white', fontWeight: '600' }}>
                      COMING SOON
                    </ThemedText>
                  </View>
                </View>
                <ThemedText style={{ fontSize: 14, opacity: 0.6 }}>
                  Photo attachments will be available in a future update
                </ThemedText>
              </View>
            </ScrollView>

            {/* Submit Button */}
            <View style={{ marginTop: 16 }}>
              <Button
                label={submittingReview ? "Submitting..." : "Submit Review"}
                onPress={handleSubmitReview}
                variant="primary"
                disabled={submittingReview || newReviewRating === 0 || !newReviewComment.trim()}
                style={{
                  paddingVertical: 16,
                  borderRadius: 12,
                }}
              />
            </View>
          </ThemedView>
        </View>
      </Modal>

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onDismiss={hideToast}
      />
    </SafeAreaView>
  );
}
