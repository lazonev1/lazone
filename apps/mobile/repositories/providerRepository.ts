import {DocumentReference} from "firebase/firestore";
import * as ProviderService from "@/backend/main/src/services/providerService";
import {
  PortfolioItem,
  ProviderRegistration,
  ProviderViewModel,
  Review as ReviewViewModel,
  ServiceItem,
} from "@/types/provider";

/**
 * Repository Layer - Transforms Database Models to UI ViewModels
 * Calls backend services to fetch data, then transforms for UI consumption
 * Populates DocumentReference fields with actual data
 */

/**
 * Fetches a single provider with all details populated for UI display
 */
export async function getProviderViewModel(
  providerId: string
): Promise<ProviderViewModel | null> {
  try {
    // 1. Fetch provider from backend service
    const provider = await ProviderService.getProviderById(providerId);

    if (!provider) {
      return null;
    }

    // 2. Fetch and populate reviews
    const reviewItems = await populateReviews(provider.reviews || []);

    // 3. Fetch and populate portfolio
    const portfolioItems = provider.portfolio
      ? await populatePortfolio(provider.portfolio)
      : [];

    // 4. Fetch services for this provider
    const services = await fetchProviderServices(provider._id);

    // 5. Transform to UI ViewModel
    return transformToViewModel(provider, {
      reviewItems,
      portfolioItems,
      services,
    });
  } catch (error) {
    console.error("Error fetching provider view model:", error);
    throw error;
  }
}

/**
 * Fetches all providers with details populated
 */
export async function getAllProvidersWithDetails(): Promise<ProviderViewModel[]> {
  try {
    const providers = await ProviderService.getAllProviders();

    return await Promise.all(
      providers.map(async (provider) => {
        const reviewItems = await populateReviews(provider.reviews || []);
        const portfolioItems = provider.portfolio
          ? await populatePortfolio(provider.portfolio)
          : [];
        const services = await fetchProviderServices(provider._id);

        return transformToViewModel(provider, {
          reviewItems,
          portfolioItems,
          services,
        });
      })
    );
  } catch (error) {
    console.error("Error fetching all providers with details:", error);
    throw error;
  }
}

/**
 * Searches providers by category with details populated
 */
export async function getProvidersByCategory(
  category: string
): Promise<ProviderViewModel[]> {
  try {
    const providers = await ProviderService.getProvidersByCategory(category);

    return await Promise.all(
      providers.map(async (provider) => {
        const reviewItems = await populateReviews(provider.reviews || []);
        const portfolioItems = provider.portfolio
          ? await populatePortfolio(provider.portfolio)
          : [];
        const services = await fetchProviderServices(provider._id);

        return transformToViewModel(provider, {
          reviewItems,
          portfolioItems,
          services,
        });
      })
    );
  } catch (error) {
    console.error("Error fetching providers by category:", error);
    throw error;
  }
}

// ========== HELPER FUNCTIONS ==========

/**
 * Populates review DocumentReferences into UI review objects
 */
async function populateReviews(
  reviewRefs: DocumentReference[]
): Promise<ReviewViewModel[]> {
  if (!reviewRefs || reviewRefs.length === 0) return [];

  try {
    const reviewPromises = reviewRefs.map(async (ref) => {
      const review = await ProviderService.getReviewById(ref.id);

      if (!review) return null;

      // Fetch requester details for client name
      let clientName = "Anonymous";
      if (review.requesterId) {
        const requester = await ProviderService.getUserById(review.requesterId.id);
        if (requester) {
          clientName = `${requester.firstName} ${requester.lastName}`;
        }
      }

      // Fetch service name
      let serviceName = "";
      if (review.serviceId) {
        const services = await ProviderService.getServicesByUserId(review.serviceId.id);
        if (services.length > 0) {
          serviceName = services[0].name;
        }
      }

      return {
        id: review._id,
        clientName: clientName,
        clientAvatar: undefined, // TODO - fetch avatar if available
        rating: review.rating,
        comment: review.comment,
        date: review.createdAt.toDate().toISOString(),
        serviceId: review.serviceId?.id || "",
        serviceName,
        response:
          review.responses && review.responses.length > 0
            ? {
                text: review.responses[0].text,
                date: review.responses[0].date.toDate().toISOString(),
              }
            : undefined,
      };
    });

    const reviews = await Promise.all(reviewPromises);
    return reviews.filter((r) => r !== null) as ReviewViewModel[];
  } catch (error) {
    console.error("Error populating reviews:", error);
    return [];
  }
}

/**
 * Populates portfolio DocumentReference into portfolio items
 */
async function populatePortfolio(
  portfolioRef: DocumentReference
): Promise<PortfolioItem[]> {
  try {
    const portfolio = await ProviderService.getPortfolioById(portfolioRef.id);

    if (!portfolio) {
      return [];
    }

    return portfolio.portfolioImages.map((img) => ({
      id: img.id,
      image: img.image,
      caption: img.caption,
    }));
  } catch (error) {
    console.error("Error populating portfolio:", error);
    return [];
  }
}

