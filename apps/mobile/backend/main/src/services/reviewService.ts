import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  orderBy,
  increment,
  arrayUnion,
} from "firebase/firestore";
import { db, COLLECTIONS } from "../config/firebase";
import { Review } from "../models/Review";

/**
 * Review Service - Firebase Firestore Operations
 *
 * Handles all review-related database operations including:
 * - CRUD operations for reviews
 * - Provider rating recalculation
 * - Provider response management
 */

// ========== CREATE OPERATIONS ==========

/**
 * Creates a new review in Firestore
 * TEMPORARY DEVELOPMENT DESIGN: after a review mutation, the client updates the
 * reviewed provider's aggregate rating. This requires a deliberately broad
 * provider-update Firestore rule. Move the aggregation to a trusted backend
 * before production so clients cannot write another provider's profile.
 */
export async function createReview(reviewData: {
  providerId: string;
  requesterId: string;
  bookingId?: string;
  serviceId?: string;
  rating: number;
  comment: string;
  images?: string[];
}): Promise<string> {
  console.log('[ReviewService] Creating review for provider:', reviewData.providerId);

  try {
    // Validate rating
    if (reviewData.rating < 1 || reviewData.rating > 5) {
      console.warn('[ReviewService] Invalid rating:', reviewData.rating);
      throw new Error("Rating must be between 1 and 5");
    }

    console.log('[ReviewService] Saving review to Firestore...');

    // Create the review document
    const reviewDoc = await addDoc(collection(db, COLLECTIONS.REVIEWS), {
      providerId: reviewData.providerId,
      requesterId: reviewData.requesterId,
      bookingId: reviewData.bookingId || null,
      serviceId: reviewData.serviceId || null,
      rating: reviewData.rating,
      comment: reviewData.comment,
      images: reviewData.images || [],
      responses: [],
      isHelpful: 0,
      helpfulBy: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    console.log('[ReviewService] Review created with ID:', reviewDoc.id);

    console.log('[ReviewService] Review creation complete');
    await recalculateProviderRating(reviewData.providerId);
    return reviewDoc.id;
  } catch (error) {
    console.error("[ReviewService] Error creating review:", error);
    throw error;
  }
}

// ========== READ OPERATIONS ==========

/**
 * Fetches a single review by ID
 */
export async function getReviewById(reviewId: string): Promise<Review | null> {
  try {
    const reviewDoc = await getDoc(doc(db, COLLECTIONS.REVIEWS, reviewId));

    if (!reviewDoc.exists()) {
      return null;
    }

    return { _id: reviewDoc.id, ...reviewDoc.data() } as Review;
  } catch (error) {
    console.error("Error fetching review:", error);
    throw error;
  }
}

/**
 * Fetches all reviews for a provider, ordered by creation date (newest first)
 */
export async function getReviewsByProviderId(providerId: string): Promise<Review[]> {
  try {
    const q = query(
      collection(db, COLLECTIONS.REVIEWS),
      where("providerId", "==", providerId),
      orderBy("createdAt", "desc")
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({
      _id: doc.id,
      ...doc.data(),
    })) as Review[];
  } catch (error) {
    console.error("Error fetching reviews by provider:", error);
    throw error;
  }
}

/**
 * Fetches all reviews written by a user
 */
export async function getReviewsByRequesterId(requesterId: string): Promise<Review[]> {
  try {
    const q = query(
      collection(db, COLLECTIONS.REVIEWS),
      where("requesterId", "==", requesterId),
      orderBy("createdAt", "desc")
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({
      _id: doc.id,
      ...doc.data(),
    })) as Review[];
  } catch (error) {
    console.error("Error fetching reviews by requester:", error);
    throw error;
  }
}

/**
 * Checks if a booking already has a review
 */
export async function getReviewByBookingId(bookingId: string): Promise<Review | null> {
  try {
    const q = query(
      collection(db, COLLECTIONS.REVIEWS),
      where("bookingId", "==", bookingId)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return { _id: doc.id, ...doc.data() } as Review;
  } catch (error) {
    console.error("Error fetching review by booking:", error);
    throw error;
  }
}

/**
 * Checks if a user can review a provider (has completed booking and hasn't reviewed yet)
 */
export async function canUserReviewProvider(
  userId: string,
  providerId: string
): Promise<{ canReview: boolean; reason?: string }> {
  try {
    // Check if user has a completed booking with this provider
    const bookingsQuery = query(
      collection(db, COLLECTIONS.BOOKINGS),
      where("requesterId", "==", userId),
      where("providerId", "==", providerId),
      where("status", "==", "completed")
    );

    const bookingsSnapshot = await getDocs(bookingsQuery);

    if (bookingsSnapshot.empty) {
      return {
        canReview: false,
        reason: "You need to complete a booking with this provider first",
      };
    }

    // Check if user already reviewed this provider
    const existingReviewQuery = query(
      collection(db, COLLECTIONS.REVIEWS),
      where("requesterId", "==", userId),
      where("providerId", "==", providerId)
    );

    const existingReviewSnapshot = await getDocs(existingReviewQuery);

    if (!existingReviewSnapshot.empty) {
      return {
        canReview: false,
        reason: "You have already reviewed this provider",
      };
    }

    return { canReview: true };
  } catch (error) {
    console.error("Error checking if user can review:", error);
    throw error;
  }
}

// ========== UPDATE OPERATIONS ==========

/**
 * Updates an existing review
 */
export async function updateReview(
  reviewId: string,
  updates: {
    rating?: number;
    comment?: string;
    images?: string[];
  }
): Promise<void> {
  try {
    // Validate rating if provided
    if (updates.rating !== undefined && (updates.rating < 1 || updates.rating > 5)) {
      throw new Error("Rating must be between 1 and 5");
    }

    const currentReview = await getReviewById(reviewId);
    if (!currentReview) {
      throw new Error("Review not found");
    }

    await updateDoc(doc(db, COLLECTIONS.REVIEWS, reviewId), {
      ...updates,
      updatedAt: serverTimestamp(),
    });

    if (updates.rating !== undefined) {
      await recalculateProviderRating(currentReview.providerId as unknown as string);
    }
  } catch (error) {
    console.error("Error updating review:", error);
    throw error;
  }
}

/**
 * Adds a provider's response to a review
 */
export async function addProviderResponse(
  reviewId: string,
  responseText: string
): Promise<void> {
  try {
    await updateDoc(doc(db, COLLECTIONS.REVIEWS, reviewId), {
      responses: arrayUnion({
        text: responseText,
        date: new Date(),
      }),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error adding provider response:", error);
    throw error;
  }
}

/**
 * Toggles the helpful vote for a review by a user
 * Returns true if vote was added, false if vote was removed
 */
export async function markReviewHelpful(
  reviewId: string,
  userId: string
): Promise<{ added: boolean; newCount: number }> {
  console.log(`[ReviewService] Toggling helpful vote for review ${reviewId} by user ${userId}`);

  try {
    const review = await getReviewById(reviewId);
    if (!review) {
      throw new Error("Review not found");
    }

    const helpfulBy = review.helpfulBy || [];
    const hasVoted = helpfulBy.includes(userId);

    if (hasVoted) {
      await updateDoc(doc(db, COLLECTIONS.REVIEWS, reviewId), {
        isHelpful: increment(-1),
        helpfulBy: helpfulBy.filter(id => id !== userId),
        updatedAt: serverTimestamp(),
      });
      return { added: false, newCount: (review.isHelpful || 1) - 1 };
    }

    await updateDoc(doc(db, COLLECTIONS.REVIEWS, reviewId), {
      isHelpful: increment(1),
      helpfulBy: [...helpfulBy, userId],
      updatedAt: serverTimestamp(),
    });
    return { added: true, newCount: (review.isHelpful || 0) + 1 };
  } catch (error) {
    console.error("Error toggling review helpful:", error);
    throw error;
  }
}

// ========== DELETE OPERATIONS ==========

/**
 * Deletes a review and recalculates the provider rating.
 */
export async function deleteReview(reviewId: string): Promise<void> {
  try {
    const currentReview = await getReviewById(reviewId);
    if (!currentReview) {
      throw new Error("Review not found");
    }
    const providerId = currentReview.providerId as unknown as string;

    await deleteDoc(doc(db, COLLECTIONS.REVIEWS, reviewId));
    await recalculateProviderRating(providerId);
  } catch (error) {
    console.error("Error deleting review:", error);
    throw error;
  }
}

/**
 * TEMPORARY: move this aggregation to a trusted backend before production.
 */
export async function recalculateProviderRating(providerId: string): Promise<void> {
  const reviews = await getReviewsByProviderId(providerId);
  const reviewCount = reviews.length;
  const averageRating = reviewCount
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviewCount
    : 0;
  console.log(`[ReviewService] New stats - Reviews: ${reviewCount}, Avg Rating: ${averageRating.toFixed(1)}`);
  await updateDoc(doc(db, COLLECTIONS.PROVIDERS, providerId), {
    averageRating: Math.round(averageRating * 10) / 10,
    reviewCount,
    updatedAt: serverTimestamp(),
  });
}
