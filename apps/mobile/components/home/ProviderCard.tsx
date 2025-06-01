import { View, Image, StyleSheet, Pressable } from 'react-native';
import { ThemedText } from '@/components/ThemedText';

type Props = {
  name: string;
  service: string;
  image?: any;
  onPress?: () => void;
};

export default function ProviderCard({ name, service, image, onPress }: Props) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      {image ? (
        <Image source={image} style={styles.image} />
      ) : (
        <View style={styles.imagePlaceholder}>
          <ThemedText type="defaultSemiBold" style={styles.imageText}>👷</ThemedText>
        </View>
      )}
      <ThemedText type="defaultSemiBold" style={styles.name}>
        {name}
      </ThemedText>
      <ThemedText type="default" style={styles.service}>
        {service}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 140,
    marginRight: 12,
    backgroundColor: '#1c1c1e',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
  },
  image: {
    width: 100,
    height: 80,
    borderRadius: 8,
    resizeMode: 'cover',
    marginBottom: 8,
  },
  imagePlaceholder: {
    width: 100,
    height: 80,
    backgroundColor: '#444',
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageText: {
    fontSize: 24,
  },
  name: {
    fontSize: 14,
    textAlign: 'center',
  },
  service: {
    fontSize: 12,
    textAlign: 'center',
  },
});
