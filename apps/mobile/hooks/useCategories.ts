/**
 * useCategories Hook
 *
 * Re-exports from the single source of truth in constants/categories.ts
 * Kept for backward compatibility with existing imports.
 */

export {
  getCategories,
  getCategoryById,
  getCategoryByName,
  getCategoryOptions,
  type Category,
  type CategoryId,
} from '@/constants/categories';
