import { ScrollView, StyleSheet, View, Appearance, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { CATEGORIES } from '@/constants/categories';
import ServiceCategoryCard from '../../components/provider/ServiceCategoryCard';
import { ProviderList } from '@/components/provider/ProviderList';
import SearchBar from '@/components/ui/SearchBar';
import { useState, useEffect, useMemo } from 'react';
import AppHeader from '@/components/ui/AppHeader';
import { useProvider } from '@/hooks/useProvider';
import { useLocation } from '@/hooks/useLocation';
import { useAuth } from '@/contexts/auth';

export default function HomeScreen() {
  const colorScheme = Appearance.getColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const router = useRouter();
  const [searchText, setSearchText] = useState('');
  const [displayedCount, setDisplayedCount] = useState(10);

  const { providers, isLoading, error, fetchAllProviders } = useProvider();
  const { location: userLocation } = useLocation();

  const styles = createStyles(theme, colorScheme);

  // Fetch providers when component mounts or user location updates
  useEffect(() => {
    fetchAllProviders(userLocation);
  }, [fetchAllProviders, userLocation]);

  // Sort providers by rating (highest first)
  const sortedProviders = useMemo(
    () => [...providers].sort((a, b) => b.rating - a.rating),
    [providers]
  );

  // Get providers to display (infinite scroll pagination)
  const displayedProviders = useMemo(
    () => sortedProviders.slice(0, displayedCount),
    [sortedProviders, displayedCount]
  );

  // Load more items when user scrolls near the end
  const handleLoadMore = () => {
    if (displayedCount < sortedProviders.length) {
      setDisplayedCount(prev => prev + 10); // Load 10 more
    }
  };

  const handleSearch = () => {
    if (searchText.trim()) {
      router.push({
        pathname: '/explore/search-results',
        params: { query: searchText.trim() }
      });
    }
  };

  // Header component with categories
  const ListHeaderComponent = () => (
    <>
      <View style={styles.contentPadding}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Popular Services
        </ThemedText>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categories}>
        {CATEGORIES.map((cat) => (
          <ServiceCategoryCard
            key={cat.id}
            id={cat.id}
            name={cat.name}
            icon={cat.icon}
          />
        ))}
      </ScrollView>

      <View style={styles.contentPadding}>
        <ThemedText type="subtitle" style={styles.exploreTitle}>
          Explore beautiful work
        </ThemedText>
      </View>
    </>
  );

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <SafeAreaView style={styles.safeArea}>
        <AppHeader/>
        <SearchBar
          value={searchText}
          onChangeText={setSearchText}
          onSubmit={handleSearch}
        />

        <ProviderList
          providers={displayedProviders}
          isLoading={isLoading}
          error={error}
          onEndReached={handleLoadMore}
          hasMore={displayedCount < sortedProviders.length}
          ListHeaderComponent={ListHeaderComponent}
          emptyMessage="No providers available yet"
        />
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

function createStyles(_theme: any, _colorScheme: any) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
    },
    contentPadding: {
      paddingHorizontal: 16,
    },
    sectionTitle: {
      marginVertical: 8,
    },
    exploreTitle: {
      marginTop: 24,
      marginBottom: 12,
    },
    categories: {
      paddingLeft: 16,
      flexDirection: 'row',
    },
  });
}