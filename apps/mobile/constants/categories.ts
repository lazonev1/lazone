/**
 * Categories - Single Source of Truth
 *
 * All service categories used throughout the app.
 * Used for:
 * - Provider registration form
 * - Home screen category display
 * - Category browsing/filtering
 *
 * Only the `id` (stored in Firebase as categoryName) and `icon` are static;
 * `name` and `description` are translated at call time, so consumers must call
 * the getters during render instead of caching results at module load.
 */

import i18n from '@/localization';

export interface Category {
  id: string;           // URL-safe identifier, stored in Firebase as categoryName
  name: string;         // Display name (localized)
  description: string;  // Description for category page (localized)
  icon: string;         // Emoji icon for display
}

const CATEGORY_DEFS = [
  { id: 'beauty', icon: '💅' },
  { id: 'home', icon: '🏠' },
  { id: 'tech', icon: '💻' },
  { id: 'health', icon: '🏥' },
  { id: 'education', icon: '📚' },
  { id: 'events', icon: '🎉' },
  { id: 'automotive', icon: '🚗' },
  { id: 'legal', icon: '⚖️' },
  { id: 'creative', icon: '🎨' },
  { id: 'fitness', icon: '💪' },
] as const;

export type CategoryId = (typeof CATEGORY_DEFS)[number]['id'];

const toCategory = (def: (typeof CATEGORY_DEFS)[number]): Category => ({
  id: def.id,
  icon: def.icon,
  name: i18n.t(`explore:categories.${def.id}.name`),
  description: i18n.t(`explore:categories.${def.id}.description`),
});

/**
 * All categories with localized names/descriptions
 */
export const getCategories = (): Category[] => CATEGORY_DEFS.map(toCategory);

/**
 * Get category by ID (the value stored in Firebase)
 */
export const getCategoryById = (id: string): Category | undefined => {
  const def = CATEGORY_DEFS.find(c => c.id === id?.toLowerCase());
  return def && toCategory(def);
};

/**
 * Get category by localized display name
 */
export const getCategoryByName = (name: string): Category | undefined =>
  getCategories().find(c => c.name.toLowerCase() === name?.toLowerCase());

/**
 * Get options formatted for SelectList component
 */
export const getCategoryOptions = () =>
  getCategories().map(c => ({ label: c.name, value: c.id }));
