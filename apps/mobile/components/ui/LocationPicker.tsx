import { View, StyleSheet, Appearance, Alert, Linking } from 'react-native';
import { useState } from 'react';
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
  countryError?: string;
  cityError?: string;
};

export function LocationPicker({ value = { country: '', city: '' }, onChange, countryError, cityError }: Props) {
  const [loading, setLoading] = useState(false);
  const [locationError, setLocationError] = useState<string>('');
  const colorScheme = Appearance.getColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const styles = createStyles(theme, colorScheme);

  const requestLocationPermission = async () => {
    try {
      // First check current permission status
      const { status: currentStatus } = await Location.getForegroundPermissionsAsync();

      if (currentStatus === 'denied') {
        // If previously denied, show dialog to open settings
        Alert.alert(
          'Location Permission Required',
          'Please enable location access in your settings to use this feature.',
          [
            {
              text: 'Open Settings',
              onPress: () => Linking.openSettings(),
            },
            {
              text: 'Cancel',
              style: 'cancel',
            },
          ]
        );
        return false;
      }

      // Always request permission regardless of current status
      const { status: newStatus } = await Location.requestForegroundPermissionsAsync();
      return newStatus === 'granted';
    } catch (error) {
      console.error('Error requesting permission:', error);
      return false;
    }
  };

  // Function to get the current location
  const getCurrentLocation = async () => {
    setLoading(true);
    setLocationError('');

    try {
      const permissionGranted = await requestLocationPermission();

      if (!permissionGranted) {
        setLocationError('Location access is required');
        return;
      }

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
    } catch (error) {
      console.error('Error getting location:', error);
      setLocationError('Unable to get location. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.countryPicker}>
        <ThemedText style={styles.label}>Country</ThemedText>
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
        {countryError && <ThemedText style={styles.error}>{countryError}</ThemedText>}
      </View>

      <TextBox
        label="City/Region"
        value={value.city}
        onChangeText={(city) => onChange({ ...value, city })}
        placeholder="Enter your city or region"
        style={styles.cityInput}
        error={cityError}
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

      {locationError && <ThemedText style={styles.error}>{locationError}</ThemedText>}
    </View>
  );
}

const createStyles = (theme, colorScheme) => StyleSheet.create({
  container: {
    gap: 16,
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
  coordinates: {
    fontSize: 14,
  },
  error: {
    color: '#FF3B30',
    fontSize: 14,
    marginTop: 4,
  },
  coordinatesLabel: {
    fontSize: 16,
  },
  locationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
});
