import { View, StyleSheet, Image, Pressable, Appearance, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { useBookmarks } from '@/hooks/useBookmarks';
import { useAuth } from '@/contexts/auth';
import { requireAuth } from '@/utils/auth';

type Props = {
  id: string; // Add provider ID to props
  name: string;
  description: string;
  rating: number;
  avatar?: any;
  onPress?: () => void;
};

export default function ProviderListItem({ id, name, description, avatar, rating, onPress }: Props) {
  const { isBookmarked, toggleBookmark, isLoading } = useBookmarks();
  const { user } = useAuth();
  const colorScheme = Appearance.getColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const styles = createStyles(theme, colorScheme);

  const handleBookmarkPress = () => {
    if (!requireAuth(user?.uid, 'Please sign in to save providers.')) return;
    toggleBookmark(id);
  };


  return (
    <Pressable onPress={onPress} style={styles.card}>
      <Image
        source={avatar ?? require('@/assets/images/avatar-placeholder.png')}
        style={styles.avatar}
      />

      <View style={styles.info}>
        <View style={styles.header}>
          <ThemedText type="defaultSemiBold" style={styles.name}>{name}</ThemedText>
          <TouchableOpacity 
            onPress={(e) =>{
              e.stopPropagation(); // Prevent triggering onPress of Pressable
              handleBookmarkPress();
            }}
            style={styles.bookmarkButton}
            disabled={isLoading}
          >
            <Ionicons 
              name={isBookmarked(id) ? "bookmark" : "bookmark-outline"} 
              size={24} 
              color={isBookmarked(id) ? "#0A58A5" : theme.text}
              style={isLoading ? { opacity: 0.5 } : {}}
            />
          </TouchableOpacity>
        </View>
        <ThemedText style={styles.description}>{description}</ThemedText>
        <ThemedText style={styles.rating}>{rating.toFixed(1)} ★</ThemedText>
      </View>
    </Pressable>
  );
}

const createStyles = (theme, colorScheme) => StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colorScheme === 'dark' ? '#333' : theme.background,
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    color: theme.text,
  },
  bookmarkButton: {
    padding: 8,
    marginTop: -8, // Adjust vertical alignment
    marginRight: -8, // Extend touch target without affecting layout
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
