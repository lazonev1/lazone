import { SafeAreaView } from 'react-native';
import { useState, useEffect } from 'react';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { Appearance } from 'react-native';
import { Providers } from '@/hooks/useProviders'; 
import ReviewsComponent, { Review, ReviewStats } from '@/components/reviews/ReviewsComponent';

export default function ProviderReviewsScreen() {
  const { id } = useLocalSearchParams();
  const colorScheme = Appearance.getColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  
  const [isLoading, setIsLoading] = useState(true);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats>({
    averageRating: 0,
    totalReviews: 0,
    ratingCounts: [0, 0, 0, 0, 0]
  });
  const [activeFilter, setActiveFilter] = useState<'all' | 'recent' | 'highest' | 'lowest'>('all');

  useEffect(() => {
    fetchReviews();
  }, [activeFilter, id]);

  const fetchReviews = async () => {
    setIsLoading(true);
    try {
      // Find provider and use reviewItems directly
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
      
      // Use reviewItems directly - no conversion needed
      let providerReviews = [...(provider.reviewItems || [])];
      
      // Apply filters
      if (activeFilter === 'recent') {
        providerReviews.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      } else if (activeFilter === 'highest') {
        providerReviews.sort((a, b) => b.rating - a.rating);
      } else if (activeFilter === 'lowest') {
        providerReviews.sort((a, b) => a.rating - b.rating);
      }
      
      setReviews(providerReviews);
      
      // Calculate statistics
      const totalRatings = providerReviews.reduce((sum, review) => sum + review.rating, 0);
      const avgRating = totalRatings / providerReviews.length || 0;
      
      // Count ratings by star level
      const counts = [0, 0, 0, 0, 0];
      providerReviews.forEach(review => {
        counts[review.rating - 1]++;
      });
      
      setStats({
        averageRating: avgRating,
        totalReviews: providerReviews.length,
        ratingCounts: counts
      });
      
    } catch (error) {
      console.error('Failed to fetch reviews:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRespondToReview = async (reviewId: string, responseText: string) => {
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
    
    // TODO: In the future, add API call to save response
    return Promise.resolve();
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Stack.Screen
        options={{
          title: 'My Reviews',
          headerTintColor: theme.text,
        }}
      />

      <ReviewsComponent
        reviews={reviews}
        stats={stats}
        isLoading={isLoading}
        allowResponding={true}
        showStats={true}
        showFilters={true} // Explicitly ensure this is true
        onFilterChange={setActiveFilter}
        onRespondToReview={handleRespondToReview}
      />
    </SafeAreaView>
  );
}
