import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Categories } from '@/constants/categories';
import { Providers } from '@/constants/providers';
import ProviderListItem from '@/components/home/ProviderListItem';
import { useEffect } from 'react'
import { useNavigation } from '@react-navigation/native';
import { ThemedText } from '@/components/ThemedText';

export default function CategoryScreen() {
  const { category } = useLocalSearchParams();
  const router = useRouter();

  const selectedCategory = Categories.find((cat) => cat.name.toLowerCase() === category?.toLowerCase());
  const filteredProviders = Providers.filter((provider) => provider.categoryName.toLowerCase() === category?.toLowerCase());

  if (!selectedCategory) {
    return (
      <View style={styles.container}>
        <ThemedText type="error" style={styles.errorText}>Category not found</ThemedText>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <ThemedText type="title" style={styles.title}>{selectedCategory.name}</ThemedText>
      <ThemedText type="description" style={styles.description}>{selectedCategory.description}</ThemedText>

      {filteredProviders.map((provider) => (
        <ProviderListItem
          key={provider.id}
          name={provider.name}
          description={provider.bio}
          rating={provider.rating}
          onPress={() => {
            router.push(`/provider/${provider.id}`);
          }}
        />
      ))}

      {filteredProviders.length === 0 && (
        <ThemedText type="info" style={styles.noResults}>No providers found in this category.</ThemedText>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
  description: { fontSize: 16, marginBottom: 16 },
  errorText: { fontSize: 18, color: 'red', textAlign: 'center', marginTop: 20 },
  noResults: { fontSize: 16, textAlign: 'center', marginTop: 20 },
});