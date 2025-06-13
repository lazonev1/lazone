export interface SearchFilters {
  query: string;
  radius: number;
  minPrice: number;
  maxPrice: number;
  minRating: number;
}

export const DEFAULT_FILTERS: SearchFilters = {
  query: '',
  radius: 20,
  minPrice: 0,
  maxPrice: 200000, // 2,000,000 CF
  minRating: 0,
};

export const FILTER_RANGES = {
  radius: { minimumValue: 1, maximumValue: 50, step: 1 },
  price: { minimumValue: 0, maximumValue: 900000, step: 50 },
  rating: { minimumValue: 0, maximumValue: 5, step: 0.5 },
};
