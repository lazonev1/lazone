import { View, StyleSheet, ScrollView, TouchableOpacity, Appearance } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';

const SERVICE_CATEGORIES = [
  { id: 'beauty', name: 'Beauty & Wellness', icon: 'flower-outline' },
  { id: 'home', name: 'Home Services', icon: 'home-outline' },
  { id: 'tech', name: 'Technology', icon: 'laptop-outline' },
  { id: 'health', name: 'Healthcare', icon: 'medical-outline' },
  { id: 'education', name: 'Education', icon: 'school-outline' },
  { id: 'events', name: 'Events', icon: 'calendar-outline' },
  { id: 'automotive', name: 'Automotive', icon: 'car-outline' },
  { id: 'legal', name: 'Legal Services', icon: 'document-text-outline' },
  { id: 'creative', name: 'Creative & Design', icon: 'brush-outline' },
  { id: 'fitness', name: 'Fitness', icon: 'fitness-outline' },
];

type Props = {
  selected?: string;
  onSelect: (categoryId: string) => void;
  error?: string;
};

export function CategoryPicker({ selected, onSelect, error }: Props) {
  const colorScheme = Appearance.getColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const styles = createStyles(theme, colorScheme);

  return (
    <View style={styles.container}>
      <ThemedText style={styles.label}>Service Category</ThemedText>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {SERVICE_CATEGORIES.map((category) => (
          <TouchableOpacity
            key={category.id}
            onPress={() => onSelect(category.id)}
            style={[
              styles.categoryButton,
              selected === category.id && styles.selectedCategory,
            ]}
          >
            <ThemedView style={styles.categoryContent}>
              <Ionicons
                name={category.icon}
                size={24}
                color={selected === category.id ? '#fff' : theme.text}
              />
              <ThemedText
                style={[
                  styles.categoryText,
                  selected === category.id && styles.selectedText,
                ]}
              >
                {category.name}
              </ThemedText>
            </ThemedView>
          </TouchableOpacity>
        ))}
      </ScrollView>
      {error && <ThemedText style={styles.error}>{error}</ThemedText>}
    </View>
  );
}

const createStyles = (theme, colorScheme) => StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    marginBottom: 8,
    color: theme.textSecondary,
  },
  scrollContent: {
    paddingVertical: 8,
    gap: 8,
  },
  categoryButton: {
    marginRight: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colorScheme === 'dark' ? '#333' : '#ccc',
    overflow: 'hidden',
  },
  selectedCategory: {
    backgroundColor: '#0A58A5',
    borderColor: '#0A58A5',
  },
  categoryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 8,
  },
  categoryText: {
    fontSize: 14,
  },
  selectedText: {
    color: '#fff',
  },
  error: {
    color: '#FF3B30',
    fontSize: 14,
    marginTop: 4,
  },
});
