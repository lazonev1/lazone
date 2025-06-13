import { View, StyleSheet, Appearance, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import Slider from '@react-native-community/slider';
import { Colors } from '@/constants/Colors';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Button } from '@react-navigation/elements';
import { DEFAULT_FILTERS } from '@/types/filters';
import SearchBar from '@/components/ui/SearchBar';

export default function SearchLocatorScreen() {
  const colorScheme = Appearance.getColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const styles = createStyles(theme);
  const router = useRouter();

  const [query, setQuery] = useState(DEFAULT_FILTERS.query);
  const [radius, setRadius] = useState(DEFAULT_FILTERS.radius);

  const handleSearch = () => {
    router.push({
      pathname: '/explore/search-results',
      params: {
        query: query.trim(),
        radius: radius.toString(),
      },
    });
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={styles.container}>
        <SearchBar
          value={query}
          onChangeText={setQuery}
          onSubmit={handleSearch}
          showSearchButton={true}
        />

        <View style={styles.sliderBlock}>
          <ThemedText type="defaultSemiBold">Search Radius: {radius} km</ThemedText>
          <Slider
            value={radius}
            onValueChange={setRadius}
            minimumValue={1}
            maximumValue={50}
            step={1}
            minimumTrackTintColor={'#0A58A5'}
            thumbTintColor={'#0A58A5'}
          />
        </View>

        <Button style={styles.searchButton} onPress={handleSearch}>
          <ThemedText style={styles.submitText}>Search</ThemedText>
        </Button>
      </View>
    </TouchableWithoutFeedback>
  );
}

function createStyles(theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      padding: 16,
      justifyContent: 'center',
    },
    sliderBlock: {
      marginBottom: 40,
    },
    searchButton: {
      backgroundColor: '#0A58A5',
      paddingVertical: 14,
      borderRadius: 10,
      alignItems: 'center',
    },
    submitText: {
      color: '#fff',
      fontWeight: 'bold',
    },
  });
}
