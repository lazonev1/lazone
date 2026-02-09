import { Review, ReviewStats } from '@/types/provider';
import { Review as ReviewModel } from '@/backend/main/src/models/Review';
import * as ReviewService from '@/backend/main/src/services/reviewService';
import * as ProviderService from '@/backend/main/src/services/providerService';

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

  try {
    if (review.requesterId) {
      const requesterId = typeof review.requesterId === 'string'
        ? review.requesterId
        : (review.requesterId as any).id || review.requesterId;

      const user = await ProviderService.getUserById(requesterId as string);
      if (user) {
        clientName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Anonymous';
        clientAvatar = user.avatar;
      }
    }
  } catch (error) {
    console.error('Error fetching user for review:', error);
  }

  // Fetch service name if available
  let serviceName: string | undefined;
  try {
    if (review.serviceId) {
      const serviceId = typeof review.serviceId === 'string'
        ? review.serviceId
        : (review.serviceId as any).id || review.serviceId;

      // Service fetch would go here if needed
      // For now, we'll leave it undefined
    }
  } catch (error) {
    console.error('Error fetching service for review:', error);
  }

  // Transform timestamps to ISO strings
  const createdAt = review.createdAt?.toDate?.() || new Date();

  // Get the latest response from responses array (if any)
  const latestResponse = review.responses && review.responses.length > 0
    ? review.responses[review.responses.length - 1]
    : null;
  const responseDate = latestResponse?.date?.toDate?.() || null;

  return {
    id: review._id,
    clientName,
    clientAvatar,
    rating: review.rating,
    comment: review.comment,
    date: createdAt.toISOString(),
    serviceId: typeof review.serviceId === 'string' ? review.serviceId : undefined,
    serviceName,
    images: review.images || [],
    isHelpful: review.isHelpful || 0,
    response: latestResponse ? {
      text: latestResponse.text,
      date: responseDate?.toISOString() || new Date().toISOString()
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

/**
 * Check if user can review a provider
 */
export async function canUserReviewProvider(
  userId: string,
  providerId: string
): Promise<{ canReview: boolean; reason?: string }> {
  try {
    return await ReviewService.canUserReviewProvider(userId, providerId);
  } catch (error) {
    console.error('Error checking review eligibility:', error);
    throw error;
  }
}

/**
 * Add a new review
 */
export async function addReview(
  providerId: string,
  reviewData: {
    requesterId: string;
    bookingId?: string;
    serviceId?: string;
    rating: number;
    comment: string;
    localImageUris?: string[]; // Local URIs from image picker (disabled for now)
  }
): Promise<Review> {
  console.log('[ReviewRepository] Adding review for provider:', providerId);

  try {
    // TODO: Enable image upload when ready for production
    // Image upload is disabled to avoid Firebase Storage costs during development
    // When ready, uncomment the code below:
    /*
    let imageUrls: string[] = [];
    if (reviewData.localImageUris && reviewData.localImageUris.length > 0) {
      console.log(`[ReviewRepository] Uploading ${reviewData.localImageUris.length} images...`);
      const { uploadReviewImages } = await import('@/backend/main/src/services/storageService');
      const tempId = `temp_${Date.now()}`;
      imageUrls = await uploadReviewImages(reviewData.localImageUris, tempId);
      console.log('[ReviewRepository] Images uploaded successfully');
    }
    */

    // For now, just log if images were selected but not uploaded
    if (reviewData.localImageUris && reviewData.localImageUris.length > 0) {
      console.log(`[ReviewRepository] Note: ${reviewData.localImageUris.length} images selected but upload is disabled`);
    }

    const reviewId = await ReviewService.createReview({
      providerId,
      requesterId: reviewData.requesterId,
      bookingId: reviewData.bookingId,
      serviceId: reviewData.serviceId,
      rating: reviewData.rating,
      comment: reviewData.comment,
      images: [], // Empty for now - images disabled
    });

    console.log('[ReviewRepository] Review created with ID:', reviewId);

    // Fetch the created review and transform it
    const createdReview = await ReviewService.getReviewById(reviewId);
    if (!createdReview) {
      throw new Error('Failed to fetch created review');
    }

    return await transformToViewModel(createdReview);
  } catch (error) {
    console.error('[ReviewRepository] Error adding review:', error);
    throw error;
  }
}

/**
 * Respond to a review (provider response)
 */
export async function respondToReview(reviewId: string, responseText: string): Promise<Review> {
  try {
    await ReviewService.addProviderResponse(reviewId, responseText);

    // Fetch the updated review and transform it
    const updatedReview = await ReviewService.getReviewById(reviewId);
    if (!updatedReview) {
      throw new Error('Review not found after update');
    }

    return await transformToViewModel(updatedReview);
  } catch (error) {
    console.error('Error responding to review:', error);
    throw error;
  }
}

/**
 * Update a review
 */
export async function updateReview(
  reviewId: string,
  reviewData: {
    rating?: number;
    comment?: string;
    images?: string[];
  }
): Promise<Review> {
  try {
    await ReviewService.updateReview(reviewId, reviewData);

    // Fetch the updated review and transform it
    const updatedReview = await ReviewService.getReviewById(reviewId);
    if (!updatedReview) {
      throw new Error('Review not found after update');
    }

    return await transformToViewModel(updatedReview);
  } catch (error) {
    console.error('Error updating review:', error);
    throw error;
  }
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
  userId: string
): Promise<{ added: boolean; newCount: number }> {
  try {
    return await ReviewService.markReviewHelpful(reviewId, userId);
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

  reviews.forEach(review => {
    totalRating += review.rating;
    if (review.rating >= 1 && review.rating <= 5) {
      ratingCounts[review.rating - 1]++;
    }
  });

  return {
    averageRating: Math.round((totalRating / totalReviews) * 10) / 10,
    totalReviews,
    ratingCounts
  };
}

