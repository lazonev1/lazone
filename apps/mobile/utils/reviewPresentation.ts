import type { Review } from '@/types/provider';

export const REVIEW_SORT_ORDERS = ['recent', 'highest', 'lowest'] as const;
export type ReviewSortOrder = typeof REVIEW_SORT_ORDERS[number];

function dateRank(date: string): number {
  const value = Date.parse(date);
  return Number.isFinite(value) ? value : Number.NEGATIVE_INFINITY;
}

export function sortReviews(reviews: readonly Review[], order: ReviewSortOrder): Review[] {
  return [...reviews].sort((left, right) => {
    if (order !== 'recent') {
      const leftValid = Number.isInteger(left.rating) && left.rating >= 1 && left.rating <= 5;
      const rightValid = Number.isInteger(right.rating) && right.rating >= 1 && right.rating <= 5;
      if (leftValid !== rightValid) return leftValid ? -1 : 1;
      if (leftValid && left.rating !== right.rating) {
        return order === 'highest' ? right.rating - left.rating : left.rating - right.rating;
      }
    }
    const leftDate = dateRank(left.date);
    const rightDate = dateRank(right.date);
    if (leftDate !== rightDate) return leftDate > rightDate ? -1 : 1;
    return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
  });
}
