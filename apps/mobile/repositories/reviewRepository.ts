import { Review, ReviewStats } from '@/types/provider';
import { Review as ReviewModel } from '@/backend/main/src/models/Review';
import * as ReviewService from '@/backend/main/src/services/reviewService';
import { getPublicProfile } from '@/backend/main/src/services/publicProfileService';

/**
 * Review Repository
 *
 * Transforms database models to UI view models.
 * Calls backend services to fetch data, then transforms for UI consumption.
 */

/**
 * Transforms a backend Review model to a UI Review view model
 */
async function transformToViewModel(review: ReviewModel): Promise<Review> {
  // Fetch the requester's name
  let clientName = 'Anonymous';
  let clientAvatar = undefined;

  // Extract requesterId as string
  const requesterId = review.requesterId;

  try {
    if (requesterId) {
      const user = await getPublicProfile(requesterId as string);
      if (user) {
        clientName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Anonymous';
        clientAvatar = user.avatar;
      }
    }
  } catch (error) {
    console.error('Error fetching user for review:', error);
  }

  // Transform timestamps to ISO strings
  const createdAt = review.createdAt?.toDate?.();

  // Get the latest response from responses array (if any)
  const latestResponse = review.responses && review.responses.length > 0
    ? review.responses[review.responses.length - 1]
    : null;
  const responseDate = review.responseUpdatedAt?.toDate?.() || null;

  const hasCurrentUserHelpfulVote = await ReviewService.hasCurrentUserMarkedHelpful(review._id);

  return {
    id: review._id,
    bookingId: review.bookingId,
    providerId: review.providerId,
    clientName,
    clientAvatar,
    rating: review.rating,
    comment: review.comment,
    date: createdAt?.toISOString() ?? '',
    serviceId: review.serviceId,
    serviceName: undefined, // Service names are not fetched separately - would need provider context
    images: review.images || [],
    isHelpful: review.isHelpful || 0,
    hasCurrentUserHelpfulVote,
    userId: requesterId as string,
    response: latestResponse ? {
      text: latestResponse.text,
      date: responseDate?.toISOString() ?? ''
    } : undefined
  };
}

/**
 * Get reviews for a provider
 */
export async function getProviderReviews(providerId: string): Promise<Review[]> {
  try {
    const reviews = await ReviewService.getReviewsByProviderId(providerId);

    // Transform all reviews to view models
    const transformedReviews = await Promise.all(
      reviews.map(review => transformToViewModel(review))
    );

    return transformedReviews;
  } catch (error) {
    console.error('Error fetching provider reviews:', error);
    throw error;
  }
}

/**
 * Get reviews by the current user
 */
export async function getUserReviews(userId: string): Promise<Review[]> {
  try {
    const reviews = await ReviewService.getReviewsByRequesterId(userId);

    const transformedReviews = await Promise.all(
      reviews.map(review => transformToViewModel(review))
    );

    return transformedReviews;
  } catch (error) {
    console.error('Error fetching user reviews:', error);
    throw error;
  }
}

/** Save the review without making success depend on a follow-up read. */
export async function addReview(
  providerId: string,
  reviewData: { requesterId: string; bookingId: string; serviceId: string; rating: number; comment: string },
): Promise<string> {
  return ReviewService.createReview({ providerId, ...reviewData, images: [] });
}

export async function respondToReview(reviewId: string, responseText: string): Promise<void> {
  await ReviewService.addProviderResponse(reviewId, responseText);
}

export async function updateReview(reviewId: string, data: { rating?: number; comment?: string }): Promise<void> {
  await ReviewService.updateReview(reviewId, data);
}

/**
 * Delete a review
 */
export async function deleteReview(reviewId: string): Promise<void> {
  try {
    await ReviewService.deleteReview(reviewId);
  } catch (error) {
    console.error('Error deleting review:', error);
    throw error;
  }
}

/**
 * Mark a review as helpful (toggle)
 * Returns true if vote was added, false if removed
 */
export async function markReviewHelpful(
  reviewId: string,
): Promise<{ added: boolean; newCount: number }> {
  try {
    return await ReviewService.markReviewHelpful(reviewId);
  } catch (error) {
    console.error('Error marking review helpful:', error);
    throw error;
  }
}

/**
 * Calculate review stats from a list of reviews
 */
export function calculateReviewStats(reviews: Review[]): ReviewStats {
  const totalReviews = reviews.length;

  if (totalReviews === 0) {
    return {
      averageRating: 0,
      totalReviews: 0,
      ratingCounts: [0, 0, 0, 0, 0]
    };
  }

  const ratingCounts = [0, 0, 0, 0, 0];
  let totalRating = 0;
  let ratedReviews = 0;

  reviews.forEach(review => {
    if (Number.isInteger(review.rating) && review.rating >= 1 && review.rating <= 5) {
      totalRating += review.rating;
      ratedReviews++;
      ratingCounts[review.rating - 1]++;
    }
  });

  return {
    averageRating: ratedReviews ? Math.round((totalRating / ratedReviews) * 10) / 10 : 0,
    totalReviews,
    ratingCounts
  };
}
