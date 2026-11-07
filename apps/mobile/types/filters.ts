export interface SearchFilters {
  query: string;
  radius: number;
  city: string;
  maxPrice: number;
  minRating: number;
  remoteOnly: boolean;
}

export const DEFAULT_FILTERS: SearchFilters = {
  query: '',
  radius: 50,
  remoteOnly: false,
  city: '',
  maxPrice: 2000000,
  minRating: 0,
};

export const FILTER_RANGES = {
  radius: { minimumValue: 1, maximumValue: 50, step: 1 },
  price: { minimumValue: 0, maximumValue: 2000000, step: 1000 },
  rating: { minimumValue: 0, maximumValue: 5, step: 0.5 },
};
