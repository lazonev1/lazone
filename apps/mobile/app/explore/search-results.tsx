import { View, StyleSheet, ScrollView, Image, TextInput, ActivityIndicator, Appearance } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { Colors } from '@/constants/Colors';
import { ThemedText } from '@/components/ThemedText';
import ProviderListItem from '@/components/home/ProviderListItem';
import { useNavigation } from '@react-navigation/native';

// To be finished later, need filters and Real map in place of the logo
export default function SearchResultsScreen() {
  const colorScheme = Appearance.getColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const styles = createStyles(theme);
  const router = useRouter();

  const params = useLocalSearchParams();
  const [query, setQuery] = useState(params.query ?? '');
  const [radius, setRadius] = useState(Number(params.radius) || 15);

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);

  const navigation = useNavigation();
    useEffect(() => {
      navigation.setOptions({ title: 'Search' });
    }, ['Search']);

  useEffect(() => {
    if (!query.trim()) return;

    setLoading(true);

    // Simulated API fetch; to be replaced by backend call
    setTimeout(() => {
      const fakeResults = [
        {
          id: 1,
          name: 'John\'s Plumbing Services',
          description: 'Highly rated plumbing solutions for your home.',
          rating: 4.8,
        },
        {
          id: 2,
          name: 'Electric Solutions Co.',
          description: 'Experienced electricians for all installations.',
          rating: 4.7,
        },
        {
          id: 3,
          name: 'Crafty Carpentry',
          description: 'Custom carpentry services with a touch of art.',
          rating: 4.6,
        },
      ].filter(p => p.name.toLowerCase().includes(query.toLowerCase()));

      setResults(fakeResults);
      setLoading(false);
    }, 600);

    //API:
    // fetch(`/api/search?query=${query}&radius=${radius}`)
    //   .then(res => res.json())
    //   .then(setResults)
    //   .finally(() => setLoading(false));

  }, [query, radius]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search for services..."
        placeholderTextColor={theme.icon}
        style={styles.searchInput}
      />

      <Image
        source={require('@/assets/images/lazone-logo.png')} //require('@/assets/images/search-map-preview.png')
        style={styles.map}
      />

      <ThemedText type="subtitle" style={{ marginBottom: 10 }}>
        {loading ? 'Searching...' : 'Nearby Service Providers'}
      </ThemedText>

      {loading && <ActivityIndicator color={theme.tint} />}

      {!loading && results.map((provider) => (
        <ProviderListItem
          key={provider.id}
          name={provider.name}
          description={provider.description}
          rating={provider.rating}
          onPress={() => router.push(`/provider/${provider.id}`)}
        />
      ))}

      {!loading && results.length === 0 && (
        <ThemedText>No results found for "{query}".</ThemedText>
      )}
    </ScrollView>
  );
}

function createStyles(theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    content: {
      padding: 20,
    },
    searchInput: {
      borderRadius: 12,
      backgroundColor: theme.background === '#fff' ? '#f2f2f2' : '#222',
      color: theme.text,
      padding: 14,
      fontSize: 16,
      marginBottom: 16,
    },
    map: {
      width: '100%',
      height: 180,
      borderRadius: 12,
      marginBottom: 16,
    },
  });
}