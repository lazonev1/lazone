import { useState, useEffect, useCallback } from "react";
import {
  getProviderViewModel,
  getAllProvidersWithDetails,
  getProvidersByCategory,
  createOrUpdateProviderProfile,
} from "@/repositories/providerRepository";
import { ProviderViewModel, ProviderRegistration } from "@/types/provider";

/**
 * Hook Layer - State Management Wrapper for React Components
 * Uses repository methods and manages loading/error states
 * Provides convenience methods for UI interactions
 */

export interface UseProviderResult {
  provider: ProviderViewModel | null;
  providers: ProviderViewModel[];
  isLoading: boolean;
  error: Error | null;
  fetchAllProviders: () => Promise<void>;
  fetchProvidersByCategory: (category: string) => Promise<void>;
  refetch: () => Promise<void>;
  saveProviderProfile: (
    userId: string,
    providerId: string | null,
    registrationData: ProviderRegistration
  ) => Promise<string>;
}

/**
 * Custom hook for managing provider data in React components
 * @param providerId - Optional provider ID to fetch a single provider
 */
export const useProvider = (providerId?: string): UseProviderResult => {
  const [provider, setProvider] = useState<ProviderViewModel | null>(null);
  const [providers, setProviders] = useState<ProviderViewModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch single provider when providerId is provided
  useEffect(() => {
    if (providerId) {
      setIsLoading(true);
      setError(null);

      getProviderViewModel(providerId)
        .then((data: ProviderViewModel | null) => {
          setProvider(data);
          setIsLoading(false);
        })
        .catch((err: Error) => {
          setError(err);
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, [providerId]);

  /**
   * Fetches all providers with details
   */
  const fetchAllProviders = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await getAllProvidersWithDetails();
      setProviders(data);
    } catch (err: any) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Fetches providers by category
   */
  const fetchProvidersByCategory = useCallback(async (category: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await getProvidersByCategory(category);
      setProviders(data);
    } catch (err: any) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Refetches the current provider data
   */
  const refetch = useCallback(async () => {
    if (!providerId) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await getProviderViewModel(providerId);
      setProvider(data);
    } catch (err: any) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [providerId]);

  /**
   * Creates or updates a provider profile
   * @param userId - The user ID creating/updating the provider profile
   * @param providerId - Optional provider ID for updates (null for new providers)
   * @param registrationData - The provider registration data from the form
   * @returns The provider ID (existing or newly created)
   */
  const saveProviderProfile = useCallback(
    async (
      userId: string,
      providerId: string | null,
      registrationData: ProviderRegistration
    ): Promise<string> => {
      setIsLoading(true);
      setError(null);

      try {
        const resultProviderId = await createOrUpdateProviderProfile(
          userId,
          providerId,
          registrationData
        );

        // If we were tracking this provider, refetch it
        if (providerId === resultProviderId) {
          const updatedProvider = await getProviderViewModel(resultProviderId);
          setProvider(updatedProvider);
        }

        return resultProviderId;
      } catch (err: any) {
        setError(err);
        throw err; // Re-throw so the caller can handle the error
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return {
    provider,
    providers,
    isLoading,
    error,
    fetchAllProviders,
    fetchProvidersByCategory,
    refetch,
    saveProviderProfile,
  };
};

