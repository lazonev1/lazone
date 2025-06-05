import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import ProviderListItem from '@/components/home/ProviderListItem';
import { useEffect } from 'react'
import { useNavigation } from '@react-navigation/native';

export default function CategoryScreen() {
  const { category } = useLocalSearchParams();
  const router = useRouter();

  // Fake data for now
  const providers = [
    { id: 1, name: 'Sarah Tailor', service: category },
    { id: 2, name: 'Moussa Fix', service: category },
    { id: 3, name: 'Fatou Creative', service: category },
  ];

  const navigation = useNavigation();

  //Capitalise the first char
  const capitalizedCategory = category.charAt(0).toUpperCase() + category.slice(1);
  useEffect(() => {
    navigation.setOptions({ title: capitalizedCategory });
  }, [capitalizedCategory]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <ThemedText type="title" style={{ marginBottom: 20 }}>
        {capitalizedCategory}
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