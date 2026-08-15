import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  orderBy,
  runTransaction,
} from "firebase/firestore";
import { auth, db, COLLECTIONS } from "../config/firebase";
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
  bookingId: string;
  serviceId: string;
  rating: number;
  comment: string;
  images?: string[];
}): Promise<string> {
  console.log('[ReviewService] Creating review for provider:', reviewData.providerId);

  try {
    const normalizedComment = reviewData.comment.trim();
    if (!reviewData.bookingId || !reviewData.serviceId) {
      throw new Error("A review must be linked to a completed booking");
    }
    if (!Number.isInteger(reviewData.rating) || reviewData.rating < 1 || reviewData.rating > 5) {
      console.warn('[ReviewService] Invalid rating:', reviewData.rating);
      throw new Error("Rating must be between 1 and 5");
    }
    if (normalizedComment.length > 500) {
      throw new Error("Review comments must be 500 characters or fewer");
    }
    if (!auth?.currentUser || auth.currentUser.uid !== reviewData.requesterId) {
      throw new Error("You must be signed in as the requester to leave this review");
    }

    const bookingSnapshot = await getDoc(doc(db, COLLECTIONS.BOOKINGS, reviewData.bookingId));
    if (!bookingSnapshot.exists()) throw new Error("Booking not found");
    const booking = bookingSnapshot.data();
    if (
      booking.status !== "completed" ||
      booking.requesterId !== reviewData.requesterId ||
      booking.providerId !== reviewData.providerId ||
      booking.serviceId !== reviewData.serviceId
    ) {
      throw new Error("Reviews are only available for your completed booking");
    }

    console.log('[ReviewService] Saving review to Firestore...');

    // Use the booking ID as the review ID. This makes the one-review-per-booking
    // invariant atomic and prevents duplicate reviews during retries or races.
    const reviewRef = doc(db, COLLECTIONS.REVIEWS, reviewData.bookingId);
    await runTransaction(db, async (transaction) => {
      const existing = await transaction.get(reviewRef);
      if (existing.exists()) throw new Error("You have already reviewed this booking");
      transaction.set(reviewRef, {
        providerId: reviewData.providerId,
        requesterId: reviewData.requesterId,
        bookingId: reviewData.bookingId,
        serviceId: reviewData.serviceId,
        rating: reviewData.rating,
        comment: normalizedComment,
        images: reviewData.images || [],
        responses: [],
        isHelpful: 0,
        helpfulBy: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });

    console.log('[ReviewService] Review created with ID:', reviewRef.id);

    console.log('[ReviewService] Review creation complete');
    await recalculateProviderRating(reviewData.providerId);
    return reviewRef.id;
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
    if (updates.rating !== undefined && (!Number.isInteger(updates.rating) || updates.rating < 1 || updates.rating > 5)) {
      throw new Error("Rating must be between 1 and 5");
    }
    if (updates.comment !== undefined && updates.comment.trim().length > 500) {
      throw new Error("Review comments must be 500 characters or fewer");
    }

    const currentReview = await getReviewById(reviewId);
    if (!currentReview) {
      throw new Error("Review not found");
    }

    await updateDoc(doc(db, COLLECTIONS.REVIEWS, reviewId), {
      ...updates,
      ...(updates.comment !== undefined ? { comment: updates.comment.trim() } : {}),
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
    const normalizedResponse = responseText.trim();
    if (!normalizedResponse || normalizedResponse.length > 500) {
      throw new Error("Responses must be between 1 and 500 characters");
    }
    if (!auth?.currentUser) throw new Error("You must be signed in to respond");
    const reviewRef = doc(db, COLLECTIONS.REVIEWS, reviewId);
    await runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(reviewRef);
      if (!snapshot.exists()) throw new Error("Review not found");
      const review = snapshot.data();
      if (review.providerId !== auth.currentUser.uid) throw new Error("Only the provider can respond");
      transaction.update(reviewRef, {
        // A single editable provider response is clearer than an ever-growing
        // response history and avoids duplicate responses on retries.
        responses: [{ text: normalizedResponse, date: new Date() }],
        updatedAt: serverTimestamp(),
      });
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
    if (!auth?.currentUser || auth.currentUser.uid !== userId) throw new Error("You must be signed in to vote");
    const reviewRef = doc(db, COLLECTIONS.REVIEWS, reviewId);
    return runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(reviewRef);
      if (!snapshot.exists()) throw new Error("Review not found");
      const review = snapshot.data();
      if (review.requesterId === userId) throw new Error("You cannot vote on your own review");
      const helpfulBy = Array.isArray(review.helpfulBy) ? review.helpfulBy : [];
      const hasVoted = helpfulBy.includes(userId);
      const nextHelpfulBy = hasVoted ? helpfulBy.filter((id: string) => id !== userId) : [...helpfulBy, userId];
      transaction.update(reviewRef, {
        isHelpful: nextHelpfulBy.length,
        helpfulBy: nextHelpfulBy,
        updatedAt: serverTimestamp(),
      });
      return { added: !hasVoted, newCount: nextHelpfulBy.length };
    });
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
