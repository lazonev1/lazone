import { FlatList, ScrollView, StyleSheet, View, Appearance, SafeAreaView, TouchableWithoutFeedback, Keyboard, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import ServiceCategoryCard from '../../components/provider/ServiceCategoryCard';
import ProviderListItem from '@/components/provider/ProviderListItem';
import { Categories } from '@/hooks/useCategories';
import SearchBar from '@/components/ui/SearchBar';
import { useState, useEffect, useMemo } from 'react';
import AppHeader from '@/components/ui/AppHeader';
import { useProvider } from '@/hooks/useProvider';

export default function HomeScreen() {
  const colorScheme = Appearance.getColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const router = useRouter();
  const [searchText, setSearchText] = useState('');
  const [displayedCount, setDisplayedCount] = useState(10); // Initial batch size

  // Use the real useProvider hook to fetch all providers
  const { providers, isLoading, error, fetchAllProviders } = useProvider();

  const styles = createStyles(theme, colorScheme);

  // Fetch all providers when component mounts
  useEffect(() => {
    fetchAllProviders();
  }, [fetchAllProviders]);

  // Sort providers by rating (highest first) - memoized for performance
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

  // Render individual provider item
  const renderProviderItem = ({ item }: any) => (
    <View style={styles.providerItemContainer}>
      <ProviderListItem
        name={item.name}
        id={String(item.id)}
        avatar={typeof item.avatar === 'string' ? { uri: item.avatar } : item.avatar}
        description={item.bio}
        rating={item.rating}
        onPress={() => {
          router.push(`/provider/${item.id}`);
        }}
      />
    </View>
  );

  // Header component (categories section)
  const ListHeaderComponent = () => (
    <>
      <View style={styles.contentPadding}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Popular Services
        </ThemedText>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categories}>
        {Categories.map((cat, index) => (
          <ServiceCategoryCard key={cat.name || index} name={cat.name} />
        ))}
      </ScrollView>

      <View style={styles.contentPadding}>
        <ThemedText type="subtitle" style={styles.exploreTitle}>
          Explore beautiful work
        </ThemedText>
      </View>
    </>
  );

  // Footer component (loading indicator)
  const ListFooterComponent = () => {
    if (displayedCount >= sortedProviders.length) return null;

    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={theme.tint} />
      </View>
    );
  };

  // Empty state component
  const ListEmptyComponent = () => {
    if (isLoading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.tint} />
          <ThemedText style={styles.loadingText}>Loading providers...</ThemedText>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.centerContainer}>
          <ThemedText style={styles.errorText}>Failed to load providers</ThemedText>
          <ThemedText style={styles.errorSubtext}>{error.message}</ThemedText>
        </View>
      );
    }

    return (
      <View style={styles.centerContainer}>
        <ThemedText style={styles.emptyText}>No providers found</ThemedText>
      </View>
    );
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <SafeAreaView style={styles.safeArea}>
        <AppHeader/>
        <SearchBar
          value={searchText}
          onChangeText={setSearchText}
          onSubmit={handleSearch}
        />

        <FlatList
          data={displayedProviders}
          renderItem={renderProviderItem}
          keyExtractor={(item) => String(item.id)}
          ListHeaderComponent={ListHeaderComponent}
          ListFooterComponent={ListFooterComponent}
          ListEmptyComponent={ListEmptyComponent}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5} // Trigger when 50% from bottom
          contentContainerStyle={styles.listContent}
          removeClippedSubviews={true} // Performance optimization
          maxToRenderPerBatch={10} // Render 10 items per batch
          updateCellsBatchingPeriod={50} // Update every 50ms
          initialNumToRender={10} // Render 10 items initially
          windowSize={5} // Keep 5 screens worth of items in memory
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
    listContent: {
      flexGrow: 1,
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
    centerContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 40,
    },
    loadingText: {
      marginTop: 12,
      fontSize: 14,
      opacity: 0.7,
    },
    errorText: {
      fontSize: 16,
      color: '#ff4444',
      marginBottom: 4,
    },
    errorSubtext: {
      fontSize: 14,
      opacity: 0.7,
      textAlign: 'center',
    },
    emptyText: {
      fontSize: 16,
      opacity: 0.7,
    },
    footerLoader: {
      paddingVertical: 20,
      alignItems: 'center',
    },
    providerItemContainer: {
      paddingHorizontal: 16,
    },
  });
}