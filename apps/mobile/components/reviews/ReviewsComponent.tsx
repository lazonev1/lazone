import { View, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, TextInput, Alert, Image, Appearance } from 'react-native';
import { useState } from 'react';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Button } from '@lazone/ui';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { Review, ReviewStats } from '@/types/provider';

type ReviewsComponentProps = {
  reviews: Review[];
  stats: ReviewStats;
  isLoading?: boolean;
  allowResponding?: boolean; // Whether to allow responding to reviews
  showStats?: boolean; // Whether to show the stats summary
  showFilters?: boolean; // Whether to show filter options
  onFilterChange?: (filter: 'all' | 'recent' | 'highest' | 'lowest') => void;
  onRespondToReview?: (reviewId: string, responseText: string) => Promise<void>;
  onMarkHelpful?: (reviewId: string) => Promise<void>; // Mark review as helpful
  onDeleteReview?: (reviewId: string) => Promise<void>; // Delete review (for review authors)
  expandedByDefault?: boolean; // Whether to show all reviews by default
  maxReviewsCollapsed?: number; // How many reviews to show when collapsed
  currentUserId?: string; // Current user ID to check if they voted and prevent self-voting
};

export default function ReviewsComponent({
  reviews,
  stats,
  isLoading = false,
  allowResponding = false,
  showStats = true,
  showFilters = true,
  onFilterChange,
  onRespondToReview,
  onMarkHelpful,
  onDeleteReview,
  expandedByDefault = false,
  maxReviewsCollapsed = 2,
  currentUserId
}: ReviewsComponentProps) {
  const colorScheme = Appearance.getColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  
  const [activeFilter, setActiveFilter] = useState<'all' | 'recent' | 'highest' | 'lowest'>('all');
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [responseText, setResponseText] = useState('');
  const [expanded, setExpanded] = useState(expandedByDefault);

  const handleFilterChange = (filter: 'all' | 'recent' | 'highest' | 'lowest') => {
    setActiveFilter(filter);
    if (onFilterChange) {
      onFilterChange(filter);
      //Should handle filtering logic here if needed 
    }
  };

  const handleSubmitResponse = async (reviewId: string) => {
    if (!responseText.trim()) return;
    
    try {
      if (onRespondToReview) {
        await onRespondToReview(reviewId, responseText);
      }
      
      setRespondingTo(null);
      setResponseText('');
    } catch (error) {
      console.error('Failed to submit response:', error);
      Alert.alert('Error', 'Failed to submit your response. Please try again.');
    }
  };

  const renderStarRating = (rating: number, size = 16) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map(star => (
          <Ionicons
            key={star}
            name={star <= rating ? "star" : "star-outline"}
            size={size}
            color="#FFD700"
          />
        ))}
      </View>
    );
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  // Determine which reviews to display based on expanded state
  const displayedReviews = expanded ? reviews : reviews.slice(0, maxReviewsCollapsed);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.tint} />
        <ThemedText style={styles.loadingText}>Loading reviews...</ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Stats Summary Card */}
      {showStats && (
        <ThemedView style={styles.statsCard}>
          <View style={styles.ratingHeaderRow}>
            <View style={styles.averageRatingContainer}>
              <ThemedText style={styles.largeRatingText}>
                {stats.averageRating.toFixed(1)}
              </ThemedText>
              {renderStarRating(stats.averageRating, 24)}
              <ThemedText style={styles.totalReviewsText}>
                {stats.totalReviews} {stats.totalReviews === 1 ? 'review' : 'reviews'}
              </ThemedText>
            </View>
            
            <View style={styles.ratingBreakdownContainer}>
              {[5, 4, 3, 2, 1].map(stars => (
                <View key={stars} style={styles.ratingBarRow}>
                  <ThemedText style={styles.ratingBarLabel}>{stars}</ThemedText>
                  <View style={styles.ratingBarBackground}>
                    <View 
                      style={[
                        styles.ratingBarFill, 
                        { 
                          width: `${(stats.ratingCounts[stars-1] / stats.totalReviews) * 100 || 0}%`,
                          backgroundColor: stars >= 4 ? '#4CAF50' : stars >= 3 ? '#FFC107' : '#F44336'
                        }
                      ]} 
                    />
                  </View>
                  <ThemedText style={styles.ratingCount}>
                    {stats.ratingCounts[stars-1]}
                  </ThemedText>
                </View>
              ))}
            </View>
          </View>
        </ThemedView>
      )}

      {/* Filter Tabs - Fix styling to make them more visible */}
      {showFilters && (
        <View style={styles.filterWrapper}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            style={styles.filterContainer}
            contentContainerStyle={styles.filterContent}
          >
            {[
              { id: 'all', label: 'All Reviews' },
              { id: 'recent', label: 'Most Recent' },
              { id: 'highest', label: 'Highest Rated' },
              { id: 'lowest', label: 'Lowest Rated' }
            ].map(filter => (
              <TouchableOpacity
                key={filter.id}
                style={[
                  styles.filterTab,
                  activeFilter === filter.id && styles.activeFilterTab
                ]}
                onPress={() => handleFilterChange(filter.id as any)}
              >
                <ThemedText style={[
                  styles.filterTabText,
                  activeFilter === filter.id && styles.activeFilterTabText
                ]}>
                  {filter.label}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Reviews List */}
      <View style={styles.reviewsContainer}>
        {reviews.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="star-outline" size={48} color={theme.icon} />
            <ThemedText style={styles.emptyStateTitle}>No Reviews Yet</ThemedText>
            <ThemedText style={styles.emptyStateText}>
              When clients leave reviews for your services, they will appear here.
            </ThemedText>
          </View>
        ) : (
          <>
            {displayedReviews.map(review => (
              <ThemedView key={review.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <View style={styles.reviewerInfo}>
                    <View style={styles.avatarContainer}>
                      <Ionicons name="person-circle" size={40} color={theme.icon} />
                    </View>
                    <View>
                      <ThemedText style={styles.reviewerName}>{review.clientName}</ThemedText>
                      <ThemedText style={styles.reviewDate}>{formatDate(review.date)}</ThemedText>
                    </View>
                  </View>
                  <View style={styles.reviewHeaderRight}>
                    {renderStarRating(review.rating)}
                    {/* Delete button - only for review author */}
                    {currentUserId && currentUserId === review.userId && onDeleteReview && (
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => {
                          Alert.alert(
                            'Delete Review',
                            'Are you sure you want to delete your review? This action cannot be undone.',
                            [
                              { text: 'Cancel', style: 'cancel' },
                              {
                                text: 'Delete',
                                style: 'destructive',
                                onPress: () => onDeleteReview(review.id),
                              },
                            ]
                          );
                        }}
                      >
                        <Ionicons name="trash-outline" size={18} color="#F44336" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
                
                {review.serviceName && (
                  <ThemedText style={styles.serviceLabel}>{review.serviceName}</ThemedText>
                )}
                <ThemedText style={styles.reviewComment}>{review.comment}</ThemedText>
                
                {/* Review Images */}
                {review.images && review.images.length > 0 && (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.imagesContainer}
                  >
                    {review.images.map((imageUrl, index) => (
                      <Image
                        key={index}
                        source={{ uri: imageUrl }}
                        style={styles.reviewImage}
                        resizeMode="cover"
                      />
                    ))}
                  </ScrollView>
                )}

                {/* Provider Response */}
                {review.response && (
                  <View style={styles.responseContainer}>
                    <View style={styles.responseHeader}>
                      <Ionicons name="chatbox" size={16} color={theme.text} />
                      <ThemedText style={styles.responseTitle}>Your Response</ThemedText>
                    </View>
                    <ThemedText style={styles.responseText}>{review.response.text}</ThemedText>
                    <ThemedText style={styles.responseDate}>
                      {formatDate(review.response.date)}
                    </ThemedText>
                  </View>
                )}
                
                {/* Response Input */}
                {allowResponding && respondingTo === review.id ? (
                  <View style={styles.responseInputContainer}>
                    <TextInput
                      style={[styles.responseInput, { color: theme.text, borderColor: theme.icon }]}
                      placeholder="Write your response..."
                      placeholderTextColor={theme.icon}
                      value={responseText}
                      onChangeText={setResponseText}
                      multiline
                    />
                    <View style={styles.responseActions}>
                      <Button
                        label="Cancel"
                        onPress={() => {
                          setRespondingTo(null);
                          setResponseText('');
                        }}
                        variant="secondary"
                        size="small"
                        style={styles.responseButton}
                      />
                      <Button
                        label="Submit"
                        onPress={() => handleSubmitResponse(review.id)}
                        variant="primary"
                        size="small"
                        style={styles.responseButton}
                      />
                    </View>
                  </View>
                ) : null}

                {/* Action Row: Respond Button + Helpful Button */}
                <View style={styles.reviewActionsRow}>
                  {/* Respond Button */}
                  {(allowResponding && !review.response) && (
                    <TouchableOpacity
                      style={styles.respondButton}
                      onPress={() => setRespondingTo(review.id)}
                    >
                      <Ionicons name="chatbox-outline" size={18} color={theme.tint} />
                      <ThemedText style={styles.respondButtonText}>Respond to review</ThemedText>
                    </TouchableOpacity>
                  )}

                  {/* Helpful Button */}
                  <TouchableOpacity
                    style={[
                      styles.helpfulButton,
                      currentUserId === review.userId && styles.helpfulButtonDisabled
                    ]}
                    onPress={() => {
                      // Don't allow users to vote on their own reviews
                      if (currentUserId === review.userId) return;
                      if (!currentUserId) {
                        Alert.alert('Sign In Required', 'Please sign in to vote');
                        return;
                      }
                      onMarkHelpful && onMarkHelpful(review.id);
                    }}
                    disabled={currentUserId === review.userId}
                  >
                    <Ionicons
                      name={currentUserId && review.helpfulBy?.includes(currentUserId) ? "thumbs-up" : "thumbs-up-outline"}
                      size={18}
                      color={
                        currentUserId === review.userId
                          ? theme.icon
                          : (currentUserId && review.helpfulBy?.includes(currentUserId) ? '#0A58A5' : theme.icon)
                      }
                    />
                    {(review.isHelpful ?? 0) > 0 && (
                      <ThemedText style={styles.helpfulCount}>({review.isHelpful})</ThemedText>
                    )}
                  </TouchableOpacity>
                </View>
              </ThemedView>
            ))}

            {/* Show More/Less Button */}
            {reviews.length > maxReviewsCollapsed && (
              <TouchableOpacity
                style={styles.toggleButton}
                onPress={() => setExpanded(!expanded)}
              >
                <ThemedText style={styles.toggleButtonText}>
                  {expanded ? 'Show Less' : `Show More (${reviews.length - maxReviewsCollapsed} more)`}
                </ThemedText>
                <Ionicons 
                  name={expanded ? "chevron-up" : "chevron-down"} 
                  size={16} 
                  color='#FF9900'
                />
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    padding: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  statsCard: {
    margin: 16,
    padding: 20,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  ratingHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  averageRatingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 24,
    minWidth: 100,
  },
  largeRatingText: {
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: 4,
    lineHeight: 56,
  },
  totalReviewsText: {
    marginTop: 8,
    fontSize: 14,
    opacity: 0.7,
  },
  ratingBreakdownContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  ratingBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 5,
  },
  ratingBarLabel: {
    width: 25,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  ratingBarBackground: {
    flex: 1,
    height: 10,
    backgroundColor: '#E0E0E0',
    borderRadius: 5,
    marginHorizontal: 8,
  },
  ratingBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  ratingCount: {
    width: 30,
    fontSize: 14,
    textAlign: 'right',
    fontWeight: '500',
  },
  starsContainer: {
    flexDirection: 'row',
    marginVertical: 4,
  },
  filterWrapper: {
    backgroundColor: 'transparent',
    marginBottom: 16,
    zIndex: 2,
    minHeight: 50,
  },
  filterContainer: {
    paddingHorizontal: 16,
  },
  filterContent: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    minWidth: 100,
    alignItems: 'center',
  },
  activeFilterTab: {
    backgroundColor: '#0A58A5',
    borderColor: '#0A58A5',
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  activeFilterTabText: {
    color: 'white',
    fontWeight: '600',
  },
  reviewsContainer: {
    padding: 16,
    paddingTop: 0,
  },
  reviewCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  reviewerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  reviewHeaderRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  deleteButton: {
    padding: 4,
    marginTop: 4,
  },
  avatarContainer: {
    marginRight: 12,
  },
  reviewerName: {
    fontWeight: '600',
    fontSize: 16,
  },
  reviewDate: {
    fontSize: 12,
    opacity: 0.7,
  },
  serviceLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    color: '#0A58A5',
  },
  reviewComment: {
    fontSize: 15,
    lineHeight: 22,
  },
  responseContainer: {
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(10, 88, 165, 0.1)',
  },
  responseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  responseTitle: {
    fontWeight: '600',
    marginLeft: 6,
  },
  responseText: {
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  responseDate: {
    fontSize: 12,
    opacity: 0.7,
    marginTop: 8,
    textAlign: 'right',
  },
  respondButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  respondButtonText: {
    color: '#0A58A5',
    marginLeft: 8,
    fontSize: 14,
  },
  reviewActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128, 128, 128, 0.2)',
    minHeight: 40,
  },
  helpfulButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(128, 128, 128, 0.1)',
  },
  helpfulButtonDisabled: {
    opacity: 0.5,
  },
  helpfulCount: {
    fontSize: 14,
    marginLeft: 6,
    opacity: 0.8,
    fontWeight: '500',
  },
  responseInputContainer: {
    marginTop: 16,
  },
  responseInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  responseActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
    gap: 8,
  },
  responseButton: {
    minWidth: 100,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    textAlign: 'center',
    opacity: 0.7,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggleButtonText: {
    marginTop: 10,
    color: '#FF9900'
  },
  imagesContainer: {
    marginTop: 12,
    marginBottom: 8,
  },
  reviewImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginRight: 8,
  },
});
