/**
 * Repositories Index
 *
 * Central export point for all repositories.
 * This allows for cleaner imports in hooks:
 *
 * Instead of:
 *   import * as messageRepository from '@/repositories/messageRepository';
 *   import * as reviewRepository from '@/repositories/reviewRepository';
 *
 * You can do:
 *   import { messageRepository, reviewRepository } from '@/repositories';
 */

export * as messageRepository from './messageRepository';
export * as reviewRepository from './reviewRepository';
export * as earningRepository from './earningRepository';

