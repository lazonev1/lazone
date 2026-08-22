import { SafeAreaView, StyleSheet } from 'react-native';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { useEffect } from 'react';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Ionicons } from '@expo/vector-icons';
import { Appearance } from 'react-native';
import { Colors } from '@/constants/Colors';
import { useTranslation } from 'react-i18next';

/**
 * Generic placeholder screen for routes that are planned but not yet implemented.
 * Navigate here with: router.push({ pathname: '/account/subscreens/placeholder', params: { title: 'Page Name' } })
 */
export default function PlaceholderScreen() {
  const params = useLocalSearchParams<{ title?: string }>();
  const navigation = useNavigation();
  const { t } = useTranslation('account');
  const colorScheme = Appearance.getColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;

  const title = params.title ?? t('placeholder.comingSoon');

  useEffect(() => {
    navigation.setOptions({ title });
  }, [navigation, title]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        <Ionicons name="construct-outline" size={56} color={theme.icon} style={styles.icon} />
        <ThemedText type="subtitle" style={styles.title}>
          {title}
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          {t('placeholder.underConstruction')}
        </ThemedText>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  icon: {
    marginBottom: 16,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
    opacity: 0.6,
    lineHeight: 22,
  },
});
