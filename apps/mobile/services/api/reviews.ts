import { Review } from '@/types/provider';
import { Providers } from '@/hooks/useProviders';

// Mock implementation that will be replaced with real API calls later
export const reviewsApi = {
  // Get reviews for a provider
  getProviderReviews: async (providerId: string): Promise<Review[]> => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Find provider and return their reviews
    const providerIdNum = parseInt(providerId, 10);
    const provider = Providers.find(p => p.id === providerIdNum);
    
    if (!provider) return [];
    return provider.reviewItems || [];
  },
  
  // Respond to a review
  respondToReview: async (reviewId: string, responseText: string): Promise<Review> => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 700));
    
    // Find the review in all providers
    let foundReview: Review | undefined;
    
    for (const provider of Providers) {
      if (!provider.reviewItems) continue;
      
      const review = provider.reviewItems.find(r => r.id === reviewId);
      if (review) {
        foundReview = review;
        break;
      }
    }
    
    if (!foundReview) {
      throw new Error('Review not found');
    }
    
    // Create updated review with response
    // This doesn't actually persist the data since we're using mock data
    // When we integrate with a real API, this will be replaced with an actual API call
    const updatedReview: Review = {
      ...foundReview,
      response: {
        text: responseText,
        date: new Date().toISOString()
      }
    };
    
    return updatedReview;
  },
  
  // Add a new review
  addReview: async (providerId: string, reviewData: Omit<Review, 'id' | 'date'>): Promise<Review> => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Create a new review with generated ID and current date
    const newReview: Review = {
      ...reviewData,
      id: `review-${Date.now()}`,
      date: new Date().toISOString()
    };
    
    return newReview;
  },
  
  // Delete a review (for admin or user who created the review)
  deleteReview: async (reviewId: string): Promise<void> => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 600));
    
    // In a real implementation, this would make an API call to delete the review
    // For now, we just simulate success
    return Promise.resolve();
  },
  
  // Update a review
  updateReview: async (reviewId: string, reviewData: Partial<Review>): Promise<Review> => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 700));
    
    // Find the review
    let foundReview: Review | undefined;
    
    for (const provider of Providers) {
      if (!provider.reviewItems) continue;
      
      const review = provider.reviewItems.find(r => r.id === reviewId);
      if (review) {
        foundReview = review;
        break;
      }
    }
    
    if (!foundReview) {
      throw new Error('Review not found');
    }
    
    // Return updated review
    // Note: This doesn't actually persist the data
    const updatedReview: Review = {
      ...foundReview,
      ...reviewData
    };
    
    return updatedReview;
  }
};
