// Basic types for simple structures
export type RegistrationStep =
  | "business-info" // Step 1: Basic business info + location
  | "service-details"; // Step 2: Services + portfolio

export type Coordinates = {
  latitude: number;
  longitude: number;
};

// Added Review and ReviewStats types
export type Review = {
  id: string;
  clientName: string;
  clientAvatar?: any;
  rating: number;
  comment: string;
  date: string;
  serviceId?: string;
  serviceName?: string;
  images?: string[]; // URLs of attached images
  isHelpful?: number; // Count of helpful votes
  helpfulBy?: string[]; // User IDs who marked this review as helpful
  userId?: string; // The ID of the user who created this review
  response?: {
    text: string;
    date: string;
  };
};

export type ReviewStats = {
  averageRating: number;
  totalReviews: number;
  ratingCounts: number[];
};

// Interfaces for complex objects that might need extension
export interface ProviderRegistration {
  businessName: string;
  serviceCategory: string;
  phone: string;
  description: string;
  location: {
    country: string;
    city: string;
    coordinates?: Coordinates;
  };
  languages: string[];
  remoteService: boolean;

  // Portfolio
  portfolio: PortfolioItem[];
  services: ServiceItem[];
  certifications: Certification[];
}

export interface PortfolioItem {
  id: string;
  image: string;
  caption?: string;
  tags?: string[];
}

export interface ServiceItem {
  id: string;
  name: string;
  description: string;
  price: string;
  availability?: string; // Optional: when the service is available
  errors?: Partial<Record<'name' | 'description' | 'price', string>>;
}

export interface CertificationErrors {
  name?: string;
  issuer?: string;
  date?: string;
  document?: string;
}

export interface CertificationValidationResult {
  isValid: boolean;
  errors: CertificationErrors;
}

export interface Certification {
  id: string;
  name: string;
  issuer: string;
  date: string;
  document?: string;
  documentType?: string;
  documentName?: string;
  errors?: CertificationErrors;
}

/**
 * ViewModel for a Provider with all data populated/expanded
 * This is what you get after fetching a Provider from Firestore and populating all references
 */
export interface ProviderViewModel {
  id: number | string;
  name: string;
  /** Provider-facing fields retained so the registration form can be edited. */
  businessName?: string;
  phoneNumber?: string;
  profession: string;
  categoryName: string;
  remoteService: boolean;
  rating: number; // averageRating from Provider model
  reviews: number; // reviewCount from Provider model
  bio: string;
  avatar: any; // Image source (require or URL)
  cover: any; // coverImage source
  location: Coordinates;
  locationDetails?: {
    country: string;
    city: string;
  };
  distance?: number; // Calculated distance from user
  portfolio: PortfolioItem[];
  services: ServiceItem[];
  reviewItems: Review[];
  pricing: string;
}

// Alias for backward compatibility (can be removed later)
export type ProviderWithDetails = ProviderViewModel;
