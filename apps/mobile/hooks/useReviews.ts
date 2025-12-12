import { useState, useEffect } from 'react';
import { Review } from '@/types/provider';
import { reviewRepository } from '@/repositories/reviewRepository';

export function useReviews(providerId?: string) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Fetch reviews when providerId changes
  useEffect(() => {
    if (!providerId) return;
    
    const fetchReviews = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await reviewRepository.getProviderReviews(providerId);
        setReviews(data);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch reviews'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchReviews();
  }, [providerId]);

  // Respond to a review
  const respondToReview = async (reviewId: string, responseText: string): Promise<void> => {
    // Update state optimistically
    const previousReviews = [...reviews];
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
    
    try {
      // Make API call
      await reviewRepository.respondToReview(reviewId, responseText);
    } catch (err) {
      // Revert to previous state if API call fails
      setReviews(previousReviews);
      setError(err instanceof Error ? err : new Error('Failed to respond to review'));
      throw err;
    }
  };

  return {
    reviews,
    isLoading,
    error,
    respondToReview
  };
}
