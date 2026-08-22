import { View, StyleSheet, Appearance } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Colors } from '@/constants/Colors';
import { ThemedText } from '@/components/ThemedText';
import { ProviderList } from '@/components/provider/ProviderList';
import { useProvider } from '@/hooks/useProvider';
import { useLocation } from '@/hooks/useLocation';
import Slider from '@react-native-community/slider';
import { SearchFilters, DEFAULT_FILTERS, FILTER_RANGES } from '@/types/filters';
import SearchBar from '@/components/ui/SearchBar';
import CheckBox from '@/components/ui/CheckBox';
import { useTranslation } from 'react-i18next';

export default function SearchResultsScreen() {
  const { t } = useTranslation('explore');
  const colorScheme = Appearance.getColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const styles = createStyles(theme);
  const params = useLocalSearchParams();

  const navigation = useNavigation();
  useEffect(() => {
    navigation.setOptions({ title: t('search.title') });
  }, [navigation, t]);

  // Get user's current location for distance calculation
  const { location: userLocation } = useLocation();

  // Fetch real providers using search
  const { providers, isLoading: providersLoading, error, searchProviders } = useProvider();
  const [displayedCount, setDisplayedCount] = useState(10);

  // Use the SearchFilters type and DEFAULT_FILTERS
  const [filters, setFilters] = useState<SearchFilters>({
    ...DEFAULT_FILTERS,
    query: params.query ? String(params.query) : '',
    radius: params.radius ? Number(params.radius) : DEFAULT_FILTERS.radius,
    remoteOnly: params.remoteOnly === 'true',
  });

  const [showFilters, setShowFilters] = useState(false);

  // Execute search when filters or location change
  const executeSearch = useCallback(() => {
    searchProviders({
      query: filters.query || undefined,
      remoteOnly: filters.remoteOnly || undefined,
      minRating: filters.minRating > 0 ? filters.minRating : undefined,
      maxPrice: filters.maxPrice < DEFAULT_FILTERS.maxPrice ? filters.maxPrice : undefined,
      maxDistance: filters.radius < FILTER_RANGES.radius.maximumValue ? filters.radius : undefined,
      userLocation: userLocation,
    });
  }, [filters, userLocation, searchProviders]);

  // Initial search and when filters/location change
  useEffect(() => {
    executeSearch();
  }, [executeSearch]);

  // Paginated providers (already sorted by rating from backend)
  const displayedProviders = useMemo(
    () => providers.slice(0, displayedCount),
    [providers, displayedCount]
  );

  const handleLoadMore = () => {
    if (displayedCount < providers.length) {
      setDisplayedCount(prev => prev + 10);
    }
  };

  const updateFilter = (key: keyof SearchFilters, value: number | string | boolean) => {
    setFilters((prev: SearchFilters) => ({ ...prev, [key]: value }));
    setDisplayedCount(10); // Reset pagination when filters change
  };

  return (
    <SafeAreaView style={styles.container}>
      <SearchBar
        value={filters.query}
        onChangeText={(value) => updateFilter('query', value)}
        showFilterButton={true}
        onFilterPress={() => setShowFilters(!showFilters)}
        filterButtonText={showFilters ? t('search.hide') : t('search.filters')}
      />

      {/* Filters Section */}
      {showFilters && (
        <View style={styles.filtersContainer}>
          {/* Distance Filter */}
          <View style={styles.filterItem}>
            <ThemedText>{t('search.distance', { km: filters.radius })}</ThemedText>
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
            <ThemedText>{t('search.minRating', { rating: filters.minRating.toFixed(1) })}</ThemedText>
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
            <ThemedText>{t('search.maxPrice', { price: filters.maxPrice })}</ThemedText>
            <Slider
              value={filters.maxPrice}
              onValueChange={(value) => updateFilter('maxPrice', value)}
              {...FILTER_RANGES.price}
              minimumTrackTintColor={'#0A58A5'}
              thumbTintColor={'#0A58A5'}
            />
          </View>
          {/* Remote Services Only */}
          <View style={{ flexDirection: 'row',alignItems: 'center'}}>
            <CheckBox
              isChecked={filters.remoteOnly}
              setChecked={() => updateFilter('remoteOnly', !filters.remoteOnly)}
              color={filters.remoteOnly ? '#0A58A5' : undefined}
            />
            <ThemedText style={{ marginLeft: 8 }}>
              {t('search.remoteOnly')}
            </ThemedText>
          </View>
        </View>
      )}

      {/* Results Header */}
      <View style={styles.resultsHeader}>
        <ThemedText type="subtitle">
          {providersLoading ? t('search.searching') : t('search.found', { count: providers.length })}
        </ThemedText>
      </View>

      {/* Results List */}
      <ProviderList
        providers={displayedProviders}
        isLoading={providersLoading}
        error={error}
        onEndReached={handleLoadMore}
        hasMore={displayedCount < providers.length}
        emptyMessage={
          filters.query
            ? t('search.noMatch', { query: filters.query })
            : t('search.noneWithin', { km: filters.radius })
        }
      />
    </SafeAreaView>
  );
}

function createStyles(theme: any) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    filtersContainer: {
      paddingHorizontal: 16,
      paddingBottom: 16,
      borderBottomColor: theme.border,
    },
    filterItem: {
      marginBottom: 5,
      borderRadius: 8,
      color: theme.text,
      backgroundColor: theme.background,
    },
    resultsHeader: {
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
  });
}