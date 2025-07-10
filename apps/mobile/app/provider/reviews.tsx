import { View, StyleSheet, ScrollView, SafeAreaView, ActivityIndicator, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Button } from '@lazone/ui';
import { Ionicons } from '@expo/vector-icons';
import { Providers } from '@/hooks/useProviders'; // Ensure this is the correct path
import { Appearance } from 'react-native';

type Review = {
  id: string;
  clientName: string;
  clientAvatar?: any;
  rating: number;
  comment: string;
  date: string;
  serviceId: string;
  serviceName: string;
  response?: {
    text: string;
    date: string;
  };
};

export default function ProviderReviewsScreen() {
  const { id } = useLocalSearchParams();
  const colorScheme = Appearance.getColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  
  const [isLoading, setIsLoading] = useState(true);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState({
    averageRating: 0,
    totalReviews: 0,
    ratingCounts: [0, 0, 0, 0, 0] // For 1-5 stars
  });
  const [activeFilter, setActiveFilter] = useState<'all' | 'recent' | 'highest' | 'lowest'>('all');
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [responseText, setResponseText] = useState('');

  useEffect(() => {
    fetchReviews();
  }, [activeFilter, id]);

  const fetchReviews = async () => {
    setIsLoading(true);
    try {
      // Find the provider by ID or use the first one
      const providerId = typeof id === 'string' ? parseInt(id, 10) : undefined;
      const provider = providerId 
        ? Providers.find(p => p.id === providerId)
        : Providers[0];
      
      if (!provider) {
        setReviews([]);
        setStats({
          averageRating: 0,
          totalReviews: 0,
          ratingCounts: [0, 0, 0, 0, 0]
        });
        setIsLoading(false);
        return;
      }
      
      // Convert testimonials to reviews format
      const providerReviews: Review[] = provider.testimonials.map((t, index) => ({
        id: index.toString(),
        clientName: t.name,
        clientAvatar: require('@/assets/images/avatar-placeholder.png'),
        rating: Math.floor(Math.random() * 3) + 3, // Random rating between 3-5 for testimonials
        comment: t.quote,
        date: new Date(Date.now() - Math.random() * 10000000000).toISOString(),
        serviceId: `service-${index}`,
        serviceName: provider.services[index % provider.services.length].name,
        response: index === 1 ? {
          text: "Thank you for your feedback! We appreciate your business.",
          date: new Date(Date.now() - 86400000).toISOString() // 1 day ago
        } : undefined
      }));
      
      // Sort based on filter
      let sortedReviews = [...providerReviews];
      if (activeFilter === 'recent') {
        sortedReviews.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      } else if (activeFilter === 'highest') {
        sortedReviews.sort((a, b) => b.rating - a.rating);
      } else if (activeFilter === 'lowest') {
        sortedReviews.sort((a, b) => a.rating - b.rating);
      }
      
      setReviews(sortedReviews);
      
      // Calculate statistics
      const totalRatings = sortedReviews.reduce((sum, review) => sum + review.rating, 0);
      const avgRating = totalRatings / sortedReviews.length || 0;
      
      // Count ratings by star level
      const counts = [0, 0, 0, 0, 0];
      sortedReviews.forEach(review => {
        counts[review.rating - 1]++;
      });
      
      setStats({
        averageRating: avgRating,
        totalReviews: sortedReviews.length,
        ratingCounts: counts
      });
      
    } catch (error) {
      console.error('Failed to fetch reviews:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitResponse = async (reviewId: string) => {
    if (!responseText.trim()) return;
    
    try {
      // Update UI optimistically
      setReviews(reviews.map(review => 
        review.id === reviewId
          ? {
              ...review,
              response: {
                text: responseText,
                date: new Date().toISOString()
              }
            }
          : review
      ));
      
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

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          title: 'My Reviews',
          headerTintColor: theme.text,
        }}
      />

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.tint} />
          <ThemedText style={styles.loadingText}>Loading reviews...</ThemedText>
        </View>
      ) : (
        <ScrollView>
          {/* Stats Summary Card - Improved Layout */}
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

          {/* Filter Tabs */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
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
                onPress={() => setActiveFilter(filter.id as any)}
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

          {/* Reviews List */}
          <View style={styles.reviewsContainer}>
            {reviews.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="star-outline" size={48} color={theme.icon} />
                <ThemedText style={styles.emptyStateTitle}>No Reviews Yet</ThemedText>
                <ThemedText style={styles.emptyStateText}>
                  When clients leave reviews for your services, they'll appear here.
                </ThemedText>
              </View>
            ) : (
              reviews.map(review => (
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
                    <View>
                      {renderStarRating(review.rating)}
                    </View>
                  </View>
                  
                  <ThemedText style={styles.serviceLabel}>{review.serviceName}</ThemedText>
                  <ThemedText style={styles.reviewComment}>{review.comment}</ThemedText>
                  
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
                  {respondingTo === review.id ? (
                    <View style={styles.responseInputContainer}>
                      <TextInput
                        style={[styles.responseInput, { color: theme.text, borderColor: theme.border }]}
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
                  ) : !review.response && (
                    <TouchableOpacity
                      style={styles.respondButton}
                      onPress={() => setRespondingTo(review.id)}
                    >
                      <Ionicons name="chatbox-outline" size={16} color={theme.tint} />
                      <ThemedText style={styles.respondButtonText}>Respond to review</ThemedText>
                    </TouchableOpacity>
                  )}
                </ThemedView>
              ))
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
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
    elevation: 3, // Android shadow
    shadowColor: '#000', // iOS shadow
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
    minWidth: 100, // Ensure minimum width
  },
  largeRatingText: {
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: 4,
    lineHeight: 56, // Ensure consistent height
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
    marginVertical: 5, // Increased spacing
  },
  ratingBarLabel: {
    width: 25,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  ratingBarBackground: {
    flex: 1,
    height: 10, // Taller bars
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
  filterContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  activeFilterTab: {
    backgroundColor: '#0A58A5',
    borderColor: '#0A58A5',
  },
  filterTabText: {
    fontSize: 14,
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
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  respondButtonText: {
    color: '#0A58A5',
    marginLeft: 6,
    fontSize: 14,
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
});
