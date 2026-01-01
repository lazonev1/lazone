import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, View, SafeAreaView } from 'react-native';
import { getCategoryById } from '@/constants/categories';
import { useProvider } from '@/hooks/useProvider';
import { ProviderList } from '@/components/provider/ProviderList';
import { useEffect, useMemo, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { ThemedText } from '@/components/ThemedText';

export default function CategoryScreen() {
  const { category } = useLocalSearchParams();
  const categoryId = String(category);
  const navigation = useNavigation();
  const [displayedCount, setDisplayedCount] = useState(10);

  const { providers, isLoading, error, fetchProvidersByCategory } = useProvider();

  // Find category by ID (the URL parameter)
  const selectedCategory = getCategoryById(categoryId);

  // Fetch providers when category changes - no auth required for browsing
  useEffect(() => {
    if (selectedCategory) {
      fetchProvidersByCategory(selectedCategory.id);
    }
  }, [selectedCategory, fetchProvidersByCategory]);

  // Filter and sort providers by rating
  // Match by category ID since that's what's stored in Firebase
  const sortedProviders = useMemo(() => {
    const filtered = providers.filter(
      (provider) => provider.categoryName.toLowerCase() === categoryId.toLowerCase()
    );
    return [...filtered].sort((a, b) => b.rating - a.rating);
  }, [providers, categoryId]);

  // Paginated providers
  const displayedProviders = useMemo(
    () => sortedProviders.slice(0, displayedCount),
    [sortedProviders, displayedCount]
  );

  const handleLoadMore = () => {
    if (displayedCount < sortedProviders.length) {
      setDisplayedCount(prev => prev + 10);
    }
  };

  useEffect(() => {
    if (selectedCategory) {
      navigation.setOptions({ title: selectedCategory.name });
    }
  }, [selectedCategory, navigation]);

  if (!selectedCategory) {
    return (
      <SafeAreaView style={[styles.container, styles.centerContainer]}>
        <ThemedText style={styles.errorText}>Category not found</ThemedText>
      </SafeAreaView>
    );
  }

  // Header with category info
  const ListHeaderComponent = () => (
    <View style={styles.header}>
      <ThemedText type="title" style={styles.title}>{selectedCategory.name}</ThemedText>
      <ThemedText style={styles.description}>{selectedCategory.description}</ThemedText>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ProviderList
        providers={displayedProviders}
        isLoading={isLoading}
        error={error}
        onEndReached={handleLoadMore}
        hasMore={displayedCount < sortedProviders.length}
        ListHeaderComponent={ListHeaderComponent}
        emptyMessage={`No providers found in ${selectedCategory.name}`}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    marginBottom: 16,
    opacity: 0.7,
  },
  errorText: {
    fontSize: 18,
    color: '#ff4444',
    textAlign: 'center',
  },
});