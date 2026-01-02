/**
 * Categories - Single Source of Truth
 *
 * All service categories used throughout the app.
 * Used for:
 * - Provider registration form
 * - Home screen category display
 * - Category browsing/filtering
 */

export interface Category {
  id: string;           // URL-safe identifier, stored in Firebase as categoryName
  name: string;         // Display name
  description: string;  // Description for category page
  icon: string;         // Emoji icon for display
}

export const CATEGORIES: Category[] = [
  { id: 'beauty', name: 'Beauty & Wellness', description: 'Hair, makeup, spa and wellness services', icon: '💅' },
  { id: 'home', name: 'Home Services', description: 'Plumbing, electrical, cleaning and repairs', icon: '🏠' },
  { id: 'tech', name: 'Technology', description: 'IT support, development and tech services', icon: '💻' },
  { id: 'health', name: 'Healthcare', description: 'Medical and health-related services', icon: '🏥' },
  { id: 'education', name: 'Education', description: 'Tutoring, courses and training', icon: '📚' },
  { id: 'events', name: 'Events', description: 'Catering, photography and event planning', icon: '🎉' },
  { id: 'automotive', name: 'Automotive', description: 'Car repair, detailing and maintenance', icon: '🚗' },
  { id: 'legal', name: 'Legal Services', description: 'Legal advice and documentation', icon: '⚖️' },
  { id: 'creative', name: 'Creative & Design', description: 'Graphic design, art and creative services', icon: '🎨' },
  { id: 'fitness', name: 'Fitness', description: 'Personal training and fitness coaching', icon: '💪' },
];

/**
 * Get category by ID (the value stored in Firebase)
 */
export const getCategoryById = (id: string): Category | undefined =>
  CATEGORIES.find(c => c.id.toLowerCase() === id?.toLowerCase());

/**
 * Get category by display name
 */
export const getCategoryByName = (name: string): Category | undefined =>
  CATEGORIES.find(c => c.name.toLowerCase() === name?.toLowerCase());

/**
 * Get options formatted for SelectList component
 */
export const getCategoryOptions = () =>
  CATEGORIES.map(c => ({ label: c.name, value: c.id }));

/**
 * For backward compatibility - re-export as Categories array
 * Used by components that expect { name, description } format
 */
export const Categories = CATEGORIES.map(c => ({
  name: c.name,
  id: c.id,
  description: c.description,
  icon: c.icon,
}));

