import { useState, useEffect, useCallback } from 'react';
import { Review, ReviewStats } from '@/types/provider';
import {
  getProviderReviews,
  getUserReviews,
  canUserReviewProvider,
  addReview,
  updateReview as repoUpdateReview,
  deleteReview as repoDeleteReview,
  respondToReview as repoRespondToReview,
  markReviewHelpful,
  calculateReviewStats,
} from '@/repositories/reviewRepository';

export interface UseReviewsResult {
  reviews: Review[];
  stats: ReviewStats;
  isLoading: boolean;
  error: Error | null;
  canReview: boolean;
  canReviewReason?: string;
  submitReview: (data: {
    rating: number;
    comment: string;
    bookingId?: string;
    serviceId?: string;
    images?: string[];
  }) => Promise<Review>;
  updateReview: (reviewId: string, data: {
    rating?: number;
    comment?: string;
    images?: string[];
  }) => Promise<Review>;
  deleteReview: (reviewId: string) => Promise<void>;
  respondToReview: (reviewId: string, responseText: string) => Promise<void>;
  markHelpful: (reviewId: string) => Promise<void>;
  refreshReviews: () => Promise<void>;
}

export function useReviews(providerId?: string, userId?: string): UseReviewsResult {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats>({
    averageRating: 0,
    totalReviews: 0,
    ratingCounts: [0, 0, 0, 0, 0]
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [canReview, setCanReview] = useState(false);
  const [canReviewReason, setCanReviewReason] = useState<string | undefined>();

  // Fetch reviews when providerId changes
  const fetchReviews = useCallback(async () => {
    if (!providerId) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const data = await getProviderReviews(providerId);
      setReviews(data);
      setStats(calculateReviewStats(data));
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch reviews'));
    } finally {
      setIsLoading(false);
    }
  }, [providerId]);

  // Check if user can review
  const checkCanReview = useCallback(async () => {
    if (!providerId || !userId) {
      setCanReview(false);
      return;
    }

    try {
      const result = await canUserReviewProvider(userId, providerId);
      setCanReview(result.canReview);
      setCanReviewReason(result.reason);
    } catch (err) {
      console.error('Error checking review eligibility:', err);
      setCanReview(false);
    }
  }, [providerId, userId]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  useEffect(() => {
    checkCanReview();
  }, [checkCanReview]);

  // Submit a new review
  const submitReview = useCallback(async (data: {
    rating: number;
    comment: string;
    bookingId?: string;
    serviceId?: string;
    localImageUris?: string[]; // Local URIs from image picker
  }): Promise<Review> => {
    if (!providerId || !userId) {
      throw new Error('Provider ID and User ID are required');
    }

    console.log('[useReviews] Submitting review...');
    setIsLoading(true);
    setError(null);

    try {
      const newReview = await addReview(providerId, {
        requesterId: userId,
        rating: data.rating,
        comment: data.comment,
        bookingId: data.bookingId,
        serviceId: data.serviceId,
        localImageUris: data.localImageUris,
      });

      console.log('[useReviews] Review submitted successfully');

      // Update local state optimistically
      setReviews(prev => [newReview, ...prev]);
      setStats(calculateReviewStats([newReview, ...reviews]));

      // User can no longer review after submitting
      setCanReview(false);
      setCanReviewReason('You have already reviewed this provider');

      return newReview;
    } catch (err) {
      console.error('[useReviews] Error submitting review:', err);
      const error = err instanceof Error ? err : new Error('Failed to submit review');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [providerId, userId, reviews]);

  // Update an existing review
  const updateReview = useCallback(async (
    reviewId: string,
    data: {
      rating?: number;
      comment?: string;
      images?: string[];
    }
  ): Promise<Review> => {
    const previousReviews = [...reviews];

    // Optimistic update
    setReviews(prev => prev.map(review =>
      review.id === reviewId
        ? { ...review, ...data }
        : review
    ));

    try {
      const updatedReview = await repoUpdateReview(reviewId, data);

      // Update with actual server response
      setReviews(prev => prev.map(review =>
        review.id === reviewId ? updatedReview : review
      ));
      setStats(calculateReviewStats(
        reviews.map(r => r.id === reviewId ? updatedReview : r)
      ));

      return updatedReview;
    } catch (err) {
      // Revert on error
      setReviews(previousReviews);
      const error = err instanceof Error ? err : new Error('Failed to update review');
      setError(error);
      throw error;
    }
  }, [reviews]);

  // Delete a review
  const deleteReview = useCallback(async (reviewId: string): Promise<void> => {
    const previousReviews = [...reviews];

    // Optimistic update
    setReviews(prev => prev.filter(review => review.id !== reviewId));

    try {
      await repoDeleteReview(reviewId);

      // Update stats
      const remainingReviews = reviews.filter(r => r.id !== reviewId);
      setStats(calculateReviewStats(remainingReviews));

      // User can review again after deleting their review
      if (userId && providerId) {
        checkCanReview();
      }
    } catch (err) {
      // Revert on error
      setReviews(previousReviews);
      const error = err instanceof Error ? err : new Error('Failed to delete review');
      setError(error);
      throw error;
    }
  }, [reviews, userId, providerId, checkCanReview]);

  // Respond to a review (provider action)
  const respondToReview = useCallback(async (
    reviewId: string,
    responseText: string
  ): Promise<void> => {
    const previousReviews = [...reviews];

    // Optimistic update
    setReviews(prev => prev.map(review =>
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
      await repoRespondToReview(reviewId, responseText);
    } catch (err) {
      // Revert on error
      setReviews(previousReviews);
      const error = err instanceof Error ? err : new Error('Failed to respond to review');
      setError(error);
      throw error;
    }
  }, [reviews]);

  // Mark a review as helpful (toggle)
  const markHelpful = useCallback(async (reviewId: string): Promise<void> => {
    if (!userId) {
      throw new Error('Please sign in to vote');
    }

    try {
      const result = await markReviewHelpful(reviewId, userId);
      console.log(`[useReviews] Helpful ${result.added ? 'added' : 'removed'}, new count: ${result.newCount}`);

      // Update local state
      setReviews(prev => prev.map(review =>
        review.id === reviewId
          ? { ...review, isHelpful: result.newCount }
          : review
      ));
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to mark review as helpful');
      setError(error);
      throw error;
    }
  }, []);

  // Refresh reviews
  const refreshReviews = useCallback(async (): Promise<void> => {
    await fetchReviews();
    await checkCanReview();
  }, [fetchReviews, checkCanReview]);

  return {
    reviews,
    stats,
    isLoading,
    error,
    canReview,
    canReviewReason,
    submitReview,
    updateReview,
    deleteReview,
    respondToReview,
    markHelpful,
    refreshReviews,
  };
}
