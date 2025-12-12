export interface Location {
  formattedAddress: string;
  country: string;
  city: string;
  coordinates: {
    longitude: number;
    latitude: number;
  };
}
