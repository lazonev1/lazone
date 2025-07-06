import { View, StyleSheet, Image, Pressable, Appearance, TouchableOpacity } from 'react-native';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';

type Props = {
  id: string; // Add provider ID to props
  name: string;
  description: string;
  rating: number;
  avatar?: any;
  onPress?: () => void;
};

const BOOKMARK_PROVIDERS_KEY = 'bookmarked_providers'; // Updated key name

export default function ProviderListItem({ id, name, description, avatar, rating, onPress }: Props) {
  const [isBookmarked, setIsBookmarked] = useState(false); // Updated state name
  const colorScheme = Appearance.getColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const styles = createStyles(theme, colorScheme);

  useEffect(() => {
    checkBookmarkStatus(); // Updated function name
  }, [id]);

  const checkBookmarkStatus = async () => { // Updated function name
    try {
      const bookmarkedProviders = await AsyncStorage.getItem(BOOKMARK_PROVIDERS_KEY);
      const providers = bookmarkedProviders ? JSON.parse(bookmarkedProviders) : [];
      setIsBookmarked(providers.includes(id));
    } catch (error) {
      console.error('Error checking bookmark status:', error);
    }
  };
  // ToDo: Upadate with API once the backend is ready
  const toggleBookmark = async () => { // Updated function name
    try {
      const savedProviders = await AsyncStorage.getItem(BOOKMARK_PROVIDERS_KEY);
      let providers = savedProviders ? JSON.parse(savedProviders) : [];
      
      if (isBookmarked) { // if it is Bookmarked remove it
        providers = providers.filter((providerId: string) => providerId !== id);
      } else { // else save it in the BookMarked list
        providers.push(id);
      }
      
      await AsyncStorage.setItem(BOOKMARK_PROVIDERS_KEY, JSON.stringify(providers));
      setIsBookmarked(!isBookmarked); // Toggle the bookmark state
    } catch (error) {
      console.error('Error toggling bookmark:', error);
    }
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
            onPress={toggleBookmark}
            style={styles.bookmarkButton}
          >
            <Ionicons 
              name={isBookmarked ? "bookmark" : "bookmark-outline"} 
              size={24} 
              color={isBookmarked ? "#0A58A5" : theme.text}
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
