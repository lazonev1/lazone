import { View, Image, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';

type Props = {
  name: string;
  image?: any;
};

export default function ServiceCategoryCard({ name, image }: Props) {
  const router = useRouter();

  return (
    <Pressable
      style={styles.card}
      onPress={() => router.push(`/explore/${name.toLowerCase()}`)}
    >
      {image ? (
        <Image source={image} style={styles.image} />
      ) : (
        <View style={styles.imagePlaceholder}>
          <ThemedText type="defaultSemiBold" style={styles.imageText}>🛠</ThemedText>
        </View>
      )}
      <ThemedText type="defaultSemiBold" style={styles.label}>
        {name}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 100,
    alignItems: 'center',
    marginRight: 12,
    backgroundColor: '#1c1c1e',
    borderRadius: 12,
    padding: 10,
  },
  image: {
    width: 60,
    height: 60,
    borderRadius: 8,
    resizeMode: 'cover',
    marginBottom: 6,
  },
  imagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  imageText: {
    fontSize: 24,
  },
  label: {
    textAlign: 'center',
    fontSize: 14,
  },
});