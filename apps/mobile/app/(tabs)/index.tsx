import { ScrollView, StyleSheet, TextInput, Image, View } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import ServiceCategoryCard from '../../components/home/ServiceCategoryCard';
import ProviderCard from '@/components/home/ProviderCard'

export default function HomeScreen() {
  const theme = useColorScheme();
  const tint = Colors[theme ?? 'light'].tint;

  const categories = [
    { name: 'Tailor' },
    { name: 'Plumber' },
    { name: 'Electrician' },
    { name: 'Caterer' },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Logo */}
      <Image
        source={require('../../assets/images/react-logo.png')}
        style={styles.logo}
      />

      {/* Search */}
      <TextInput
        placeholder="Find a service..."
        placeholderTextColor="#999"
        style={[
          styles.search,
          {
            backgroundColor: theme === 'dark' ? '#222' : '#eee',
            color: tint,
          },
        ]}
      />

      {/* Popular Services */}
      <ThemedText type="subtitle" style={styles.sectionTitle}>
        Popular Services
      </ThemedText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categories}>
        {categories.map((cat) => (
          <ServiceCategoryCard key={cat.name} name={cat.name} />
        ))}
      </ScrollView>

      <ThemedText type="title" style={{ marginTop: 30, marginBottom: 10 }}>
  Explore beautiful work
</ThemedText>

<ScrollView horizontal showsHorizontalScrollIndicator={false}>
  {[
    { name: 'Alex Johnson', service: 'Electrician' },
    { name: 'Sarah Doe', service: 'Tailor' },
    { name: 'John Fixit', service: 'Plumber' },
  ].map((item) => (
    <ProviderCard
      key={item.name}
      name={item.name}
      service={item.service}
      // image={require('@/assets/providers/alex.png')} To be used later
    />
  ))}
</ScrollView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingTop:50,
    padding:15
  },
  logo: {
    width: 140,
    height: 40,
    resizeMode: 'contain',
    marginBottom: 20,
  },
  search: {
    padding: 12,
    borderRadius: 12,
    fontSize: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  categories: {
    flexDirection: 'row',
  },
});
