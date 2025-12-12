/**
 * Repositories Index
 *
 * Central export point for all repositories.
 * This allows for cleaner imports in hooks:
 *
 * Instead of:
 *   import { messageRepository } from '@/repositories/messageRepository';
 *   import { reviewRepository } from '@/repositories/reviewRepository';
 *
 * You can do:
 *   import { messageRepository, reviewRepository } from '@/repositories';
 */

export { messageRepository } from './messageRepository';
export { reviewRepository } from './reviewRepository';

// Export types for convenience
export type { MessageRepository } from './messageRepository';
export type { ReviewRepository } from './reviewRepository';

