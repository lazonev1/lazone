import { SafeAreaView, ScrollView, Appearance } from 'react-native';
import { useState } from 'react';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Colors } from '@/constants/Colors';
import ReviewsComponent from '@/components/reviews/ReviewsComponent';
import { useProvider } from '@/hooks/useProvider';
import { ReviewStats } from '@/types/provider';

export default function ProviderReviewsScreen() {
  const { id } = useLocalSearchParams();
  const colorScheme = Appearance.getColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  
  const [activeFilter, setActiveFilter] = useState<'all' | 'recent' | 'highest' | 'lowest'>('all');
  
  // Convert the id param to a string and use the provider hook
  const providerId = id?.toString();
  
  // Use the useProvider hook to fetch provider data with reviews
  const { provider, isLoading } = useProvider(providerId);

  // Extract reviews from provider data
  const reviews = provider?.reviewItems || [];

  // Calculate stats from the provider data
  const stats: ReviewStats = {
    averageRating: provider?.rating || 0,
    totalReviews: provider?.reviews || 0,
    ratingCounts: reviews.reduce((acc, review) => {
      if (review.rating >= 1 && review.rating <= 5) {
        acc[review.rating - 1]++;
      }
      return acc;
    }, [0, 0, 0, 0, 0]),
  };

  // Handle filter changes
  const handleFilterChange = (filter: 'all' | 'recent' | 'highest' | 'lowest') => {
    setActiveFilter(filter);
    // Filtering logic can be implemented here
  };

  // Handle responding to reviews
  const handleRespondToReview = (reviewId: string, response: string) => {
    console.log(`Responding to review ${reviewId} with: ${response}`);
    // TODO: Implement review response functionality
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView style={{ flex: 1 }}>
        <Stack.Screen
          options={{
            title: 'Reviews',
            headerTintColor: theme.text,
          }}
        />
        <ReviewsComponent
          reviews={reviews}
          stats={stats}
          isLoading={isLoading}
          allowResponding={true}
          showStats={true}
          showFilters={true}
          onFilterChange={handleFilterChange}
          onRespondToReview={handleRespondToReview}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
