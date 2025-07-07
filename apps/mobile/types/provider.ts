// Basic types for simple structures
export type RegistrationStep = 
  | 'business-info'   // Step 1: Basic business info + location
  | 'service-details'; // Step 2: Services + portfolio

export type Coordinates = {
  latitude: number;
  longitude: number;
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
}

export interface CertificationErrors {
  name?: string;
  issuer?: string;
  date?: string;
  document?: string;
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

