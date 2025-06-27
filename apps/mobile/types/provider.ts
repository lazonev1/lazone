export interface ProviderRegistration {
  // Basic Info
  businessName: string;
  serviceCategory: string;
  phone: string;
  description: string;
  location: {
    country: string;
    city: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
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
  duration?: string;
  availability?: string;
}

export interface Certification {
  id: string;
  name: string;
  issuer: string;
  date: string;
  document?: string;
}

export type RegistrationStep = 
  | 'business-info'   // Step 1: Basic business info + location
  | 'service-details'; // Step 2: Services + portfolio
