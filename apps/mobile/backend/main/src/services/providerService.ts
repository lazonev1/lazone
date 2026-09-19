import {collection, doc, getDoc, getDocs, query, serverTimestamp, updateDoc, where, writeBatch} from "firebase/firestore";
import {auth, db} from "../config/firebase";
import {Provider} from "../models/Provider";
import {Review} from "../models/Review";
import {Portfolio} from "../models/Portfolio";
import {Service} from "../models/Services";
import {User} from "../models/User";

/**
 * Backend Service Layer - Direct Firestore Operations
 * Returns database models with DocumentReference fields
 * Does NOT transform data for UI consumption
 */

/**
 * Fetches a single provider document by ID
 */
export async function getProviderById(providerId: string): Promise<Provider | null> {
  try {
    const providerDoc = await getDoc(doc(db, "providers", providerId));

    if (!providerDoc.exists()) {
      return null;
    }

    return { _id: providerDoc.id, ...providerDoc.data() } as Provider;
  } catch (error) {
    console.error("Error fetching provider:", error);
    throw error;
  }
}

/**
 * Fetches all provider documents
 */
export async function getAllProviders(): Promise<Provider[]> {
  try {
    const providersSnapshot = await getDocs(query(collection(db, "providers"), where('publicSchemaVersion', '==', 1)));

    return providersSnapshot.docs.map(doc => ({
      _id: doc.id,
      ...doc.data()
    } as Provider));
  } catch (error) {
    console.error("Error fetching all providers:", error);
    throw error;
  }
}

/**
 * Fetches providers by category
 */
export async function getProvidersByCategory(category: string): Promise<Provider[]> {
  try {
    const q = query(collection(db, "providers"), where('publicSchemaVersion', '==', 1));

    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
      _id: doc.id,
      ...doc.data()
    } as Provider)).filter(provider => provider.categoryName === category);
  } catch (error) {
    console.error("Error fetching providers by category:", error);
    throw error;
  }
}

/**
 * Fetches a review document by ID
 */
export async function getReviewById(reviewId: string): Promise<Review | null> {
  try {
    const reviewDoc = await getDoc(doc(db, "reviews", reviewId));

    if (!reviewDoc.exists()) {
      return null;
    }

    return { _id: reviewDoc.id, ...reviewDoc.data() } as Review;
  } catch (error) {
    console.error("Error fetching review:", error);
    throw error;
  }
}

/**
 * Fetches a portfolio document by ID
 */
export async function getPortfolioById(portfolioId: string): Promise<Portfolio | null> {
  try {
    const portfolioDoc = await getDoc(doc(db, "portfolios", portfolioId));

    if (!portfolioDoc.exists()) {
      return null;
    }

    return { id: portfolioDoc.id, ...portfolioDoc.data() } as Portfolio;
  } catch (error) {
    console.error("Error fetching portfolio:", error);
    throw error;
  }
}

/**
 * Fetches services by user ID
 */
export async function getServicesByUserId(userId: string): Promise<Service[]> {
  try {
    const q = query(
      collection(db, "services"),
      where("userId", "==", userId)
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Service));
  } catch (error) {
    console.error("Error fetching services:", error);
    throw error;
  }
}

/**
 * Fetches the signed-in owner's private account document for enrollment.
 */
export async function getOwnUserById(userId: string): Promise<User | null> {
  if (auth.currentUser?.uid !== userId) throw new Error('Cannot read another account');
  try {
    const userDoc = await getDoc(doc(db, "users", userId));

    if (!userDoc.exists()) {
      return null;
    }

    return { _id: userDoc.id, ...userDoc.data() } as User;
  } catch (error) {
    console.error("Error fetching user:", error);
    throw error;
  }
}

/** Publish the provider and promote the account as one Firestore commit. */
export async function createProviderAndPromote(
  userId: string,
  providerData: Omit<Provider, '_id'>
): Promise<string> {
  const batch = writeBatch(db);
  batch.set(doc(db, 'providers', userId), {
    ...providerData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  batch.update(doc(db, 'users', userId), { role: 'both', updatedAt: serverTimestamp() });
  await batch.commit();
  return userId;
}

/**
 * Updates an existing provider document
 */
export async function updateProvider(
  providerId: string,
  updates: Partial<Provider>
): Promise<void> {
  try {
    await updateDoc(doc(db, "providers", providerId), {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error updating provider:", error);
    throw error;
  }
}

/**
 * Search interface for provider queries
 */
export interface ProviderSearchParams {
  query?: string;
  category?: string;
  remoteOnly?: boolean;
  minRating?: number;
}

/**
 * Searches providers with optional filters
 * Note: Firebase doesn't support full-text search, so we fetch and filter client-side
 * For production scale, consider Algolia or Elasticsearch
 */
export async function searchProviders(params: ProviderSearchParams): Promise<Provider[]> {
  try {
    let providers: Provider[];

    // If category is specified, use indexed query
    if (params.category) {
      providers = await getProvidersByCategory(params.category);
    } else {
      providers = await getAllProviders();
    }

    // Apply client-side filters
    return providers.filter((provider) => {
      // Text search filter
      if (params.query) {
        const searchTerm = params.query.toLowerCase().trim();
        const searchableText = [
          provider.firstName,
          provider.lastName,
          provider.businessName,
          provider.profession,
          provider.categoryName,
          provider.bio,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!searchableText.includes(searchTerm)) {
          return false;
        }
      }

      // Remote service filter
      if (params.remoteOnly && !provider.remoteService) {
        return false;
      }

      // Minimum rating filter
      if (params.minRating && (provider.averageRating || 0) < params.minRating) {
        return false;
      }

      return true;
    });
  } catch (error) {
    console.error("Error searching providers:", error);
    throw error;
  }
}
