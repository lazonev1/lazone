import {collection, doc, DocumentReference, getDoc, getDocs, query, where,} from "firebase/firestore";
import {db} from "@/firebaseConfig"; // Your Firebase config
import {Provider} from "@/backend/main/src/models/Provider";
import {Review} from "@/backend/main/src/models/Review";
import {Portfolio} from "@/backend/main/src/models/Portfolio";
import {Service} from "@/backend/main/src/models/Services";
import {PortfolioItem, ProviderViewModel, Review as ReviewViewModel, ServiceItem,} from "@/types/provider";

/**
 * Fetches a single provider with all details populated
 */
export async function getProviderViewModel(providerId: string): Promise<ProviderViewModel> {
  try {
    // 1. Fetch the provider document
    const providerDoc = await getDoc(doc(db, "providers", providerId));

    if (!providerDoc.exists()) {
      throw new Error(`Provider ${providerId} not found`);
    }

    const provider = providerDoc.data() as Provider;

    // 2. Fetch and populate reviews
    const reviewItems = await populateReviews(provider.reviews);

    // 3. Fetch and populate portfolio
    const portfolioItems = provider.portfolio
      ? await populatePortfolio(provider.portfolio)
      : [];

    // 4. Fetch services for this provider
    const services = await fetchProviderServices(provider._id);

    // 5. Transform to UI model
    return transformToUIModel(providerId, provider, {
      reviewItems,
      portfolioItems,
      services,
    });
  } catch (error) {
    console.error("Error fetching provider:", error);
    throw error;
  }
}

/**
 * Fetches all providers with details
 */
export async function getAllProvidersWithDetails(): Promise<ProviderViewModel[]> {
  try {
    const providersSnapshot = await getDocs(collection(db, "providers"));

    return await Promise.all(
        providersSnapshot.docs.map((doc) => getProviderViewModel(doc.id))
    );
  } catch (error) {
    console.error("Error fetching providers:", error);
    throw error;
  }
}

/**
 * Search providers by category
 */
export async function getProvidersByCategory(category: string): Promise<ProviderViewModel[]> {
  try {
    const q = query(
      collection(db, "providers"),
      where("categoryName", "==", category)
    );

    const snapshot = await getDocs(q);

    return await Promise.all(
        snapshot.docs.map((doc) => getProviderViewModel(doc.id))
    );
  } catch (error) {
    console.error("Error searching providers:", error);
    throw error;
  }
}

// ========== HELPER FUNCTIONS ==========

/**
 * Populates review references into UI review objects
 */
async function populateReviews(
  reviewRefs: DocumentReference[]
): Promise<ReviewViewModel[]> {
  if (!reviewRefs || reviewRefs.length === 0) return [];

  try {
    const reviewDocs = await Promise.all(
      reviewRefs.map((ref) => getDoc(ref))
    );

    return reviewDocs
      .filter((doc) => doc.exists())
      .map((doc) => {
        const data = doc.data() as Review;
        return {
          id: doc.id,
          clientName: "Anonymous", // Would fetch from requesterRef
          rating: data.rating,
          comment: data.comment,
          date: data.createdAt.toDate().toISOString(),
          serviceName: "", // Would fetch from serviceRef
          serviceId: "", // Would get from serviceRef.id
          response:
            data.responses.length > 0
              ? {
                  text: data.responses[0].text,
                  date: data.responses[0].date.toDate().toISOString(),
                }
              : undefined,
        };
      });
  } catch (error) {
    console.error("Error populating reviews:", error);
    return [];
  }
}

/**
 * Populates portfolio reference into portfolio items
 */
async function populatePortfolio(
  portfolioRef: DocumentReference
): Promise<PortfolioItem[]> {
  try {
    const portfolioDoc = await getDoc(portfolioRef);

    if (!portfolioDoc.exists()) {
      return [];
    }

    const portfolio = portfolioDoc.data() as Portfolio;

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
    const q = query(
      collection(db, "services"),
      where("userId", "==", userId)
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => {
      const data = doc.data() as Service;
      return {
        id: doc.id,
        name: data.name,
        description: data.description,
        price: (data.price / 100).toString(), // Convert cents to display
        availability: data.availability, // From Service model
      };
    });
  } catch (error) {
    console.error("Error fetching services:", error);
    return [];
  }
}

/**
 * Transforms Firestore Provider model to UI ProviderViewModel model
 */
function transformToUIModel(
  id: string,
  provider: Provider,
  populated: {
    reviewItems: ReviewViewModel[];
    portfolioItems: PortfolioItem[];
    services: ServiceItem[];
  }
): ProviderViewModel {
  return {
    id,
    name: `${provider.firstName} ${provider.lastName}`,
    profession: provider.profession,
    categoryName: provider.categoryName,
    remoteService: provider.remoteService,
    rating: provider.averageRating,
    reviews: provider.reviewCount,
    bio: provider.bio,
    avatar:
      provider.avatar || require("@/assets/images/avatar-placeholder.png"),
    cover: provider.coverImage || require("@/assets/images/favicon.png"),
    location: provider.location?.coordinates || { latitude: 0, longitude: 0 },
    distance: undefined, // Calculate based on user location
    portfolio: populated.portfolioItems,
    services: populated.services,
    reviewItems: populated.reviewItems,
    pricing: provider.pricing || "Contact for pricing",
  };
}