/**
 * Fetches services for a provider
 */
async function fetchProviderServices(userId: string): Promise<ServiceItem[]> {
  try {
    const services = await ProviderService.getServicesByUserId(userId);

    return services.map((service) => ({
      id: service.id,
      name: service.name,
      description: service.description,
      price: (service.price / 100).toFixed(2), // Convert cents to display format
      availability: service.availability,
    }));
  } catch (error) {
    console.error("Error fetching services:", error);
    return [];
  }
}

/**
 * Transforms Provider database model to ProviderViewModel for UI
 */
function transformToViewModel(
  provider: any,
  populated: {
    reviewItems: ReviewViewModel[];
    portfolioItems: PortfolioItem[];
    services: ServiceItem[];
  }
): ProviderViewModel {
  return {
    id: provider._id,
    name: `${provider.firstName} ${provider.lastName}`,
    profession: provider.profession,
    categoryName: provider.categoryName,
    remoteService: provider.remoteService,
    rating: provider.averageRating || 0,
    reviews: provider.reviewCount || 0,
    bio: provider.bio || "",
    avatar: provider.avatar || require("@/assets/images/avatar-placeholder.png"),
    cover: provider.coverImage || require("@/assets/images/favicon.png"),
    location: provider.location?.coordinates || { latitude: 0, longitude: 0 },
    distance: undefined, // Calculate based on user location if needed
    portfolio: populated.portfolioItems,
    services: populated.services,
    reviewItems: populated.reviewItems,
    pricing: provider.pricing || "Contact for pricing",
  };
}

/**
 * Creates or updates a provider profile
 * Transforms UI ProviderRegistration data to database Provider model
 * @param userId - The user ID who is creating/updating the provider profile
 * @param providerId - Optional provider ID for update operations
 * @param registrationData - Provider registration data from UI
 * @returns The provider ID (existing or newly created)
 */
export async function createOrUpdateProviderProfile(
  userId: string,
  providerId: string | null,
  registrationData: ProviderRegistration
): Promise<string> {
  try {
    if (providerId) {
      // UPDATE MODE: Only update provider-specific fields
      const providerData: any = {
        businessName: registrationData.businessName,
        profession: registrationData.serviceCategory,
        categoryName: registrationData.serviceCategory,
        bio: registrationData.description,
        remoteService: registrationData.remoteService,
      };

      // Only add location if coordinates are provided
      if (registrationData.location.coordinates) {
        providerData.location = {
          formattedAddress: `${registrationData.location.city}, ${registrationData.location.country}`,
          country: registrationData.location.country,
          city: registrationData.location.city,
          coordinates: {
            longitude: registrationData.location.coordinates.longitude,
            latitude: registrationData.location.coordinates.latitude,
          },
        };
      }

      return await ProviderService.createOrUpdateProvider(userId, providerId, providerData);
    } else {
      // CREATE MODE: Fetch user data and create complete provider document
      const user = await ProviderService.getUserById(userId);

      if (!user) {
        throw new Error(`User not found with ID: ${userId}`);
      }

      // Create complete provider document with all required fields
      const providerData: any = {
        // User base fields (inherited from User)
        phoneNumber: user.phoneNumber,
        firstName: user.firstName,
        lastName: user.lastName,
        dob: user.dob,
        role: "provider",
        verified: user.verified,
        subscriptionType: user.subscriptionType,
        bookmarked: user.bookmarked || [],
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,

        // Provider-specific fields from registration form
        businessName: registrationData.businessName,
        profession: registrationData.serviceCategory,
        categoryName: registrationData.serviceCategory,
        bio: registrationData.description,
        remoteService: registrationData.remoteService,

        // Initialize review fields for new providers
        reviews: [],
        averageRating: 0,
        reviewCount: 0,
      };

      // Only add avatar if it exists
      if (user.avatar) {
        providerData.avatar = user.avatar;
      }

      // Add location: prioritize registration location, fallback to user location
      if (registrationData.location.coordinates) {
        providerData.location = {
          formattedAddress: `${registrationData.location.city}, ${registrationData.location.country}`,
          country: registrationData.location.country,
          city: registrationData.location.city,
          coordinates: {
            longitude: registrationData.location.coordinates.longitude,
            latitude: registrationData.location.coordinates.latitude,
          },
        };
      } else if (user.location) {
        providerData.location = user.location;
      }

      // Create the provider document
      const newProviderId = await ProviderService.createOrUpdateProvider(userId, null, providerData);

      // Update the user's role to "provider" in the users collection
      await ProviderService.updateUserRole(userId, "provider");

      return newProviderId;
    }
  } catch (error) {
    console.error("Error creating or updating provider profile:", error);
    throw error;
  }
}

