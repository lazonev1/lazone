import { ScrollView, StyleSheet, TextInput, Image, View,Appearance } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import ServiceCategoryCard from '../../components/home/ServiceCategoryCard';
import ProviderListItem from '@/components/home/ProviderListItem';
import AppHeader from '@/components/ui/AppHeader';

export default function HomeScreen() {
  const colorScheme = Appearance.getColorScheme()
  const theme = colorScheme === 'dark'? Colors.dark: Colors.light;
  const router = useRouter();

  const categories = [
    { name: 'Tailor' },
    { name: 'Plumber' },
    { name: 'Electrician' },
    { name: 'Caterer' },
  ];

  const styles = createStyles(theme, colorScheme)

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Logo */}
        {/* <Image
        source={colorScheme === 'dark'? require('../../assets/images/lazone-logo.png'): require('../../assets/images/lazone-logo-lightTheme.png') }
        style={styles.logo}
      /> */}
      <AppHeader/>

      {/* Search */}
      <TextInput
        placeholder="Find a service..."
        placeholderTextColor="#999"
        style={[styles.search,]}
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

      <ThemedText type="subtitle" style={{ marginTop: 30, marginBottom: 10 }}>
  Explore beautiful work
      </ThemedText>

<ScrollView showsHorizontalScrollIndicator={false}>
  {[
    {id: 1, name: 'Alex Johnson', service: 'Electrician' },
    { id: 2, name: 'Sarah Doe', service: 'Tailor' },
    { id: 3, name: 'John Fixit', service: 'Plumber' },
  ].map((item) => (
    <ProviderListItem
    key={item.id}
    name={item.name}
    description="Experienced electricians for all installations."
    rating={4.7}
    onPress={() => {
      router.push(`/provider/${item.id}`);
    }}
  />

  ))}
</ScrollView>
    </ScrollView>
  );
}

// ToDo: To be modified tosupport white theme
function createStyles(theme, colorScheme) {
  
  return StyleSheet.create({
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
      Color: theme.tint,
      backgroundColor: theme.background,
    },
    sectionTitle: {
      marginBottom: 12,
    },
    categories: {
      flexDirection: 'row',
    },
  });
}