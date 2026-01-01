/**
 * useCategories Hook
 *
 * Re-exports from the single source of truth in constants/categories.ts
 * Kept for backward compatibility with existing imports.
 */

export {
  CATEGORIES,
  Categories,
  getCategoryById,
  getCategoryByName,
  getCategoryOptions,
  type Category
} from '@/constants/categories';

