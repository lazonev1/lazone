import { View, StyleSheet, ScrollView, ActivityIndicator, Appearance, SafeAreaView } from 'react-native';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { Colors } from '@/constants/Colors';
import { ThemedText } from '@/components/ThemedText';
import ProviderListItem from '@/components/home/ProviderListItem';
import { Providers } from '@/constants/providers';
import Slider from '@react-native-community/slider';
import { SearchFilters, DEFAULT_FILTERS, FILTER_RANGES } from '@/types/filters';
import SearchBar from '@/components/ui/SearchBar';

export default function SearchResultsScreen() {
  const colorScheme = Appearance.getColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const styles = createStyles(theme);
  const router = useRouter();
  const params = useLocalSearchParams();

  const navigation = useNavigation();
  useEffect(() => {
    navigation.setOptions({ title: 'Search' });
  }, ['Search']);

  // Use the SearchFilters type and DEFAULT_FILTERS
  const [filters, setFilters] = useState<SearchFilters>({
    ...DEFAULT_FILTERS,
    query: String(params.query) ?? '',
    radius: Number(params.radius) || DEFAULT_FILTERS.radius,
  });

  const [loading, setLoading] = useState(false);
  const [filteredProviders, setFilteredProviders] = useState([]);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    console.log('Current filters:', filters);
    setLoading(true);
    
    const results = Providers.filter((provider) => {
      //searching with query, radius,rating and price
      const searchTerm = filters.query.toLowerCase().trim();
      const matchesSearch = !searchTerm || 
        provider.name.toLowerCase().includes(searchTerm) ||
        provider.profession.toLowerCase().includes(searchTerm);
      
      const withinRadius = provider.distance <= filters.radius;
      const meetsRating = provider.rating >= filters.minRating;
      const meetsPrice = 
        provider.services.some(service => {
          const priceRange = service.price.split(' - ').map(price => parseFloat(price.replace(/[^0-9.-]+/g, '')));
          return priceRange[0] >= filters.minPrice && priceRange[1] <= filters.maxPrice;
        });
      // Combine all conditions
      return matchesSearch && withinRadius && meetsRating && meetsPrice;
    });

    setFilteredProviders(results);
    setLoading(false);
  }, [filters]);

  const updateFilter = (key: keyof SearchFilters, value: number | string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  return (
    <SafeAreaView style={styles.container}>
      <SearchBar
        value={filters.query}
        onChangeText={(value) => updateFilter('query', value)}
        showFilterButton={true}
        onFilterPress={() => setShowFilters(!showFilters)}
        filterButtonText={showFilters ? 'Hide' : 'Filters'}
      />

      {/* Filters Section */}
      {showFilters && (
        <View style={styles.filtersContainer}>
          {/* Distance Filter */}
          <View style={styles.filterItem}>
            <ThemedText>Distance: {filters.radius}km</ThemedText>
            <Slider
              value={filters.radius}
              onValueChange={(value) => updateFilter('radius', Math.round(value))}
              {...FILTER_RANGES.radius}
              minimumTrackTintColor={'#0A58A5'}
              thumbTintColor={'#0A58A5'}
            />
          </View>

          {/* Rating Filter */}
          <View style={styles.filterItem}>
            <ThemedText>Minimum Rating: {filters.minRating.toFixed(1)}⭐</ThemedText>
            <Slider
              value={filters.minRating}
              onValueChange={(value) => updateFilter('minRating', value)}
              {...FILTER_RANGES.rating}
              minimumTrackTintColor={'#0A58A5'}
              thumbTintColor={'#0A58A5'}
            />
          </View>

          {/* Price Filter */}
          <View style={styles.filterItem}>
            <ThemedText>Maximum Price: {filters.maxPrice}CFA</ThemedText>
            <Slider
              value={filters.maxPrice}
              onValueChange={(value) => updateFilter('maxPrice', value)}
              {...FILTER_RANGES.price}
              minimumTrackTintColor={'#0A58A5'}
              thumbTintColor={'#0A58A5'}
            />
          </View>
        </View>
      )}

      {/* Results List */}
      <ScrollView style={styles.resultsContainer}>
        <ThemedText type="subtitle" style={styles.resultsHeader}>
          {loading ? 'Searching...' : `Found ${filteredProviders.length} results`}
        </ThemedText>

        {loading ? (
          <ActivityIndicator color={theme.tint} style={{ marginTop: 20 }} />
        ) : filteredProviders.length > 0 ? (
          filteredProviders.map((provider) => (
            <ProviderListItem
              key={provider.id}
              name = {provider.name}
              description={provider.bio}
              avatar={provider.avatar}
              rating={provider.rating}
              onPress={() => router.push(`/provider/${provider.id}`)}
            />
            
          ))
        ) : (
          <ThemedText style={styles.noResults}>
            No providers found within {filters.radius}km
            {filters.query ? ` matching "${filters.query}"` : ''}
          </ThemedText>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      padding: 16,
    },
    filtersContainer: {
      padding: 16,
      borderBottomColor: theme.border,
    },
    filterItem: {
      marginBottom: 5,
      borderRadius: 8,
      color : theme.text,
      backgroundColor: theme.background,
    },
    resultsContainer: {
      flex: 1,
      padding: 16,
    },
    resultsHeader: {
      padding: 16,
      marginBottom: 8,
      borderBottomColor: theme.border,
    },
    noResults: {
      textAlign: 'center',
      padding: 20,
    },
  });
}