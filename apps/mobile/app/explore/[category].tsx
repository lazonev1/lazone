import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import ProviderListItem from '@/components/home/ProviderListItem';

export default function CategoryScreen() {
  const { category } = useLocalSearchParams();
  const router = useRouter();

  // Fake data for now
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
            // image={require('@/assets/images/sarah.png')}
          onPress={() => {
            router.push(`/provider/${provider.id}`);
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


// const scrollTo = (ref) => {
//     if (ref.current && scrollRef.current) {
//         ref.current.measure((x, y, width, height, pageX, pageY) => {
//             scrollRef.current.scrollTo({ y: pageY, animated: true });
//           });
//     }
//   };