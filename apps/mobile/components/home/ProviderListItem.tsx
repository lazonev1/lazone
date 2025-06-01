import { View, StyleSheet, Image, Pressable } from 'react-native';
import { ThemedText } from '@/components/ThemedText';

type Props = {
  name: string;
  description: string;
  rating: number;
  image?: any;
  onPress?: () => void;
};

export default function ProviderListItem({ name, description, rating, image, onPress }: Props) {
  return (
    <Pressable onPress={onPress} style={styles.card}>
      <Image
        source={image ?? require('@/assets/images/avatar-placeholder.png')}
        style={styles.avatar}
      />

      <View style={styles.info}>
        <ThemedText type="defaultSemiBold" style={styles.name}>
          {name}
        </ThemedText>
        <ThemedText style={styles.description}>
          {description}
        </ThemedText>
        <ThemedText style={styles.rating}>
          {rating.toFixed(1)} ★
        </ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#333',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    marginRight: 12,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: '#ccc',
  },
  rating: {
    marginTop: 6,
    fontSize: 13,
    color: '#ffd700', // gold-ish star color
  },
});
