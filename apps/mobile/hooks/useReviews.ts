import { useCallback, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import type { Review } from '@/types/provider';
import {
  getProviderReviews,
  updateReview as repoUpdateReview,
  deleteReview as repoDeleteReview,
  respondToReview as repoRespondToReview,
  markReviewHelpful,
  calculateReviewStats,
} from '@/repositories/reviewRepository';

const EMPTY_REVIEWS: Review[] = [];

export function useReviews(providerId?: string, userId?: string) {
  // A fresh scope prevents stale reads/mutations (including private vote state)
  // appearing after switching providers or authentication sessions.
  const scope = useMemo(() => ({ providerId, userId }), [providerId, userId]);
  type ReviewState = { scope: typeof scope; reviews: Review[]; loading: boolean; error: boolean };
  const [state, setState] = useState<ReviewState | null>(null);
  const latestRequest = useRef(0);
  const focusedScope = useRef<typeof scope | null>(null);
  const pendingVotes = useRef(new Set<string>());
  const mutationVersion = useRef(0);

  const refreshReviews = useCallback(async () => {
    if (!scope.providerId) return;
    const request = ++latestRequest.current;
    const version = mutationVersion.current;
    setState(previous => ({
      scope, reviews: previous?.scope === scope ? previous.reviews : EMPTY_REVIEWS, loading: true, error: false,
    }));
    try {
      const reviews = await getProviderReviews(scope.providerId);
      if (request === latestRequest.current) {
        if (version === mutationVersion.current) {
          setState({ scope, reviews, loading: false, error: false });
        } else {
          setState(previous => previous?.scope === scope ? { ...previous, loading: false } : previous);
        }
      }
    } catch {
      if (request === latestRequest.current) {
        setState(previous => ({
          scope, reviews: previous?.scope === scope ? previous.reviews : EMPTY_REVIEWS, loading: false, error: true,
        }));
      }
    }
  }, [scope]);

  useFocusEffect(useCallback(() => {
    focusedScope.current = scope;
    void refreshReviews();
    return () => { focusedScope.current = null; latestRequest.current++; };
  }, [refreshReviews, scope]));

  const updateList = (apply: (reviews: Review[]) => Review[]) => {
    if (focusedScope.current !== scope) return;
    mutationVersion.current++;
    setState(previous => previous?.scope === scope ? { ...previous, reviews: apply(previous.reviews) } : previous);
  };

  const updateReview = async (reviewId: string, data: { rating?: number; comment?: string }) => {
    await repoUpdateReview(reviewId, data);
    updateList(reviews => reviews.map(item => item.id === reviewId ? {
      ...item, rating: data.rating ?? item.rating, comment: data.comment?.trim() ?? item.comment,
    } : item));
  };

  const deleteReview = async (reviewId: string) => {
    await repoDeleteReview(reviewId);
    updateList(reviews => reviews.filter(item => item.id !== reviewId));
  };

  const respondToReview = async (reviewId: string, responseText: string) => {
    await repoRespondToReview(reviewId, responseText);
    updateList(reviews => reviews.map(item => item.id === reviewId
      ? { ...item, response: { text: responseText.trim(), date: '' } }
      : item));
    // Re-read the server timestamp without making the saved reply depend on it.
    if (focusedScope.current === scope) void refreshReviews();
  };

  const markHelpful = async (reviewId: string) => {
    if (!scope.userId) throw new Error('Please sign in to vote');
    const voteKey = JSON.stringify([scope.userId, reviewId]);
    if (pendingVotes.current.has(voteKey)) return;
    pendingVotes.current.add(voteKey);
    const patchVote = (patch: Partial<Review>) => updateList(reviews =>
      reviews.map(item => item.id === reviewId ? { ...item, ...patch } : item));

    patchVote({ isHelpfulPending: true });
    try {
      const result = await markReviewHelpful(reviewId);
      patchVote({ isHelpful: result.newCount, hasCurrentUserHelpfulVote: result.added });
    } finally {
      pendingVotes.current.delete(voteKey);
      patchVote({ isHelpfulPending: false });
    }
  };

  const current = state?.scope === scope ? state : null;
  const reviews = current?.reviews ?? EMPTY_REVIEWS;
  const stats = useMemo(() => calculateReviewStats(reviews), [reviews]);
  return {
    reviews, stats,
    isLoading: Boolean(providerId && (!current || current.loading)),
    hasLoadError: current?.error ?? false,
    updateReview, deleteReview, respondToReview, markHelpful, refreshReviews,
  };
}
