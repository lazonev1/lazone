import {collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where,} from "firebase/firestore";
import {db} from "../config/firebase";
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
    const providersSnapshot = await getDocs(collection(db, "providers"));

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
    const q = query(
      collection(db, "providers"),
      where("categoryName", "==", category)
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
      _id: doc.id,
      ...doc.data()
    } as Provider));
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
 * Fetches a user document by ID
 */
export async function getUserById(userId: string): Promise<User | null> {
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

/**
 * Creates a new provider document
 * Uses the userId as the document ID for better security rule matching
 * @param userId - The user ID to use as the provider document ID
 * @param providerData - Provider data to create
 */
export async function createProvider(
  userId: string,
  providerData: Omit<Provider, "_id">
): Promise<string> {
  try {
    await setDoc(doc(db, "providers", userId), {
      ...providerData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return userId;
  } catch (error) {
    console.error("Error creating provider:", error);
    throw error;
  }
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
 * Creates or updates a provider profile
 * If providerId is provided, updates existing provider; otherwise creates new one
 * @param userId - The user ID (used as provider document ID for new providers)
 * @param providerId - Optional ID for update operation
 * @param providerData - Provider data to create or update
 * @returns The provider ID (existing or newly created)
 */
export async function createOrUpdateProvider(
  userId: string,
  providerId: string | null,
  providerData: Partial<Provider>
): Promise<string> {
  try {
    if (providerId) {
      // Update existing provider
      await updateProvider(providerId, providerData);
      return providerId;
    } else {
      // Create new provider with userId as document ID
      return await createProvider(userId, providerData as Omit<Provider, "_id">);
    }
  } catch (error) {
    console.error("Error creating or updating provider:", error);
    throw error;
  }
}

/**
 * Updates a user's role in the users collection
 * @param userId - The user ID to update
 * @param role - The new role to set
 */
export async function updateUserRole(
  userId: string,
  role: "requester" | "provider" | "both"
): Promise<void> {
  try {
    await updateDoc(doc(db, "users", userId), {
      role,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error updating user role:", error);
    throw error;
  }
}

