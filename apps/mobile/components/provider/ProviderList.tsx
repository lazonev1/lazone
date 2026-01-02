import React from 'react';
import { FlatList, View, StyleSheet, ActivityIndicator, Appearance, ListRenderItem } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import ProviderListItem from '@/components/provider/ProviderListItem';
import { ProviderViewModel } from '@/types/provider';
import { Colors } from '@/constants/Colors';

interface ProviderListProps {
  providers: ProviderViewModel[];
  isLoading: boolean;
  error: Error | null;
  onEndReached?: () => void;
  hasMore?: boolean;
  ListHeaderComponent?: React.ComponentType<any> | React.ReactElement | null;
  emptyMessage?: string;
  contentContainerStyle?: object;
}

/**
 * Reusable ProviderList component
 * Used by Home screen, Category screen, and Search Results
 * Implements infinite scroll with proper loading/empty/error states
 */
export function ProviderList({
  providers,
  isLoading,
  error,
  onEndReached,
  hasMore = false,
  ListHeaderComponent,
  emptyMessage = "No providers found",
  contentContainerStyle,
}: ProviderListProps) {
  const router = useRouter();
  const colorScheme = Appearance.getColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;

  const renderProviderItem: ListRenderItem<ProviderViewModel> = ({ item }) => (
    <View style={styles.providerItemContainer}>
      <ProviderListItem
        id={String(item.id)}
        name={item.name}
        description={item.bio}
        avatar={typeof item.avatar === 'string' ? { uri: item.avatar } : item.avatar}
        rating={item.rating}
        onPress={() => router.push(`/provider/${item.id}`)}
      />
    </View>
  );

  const ListFooterComponent = () => {
    if (!hasMore || providers.length === 0) return null;

    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={theme.tint} />
      </View>
    );
  };

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
        <ThemedText style={styles.emptyText}>{emptyMessage}</ThemedText>
      </View>
    );
  };

  return (
    <FlatList
      data={providers}
      renderItem={renderProviderItem}
      keyExtractor={(item) => String(item.id)}
      ListHeaderComponent={ListHeaderComponent}
      ListFooterComponent={ListFooterComponent}
      ListEmptyComponent={ListEmptyComponent}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      contentContainerStyle={[styles.listContent, contentContainerStyle]}
      removeClippedSubviews={true}
      maxToRenderPerBatch={10}
      updateCellsBatchingPeriod={50}
      initialNumToRender={10}
      windowSize={5}
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    flexGrow: 1,
  },
  providerItemContainer: {
    paddingHorizontal: 16,
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
});

export default ProviderList;

