import { View, StyleSheet, Image, Pressable, Appearance } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';

type Props = {
  name: string;
  description: string;
  rating: number;
  image?: any;
  onPress?: () => void;
};

export default function ProviderListItem({ name, description, rating, image, onPress }: Props) {
  const colorScheme = Appearance.getColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const styles = createStyles(theme, colorScheme);

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

function createStyles(theme,colorScheme) {
  return StyleSheet.create({
    card: {
      flexDirection: 'row',
      backgroundColor: colorScheme ==='dark'?'#333':theme.background,
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
      color: theme.text,
    },
    description: {
      fontSize: 14,
      color: theme.icon,
    },
    rating: {
      marginTop: 6,
      fontSize: 13,
      color: '#FFD700',
    },
  });
}
