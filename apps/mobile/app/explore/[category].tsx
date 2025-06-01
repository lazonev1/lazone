import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import ProviderCard from '@/components/home/ProviderCard';
import ProviderListItem from '@/components/home/ProviderListItem';

export default function CategoryScreen() {
  const { category } = useLocalSearchParams();

  // Fake data for now — will come from API later
  const providers = [
    { id: 1, name: 'Sarah Tailor', service: category },
    { id: 2, name: 'Moussa Fix', service: category },
    { id: 3, name: 'Fatou Creative', service: category },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <ThemedText type="title" style={{ marginBottom: 20 }}>
        {category}
      </ThemedText>

      {providers.map((provider) => (
        <ProviderListItem
            key={provider.id}
            name={provider.name}
            description="Experienced electricians for all installations."
            rating={4.7}
            // image={require('@/assets/providers/sarah.png')}
            onPress={() => {
                // TODO: navigate to provider profile
            }}
            />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
});
