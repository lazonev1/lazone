import { SafeAreaView } from 'react-native';
import { useState } from 'react';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { Appearance } from 'react-native';
import ReviewsComponent from '@/components/reviews/ReviewsComponent';
import { useReviews } from '@/hooks/useReviews';
import { ScrollView } from 'react-native-gesture-handler';

export default function ProviderReviewsScreen() {
  const { id } = useLocalSearchParams();
  const colorScheme = Appearance.getColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  
  const [activeFilter, setActiveFilter] = useState<'all' | 'recent' | 'highest' | 'lowest'>('all');
  
  // Convert the id param to a string and pass it to useReviews
  const providerId = id?.toString();
  
  // Use the useReviews hook with the provider ID
  const { 
    reviews, 
    isLoading, 
    respondToReview 
  } = useReviews(providerId);

  // Calculate stats from the reviews provided by the hook
  const totalRatings = reviews.reduce((sum, review) => sum + review.rating, 0);
  const avgRating = totalRatings / reviews.length || 0;
  
  const counts = [0, 0, 0, 0, 0];
  reviews.forEach(review => {
    counts[review.rating - 1]++;
  });
  
  const stats = {
    averageRating: avgRating,
    totalReviews: reviews.length,
    ratingCounts: counts
  };

  // Handle filter changes
  const handleFilterChange = (filter: 'all' | 'recent' | 'highest' | 'lowest') => {
    setActiveFilter(filter);
    // In a real app, you would update the hook or API call to filter
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
          onRespondToReview={respondToReview}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
