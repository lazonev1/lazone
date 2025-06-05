import { View, StyleSheet, TextInput, Appearance } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import Slider from '@react-native-community/slider';
import { Colors } from '@/constants/Colors';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Button } from '@react-navigation/elements';

export default function SearchLocatorScreen() {
  const colorScheme = Appearance.getColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const styles = createStyles(theme);
  const router = useRouter();

  const [query, setQuery] = useState('');
  const [radius, setRadius] = useState(5);

  // const handleSearch = () => {
  //   if (!query.trim()) return;
  //   // router.push(`/search-results?query=${query.trim()}&radius=${radius}`);
  //   router.push('/search-results')
  // };

  const handleSearch = () => {
    if (!query.trim()) return;
  
    router.push({
      pathname: '/explore/search-results',
      params: {
        query: query.trim(),
        radius: radius.toString(),
      },
    });
  };

  return (
    <ThemedView style={styles.container}>
      <TextInput
        placeholder="Search for a service (e.g. electrician)"
        placeholderTextColor={theme.icon}
        value={query}
        onChangeText={setQuery}
        style={styles.searchInput}
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
    </ThemedView>
  );
}

function createStyles(theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
      padding: 20,
      justifyContent: 'center',
    },
    searchInput: {
      borderRadius: 12,
      backgroundColor: theme.background === '#fff' ? '#f2f2f2' : '#222',
      color: theme.text,
      padding: 14,
      fontSize: 16,
      marginBottom: 24,
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
    actionButton: {
      backgroundColor: '#0A58A5',
      paddingVertical: 10,
      paddingHorizontal: 24,
      borderRadius: 24,
    },
    submitText: {
      color: '#fff',
      fontWeight: 'bold',
    },
  });
}
