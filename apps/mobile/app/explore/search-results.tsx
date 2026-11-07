import { View, StyleSheet, Appearance, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { useState, useEffect, useMemo } from 'react';
import { Colors } from '@/constants/Colors';
import { ThemedText } from '@/components/ThemedText';
import { ProviderList } from '@/components/provider/ProviderList';
import { useProviderSearch } from '@/hooks/useProviderSearch';
import { useLocation } from '@/hooks/useLocation';
import Slider from '@react-native-community/slider';
import { SearchFilters, DEFAULT_FILTERS, FILTER_RANGES } from '@/types/filters';
import SearchBar from '@/components/ui/SearchBar';
import CheckBox from '@/components/ui/CheckBox';
import { useTranslation } from 'react-i18next';

export default function SearchResultsScreen() {
  const { t } = useTranslation(['explore', 'common']);
  const theme = Appearance.getColorScheme() === 'dark' ? Colors.dark : Colors.light;
  const params = useLocalSearchParams();
  const navigation = useNavigation();
  useEffect(() => { navigation.setOptions({ title: t('search.title') }); }, [navigation, t]);
  const { location, isLoading: locationLoading } = useLocation();
  const [displayedCount, setDisplayedCount] = useState(10);
  const [filters, setFilters] = useState<SearchFilters>(() => {
    const radius = Number(params.radius);
    return {
      ...DEFAULT_FILTERS,
      query: typeof params.query === 'string' ? params.query : '',
      radius: Number.isFinite(radius) && radius >= 1 && radius <= 50 ? radius : DEFAULT_FILTERS.radius,
      remoteOnly: params.remoteOnly === 'true',
    };
  });
  const [showFilters, setShowFilters] = useState(false);
  const distanceEnabled = Boolean(location) && !filters.remoteOnly && !filters.city.trim();
  const searchFilters = useMemo(() => ({
    query: filters.query,
    city: filters.city,
    remoteOnly: filters.remoteOnly,
    minRating: filters.minRating,
    maxPrice: filters.maxPrice < FILTER_RANGES.price.maximumValue ? filters.maxPrice : undefined,
    maxDistance: distanceEnabled && filters.radius < FILTER_RANGES.radius.maximumValue ? filters.radius : undefined,
    userLocation: location,
  }), [distanceEnabled, filters, location]);
  const { providers, isLoading, error, retry } = useProviderSearch(searchFilters);
  const displayedProviders = useMemo(() => providers.slice(0, displayedCount), [providers, displayedCount]);
  const updateFilter = <K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) => {
    setFilters(previous => ({ ...previous, [key]: value }));
    setDisplayedCount(10);
  };

  const header = <View>
    {showFilters && <View style={styles.filters}>
      <ThemedText>{t('search.cityLabel')}</ThemedText>
      <TextInput
        style={[styles.cityInput, { color: theme.text, borderColor: theme.icon }]}
        placeholder={t('search.cityPlaceholder')}
        placeholderTextColor={theme.icon}
        accessibilityLabel={t('search.cityLabel')}
        value={filters.city}
        onChangeText={value => updateFilter('city', value)}
        maxLength={120}
        autoCorrect={false}
      />
      <ThemedText style={styles.hint}>{t('search.cityHint')}</ThemedText>
      <ThemedText>{!distanceEnabled || filters.radius >= FILTER_RANGES.radius.maximumValue
        ? t('search.anyDistance') : t('search.distance', { km: filters.radius })}</ThemedText>
      <Slider
        value={filters.radius}
        disabled={!distanceEnabled}
        onValueChange={value => updateFilter('radius', Math.round(value))}
        {...FILTER_RANGES.radius}
        accessibilityLabel={t('search.distanceLabel')}
        minimumTrackTintColor="#0A58A5"
        thumbTintColor="#0A58A5"
      />
      {filters.remoteOnly && <ThemedText style={styles.hint}>{t('search.remoteDistanceHint')}</ThemedText>}
      <ThemedText>{t('search.minRating', { rating: filters.minRating.toFixed(1) })}</ThemedText>
      <Slider
        value={filters.minRating}
        onValueChange={value => updateFilter('minRating', value)}
        {...FILTER_RANGES.rating}
        accessibilityLabel={t('search.ratingLabel')}
        minimumTrackTintColor="#0A58A5"
        thumbTintColor="#0A58A5"
      />
      <ThemedText>{filters.maxPrice >= FILTER_RANGES.price.maximumValue
        ? t('search.anyPrice') : t('search.maxPrice', { price: filters.maxPrice.toLocaleString() })}</ThemedText>
      <ThemedText style={styles.hint}>{t('search.priceHint')}</ThemedText>
      <Slider
        value={filters.maxPrice}
        onValueChange={value => updateFilter('maxPrice', value)}
        {...FILTER_RANGES.price}
        accessibilityLabel={t('search.priceLabel')}
        minimumTrackTintColor="#0A58A5"
        thumbTintColor="#0A58A5"
      />
      <View style={styles.remoteRow}>
        <CheckBox
          isChecked={filters.remoteOnly}
          setChecked={() => updateFilter('remoteOnly', !filters.remoteOnly)}
          accessibilityLabel={t('search.remoteOnly')}
          color={filters.remoteOnly ? '#0A58A5' : undefined}
        />
        <ThemedText>{t('search.remoteOnly')}</ThemedText>
      </View>
      <Pressable style={styles.button} accessibilityRole="button" onPress={() => setFilters({ ...DEFAULT_FILTERS })}>
        <ThemedText style={styles.link}>{t('search.resetFilters')}</ThemedText>
      </Pressable>
    </View>}
    <View style={styles.resultsHeader}>
      {!locationLoading && !location && !filters.remoteOnly && <ThemedText style={styles.hint}>
        {t('search.locationUnavailable')}
      </ThemedText>}
      {error ? <View accessibilityRole="alert">
        <ThemedText>{t('list.loadFailed')}</ThemedText>
        <Pressable style={styles.button} accessibilityRole="button" onPress={retry}>
          <ThemedText style={styles.link}>{t('common:actions.retry')}</ThemedText>
        </Pressable>
      </View> : <View style={styles.remoteRow}>
        {isLoading && <ActivityIndicator color="#0A58A5" />}
        <ThemedText type="subtitle">{isLoading ? t('search.searching') : t('search.found', { count: providers.length })}</ThemedText>
        {!isLoading && <Pressable accessibilityRole="button" accessibilityLabel={t('search.refresh')} style={styles.button} onPress={retry}>
          <ThemedText style={styles.link}>{t('search.refresh')}</ThemedText>
        </Pressable>}
      </View>}
    </View>
  </View>;

  return <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
    <SearchBar
      value={filters.query}
      onChangeText={value => updateFilter('query', value)}
      showFilterButton
      onFilterPress={() => setShowFilters(value => !value)}
      filterButtonText={showFilters ? t('search.hide') : t('search.filters')}
    />
    <ProviderList
      providers={displayedProviders}
      isLoading={isLoading}
      error={error}
      ListHeaderComponent={header}
      showSearchMetadata
      onEndReached={() => {
        if (displayedCount < providers.length) setDisplayedCount(count => count + 10);
      }}
      hasMore={false}
      emptyMessage={filters.query ? t('search.noMatch', { query: filters.query }) : t('list.empty')}
    />
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  filters: { paddingHorizontal: 16, gap: 6 },
  cityInput: { minHeight: 44, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12 },
  hint: { fontSize: 13, opacity: 0.8, marginBottom: 8 },
  resultsHeader: { paddingHorizontal: 16, paddingVertical: 12 },
  remoteRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  button: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
  link: { color: '#0A58A5', fontWeight: '600' },
});
