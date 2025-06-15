import { ScrollView, StyleSheet, Image, View, Appearance, SafeAreaView, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import ServiceCategoryCard from '../../components/home/ServiceCategoryCard';
import ProviderListItem from '@/components/home/ProviderListItem';
import { Providers } from '@/constants/providers';
import { Categories } from '@/constants/categories';
import SearchBar from '@/components/ui/SearchBar';
import { useState } from 'react';

export default function HomeScreen() {
  const colorScheme = Appearance.getColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const router = useRouter();
  const [searchText, setSearchText] = useState('');

  const styles = createStyles(theme, colorScheme);

  const handleSearch = () => {
    if (searchText.trim()) {
      router.push({
        pathname: '/explore/search-results',
        params: { query: searchText.trim() }
      });
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Image
            source={
              colorScheme === 'dark'
                ? require('../../assets/images/lazone-logo.png')
                : require('../../assets/images/lazone-logo-lightTheme.png')
            }
            style={styles.logo}
          />
          <SearchBar
            value={searchText}
            onChangeText={setSearchText}
            onSubmit={handleSearch}
            showSearchButton={true}
          />
        </View>

        <ScrollView style={styles.scrollContent}>
          {/* Popular Services */}
          <View style={styles.contentPadding}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Popular Services
            </ThemedText>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categories}>
            {Categories.map((cat, index) => (
              <ServiceCategoryCard key={cat.name || index} name={cat.name} />
            ))}
          </ScrollView>

          <View style={styles.contentPadding}>
            <ThemedText type="subtitle" style={styles.exploreTitle}>
              Explore beautiful work
            </ThemedText>

            {Providers.map((item) => (
              <ProviderListItem
                key={item.id}
                name={item.name}
                description={item.bio}
                rating={item.rating}
                onPress={() => {
                  router.push(`/provider/${item.id}`);
                }}
              />
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

function createStyles(theme, colorScheme) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
    },
    header: {
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    logo: {
      width: 140,
      height: 40,
      resizeMode: 'contain',
      marginBottom: 12,
    },
    scrollContent: {
      flex: 1,
    },
    contentPadding: {
      paddingHorizontal: 16,
    },
    sectionTitle: {
      marginVertical: 8,
    },
    exploreTitle: {
      marginTop: 24,
      marginBottom: 12,
    },
    categories: {
      paddingLeft: 16,
      flexDirection: 'row',
    },
  });
}