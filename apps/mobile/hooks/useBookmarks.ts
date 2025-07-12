import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// TODO: Replace with API endpoints when backend is ready
// API Endpoints: 
// - GET /api/users/bookmarks - Get all bookmarked providers
// - POST /api/users/bookmarks/{providerId} - Add bookmark
// - DELETE /api/users/bookmarks/{providerId} - Remove bookmark

const BOOKMARK_PROVIDERS_KEY = 'bookmarked_providers';

export function useBookmarks() {
  const [bookmarkedProviders, setBookmarkedProviders] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load all bookmarked providers
  useEffect(() => {
    const loadBookmarks = async () => {
      try {
        setIsLoading(true);
        
        // TODO: Replace with API call
        // const response = await apiClient.get('/api/users/bookmarks');
        // const providers = response.data;
        
        const storedBookmarks = await AsyncStorage.getItem(BOOKMARK_PROVIDERS_KEY);
        const providers = storedBookmarks ? JSON.parse(storedBookmarks) : [];
        
        setBookmarkedProviders(providers);
      } catch (error) {
        console.error('Error loading bookmarks:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadBookmarks();
  }, []);

  // Check if a provider is bookmarked
  const isBookmarked = useCallback((providerId: string) => {
    return bookmarkedProviders.includes(providerId);
  }, [bookmarkedProviders]);

  // Toggle bookmark status
  const toggleBookmark = useCallback(async (providerId: string) => {
    try {
      let updatedBookmarks: string[];
      
      if (isBookmarked(providerId)) {
        // TODO: Replace with API call
        // await apiClient.delete(`/api/users/bookmarks/${providerId}`);
        
        updatedBookmarks = bookmarkedProviders.filter(id => id !== providerId);
      } else {
        // TODO: Replace with API call
        // await apiClient.post(`/api/users/bookmarks/${providerId}`);
        
        updatedBookmarks = [...bookmarkedProviders, providerId];
      }
      
      // This will be handled by the API in the future
      await AsyncStorage.setItem(BOOKMARK_PROVIDERS_KEY, JSON.stringify(updatedBookmarks));
      
      setBookmarkedProviders(updatedBookmarks);
      return true;
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      return false;
    }
  }, [bookmarkedProviders, isBookmarked]);

  return {
    bookmarkedProviders,
    isBookmarked,
    toggleBookmark,
    isLoading
  };
}
