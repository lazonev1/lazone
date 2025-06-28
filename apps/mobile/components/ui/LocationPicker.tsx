import { View, StyleSheet, Appearance } from 'react-native';
import { useState} from 'react';
import * as Location from 'expo-location';
import { Button } from '@lazone/ui';
import { ThemedText } from '@/components/ThemedText';
import CountryPicker from 'react-native-country-picker-modal';
import { Colors } from '@/constants/Colors';
import { TextBox } from '@/components/ui/TextBox';

type LocationData = {
  country: string;
  city: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
};

type Props = {
  value: LocationData;
  onChange: (location: LocationData) => void;
  error?: string;
};

export function LocationPicker({ value = { country: '', city: '' }, onChange, error }: Props) {
  const [loading, setLoading] = useState(false);
  const [locationError, setLocationError] = useState<string>('');
  const colorScheme = Appearance.getColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const styles = createStyles(theme, colorScheme);

  const getCurrentLocation = async () => {
    setLoading(true);
    setLocationError('');

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        
        onChange({
          ...value,
          coordinates: {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          },
        });
      } else {
        setLocationError('Please allow location access to continue');
      }
    } catch (error) {
      console.error('Location error:', error);
      setLocationError('Unable to get location');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.countryPicker}>
        <ThemedText style={styles.label}>Location</ThemedText>
        <CountryPicker
          withFilter
          withFlag
          withCountryNameButton
          countryCode={value.country || 'BF'}
          onSelect={(country) => 
            onChange({ ...value, country: country.cca2 })
          }
          containerButtonStyle={styles.countryButton}
          theme={{
            backgroundColor: theme.background,
            onBackgroundTextColor: theme.text,
          }}
        />
      </View>

      <TextBox
        label="City/Region"
        value={value.city}
        onChangeText={(city) => onChange({ ...value, city })}
        placeholder="Enter your city or region"
        style={styles.cityInput}
      />

      <View style={styles.locationHeader}>
        <ThemedText style={styles.coordinatesLabel}>Coordinates</ThemedText>
        <Button
          label={loading ? "Getting..." : "Get Location"}
          onPress={getCurrentLocation}
          variant="secondary"
          size="small"
          style={styles.locationButton}
          disabled={loading}
        />
      </View>
      
      {value.coordinates && (
        <View style={styles.coordinatesContainer}>
          <ThemedText style={styles.coordinates}>
            📍 {value.coordinates.latitude.toFixed(6)}, {value.coordinates.longitude.toFixed(6)}
          </ThemedText>
        </View>
      )}

      {error && <ThemedText style={styles.error}>{error}</ThemedText>}
    </View>
  );
}

const createStyles = (theme, colorScheme) => StyleSheet.create({
  container: {
    gap: 16,
    marginBottom: 16,
  },
  label: {
    marginBottom: 8,
    color: theme.text,
  },
  countryPicker: {
    marginBottom: 8,
  },
  countryButton: {
    borderWidth: 1,
    borderColor: colorScheme === 'dark' ? '#333' : '#ccc',
    borderRadius: 8,
    padding: 12,
  },
  coordinatesContainer: {
    marginTop: 8,
  },
  locationButton: {
    marginVertical: 8,
  },
  coordinates: {
    marginTop: 8,
    fontSize: 14,
  },
  error: {
    color: '#FF3B30',
    fontSize: 14,
    marginTop: 4,
  },
  coordinatesLabel: {
    color: theme.text,
    fontSize: 16,
  },
  cityInput: {
    marginTop: 12,
  },
  locationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
});
