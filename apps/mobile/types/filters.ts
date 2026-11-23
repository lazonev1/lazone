export interface SearchFilters {
  query: string;
  radius: number;
  minPrice: number;
  maxPrice: number;
  minRating: number;
  remoteOnly: boolean;
}

export const FILTER_RANGES = {
  radius: { minimumValue: 1, maximumValue: 50, step: 1 },
  price: { minimumValue: 0, maximumValue: 900000, step: 50 },
  rating: { minimumValue: 0, maximumValue: 5, step: 0.5 },
};

export const DEFAULT_FILTERS: SearchFilters = {
  query: '',
  // Do not silently hide providers with unknown or distant coordinates.
  // Customers can opt into a distance limit from the filters panel.
  radius: FILTER_RANGES.radius.maximumValue,
  remoteOnly: false,
  minPrice: 0,
  maxPrice: 2000000, // 2,000,000 CF
  minRating: 0,
};
