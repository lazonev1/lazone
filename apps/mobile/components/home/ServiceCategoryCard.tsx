import { View, Image, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { Appearance } from 'react-native';
import { Colors } from '@/constants/Colors';

type Props = {
  name: string;
  image?: any;
};

export default function ServiceCategoryCard({ name, image }: Props) {
  const router = useRouter();
  const colorScheme = Appearance.getColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const styles = createStyles(theme, colorScheme);

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

function createStyles(theme, colorScheme) {
  return StyleSheet.create({
    card: {
      width: 100,
      alignItems: 'center',
      marginRight: 12,
      backgroundColor: colorScheme ==='dark'?'#1c1c1e':theme.background,
      borderRadius: 12,
      padding: 10,
      shadowColor: theme.icon,
      shadowOpacity: 0.15,
      shadowRadius: 6,
      elevation: 2,
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
      backgroundColor: theme.icon,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 6,
    },
    imageText: {
      fontSize: 24,
      color: theme.text,
    },
    label: {
      textAlign: 'center',
      fontSize: 14,
      color: theme.text,
    },
  });
}