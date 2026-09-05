import { ScrollView, StyleSheet, Image, View, Text, TouchableOpacity, Animated, Appearance, SafeAreaView, Pressable, ImageSourcePropType, LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useState, useRef, useEffect } from 'react';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '@/constants/Colors';
import { Button } from '@lazone/ui';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import ReviewsComponent from '@/components/reviews/ReviewsComponent';
import type { ProviderViewModel } from '@/types/provider';
import { useProvider } from '@/hooks/useProvider';
import { useAuth } from '@/contexts/auth';
import { useTranslation } from 'react-i18next';

export default function ProviderPreviewScreen() {
  const { t } = useTranslation('provider');
  const colorScheme = Appearance.getColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const { id } = useLocalSearchParams();
  const { user } = useAuth();

  const scrollRef = useRef<ScrollView>(null);
  const aboutRef = useRef<View>(null);
  const portfolioRef = useRef<View>(null);
  const testimonialRef = useRef<View>(null);
  const scrollY = useRef(new Animated.Value(0)).current;

  const scrollTo = (ref: React.RefObject<View | null>) => {
    const scrollView = scrollRef.current;
    if (ref.current && scrollView) {
      ref.current.measure((_x, _y, _width, _height, _pageX, pageY) => {
        scrollView.scrollTo({ y: pageY - 100, animated: true });
      });
    }
  };

  const providerId = Array.isArray(id) ? id[0] : id;
  const resolvedProviderId = providerId ?? user?.uid;
  const { provider: savedProvider, isLoading, error } = useProvider(resolvedProviderId);
  const [provider, setProvider] = useState<ProviderViewModel | null>(null);
  const [portfolioExpanded, setPortfolioExpanded] = useState(false);
  const [servicesExpanded, setServicesExpanded] = useState(false);
  const [testimonialsExpanded, setTestimonialsExpanded] = useState(false);
  const [mainTabsPosition, setMainTabsPosition] = useState(0);

  useEffect(() => {
    setProvider(savedProvider);
  }, [savedProvider]);

  const stickyHeaderOpacity = scrollY.interpolate({
    inputRange: [mainTabsPosition - 1, mainTabsPosition],
    outputRange: [0, 1],
    extrapolate: 'clamp'
  });

  const onMainTabsLayout = (event: LayoutChangeEvent) => {
    const layout = event.nativeEvent.layout;
    setMainTabsPosition(layout.y);
  };

  const navigation = useNavigation();
  useEffect(() => {
    if (provider) {
      navigation.setOptions({ title: provider.name });
    }
  }, [navigation, provider]);

  const styles = createStyles(theme, colorScheme);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const scrollPosition = event.nativeEvent.contentOffset.y;
    scrollY.setValue(scrollPosition);
  };

  const updateProviderData = (field: 'cover' | 'avatar', value: ImageSourcePropType) => {
    setProvider(prev => prev ? { ...prev, [field]: value } : prev);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.centeredState}>
        <ThemedText>{t('preview.loading')}</ThemedText>
      </SafeAreaView>
    );
  }

  if (!provider) {
    return (
      <SafeAreaView style={styles.centeredState}>
        <ThemedText type="subtitle">{t('preview.unavailableTitle')}</ThemedText>
        <ThemedText style={styles.stateMessage}>
          {error?.message ?? t('preview.unavailableMessage')}
        </ThemedText>
        <Button
          label={t('registration.editTitle')}
          onPress={() => router.push({
            pathname: '/provider/registration',
            params: { editMode: 'true', providerId: resolvedProviderId ?? '' },
          })}
          variant="primary"
          style={styles.quoteButton}
        />
      </SafeAreaView>
    );
  }

  const handleEditProfile = () => {
    router.push({
      pathname: '/provider/registration',
      params: {
        editMode: 'true',
        providerId: provider.id.toString(),
      }
    });
  };

  const pickCoverImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        alert(t('preview.permissionRequired'));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        updateProviderData('cover', { uri: result.assets[0].uri });
      }
    } catch (error) {
      console.error('Error picking image:', error);
      alert(t('preview.imagePickError'));
    }
  };

  const pickAvatarImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        alert(t('preview.permissionRequired'));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        updateProviderData('avatar', { uri: result.assets[0].uri });
      }
    } catch (error) {
      console.error('Error picking image:', error);
      alert(t('preview.imagePickError'));
    }
  };

  // Calculate review statistics for ReviewsComponent
  const reviewItems = provider.reviewItems || [];
  const totalRatings = reviewItems.reduce((sum, review) => sum + review.rating, 0);
  const avgRating = totalRatings / reviewItems.length || 0;

  const counts = [0, 0, 0, 0, 0];
  reviewItems.forEach(review => {
    counts[Math.floor(review.rating) - 1]++;
  });

  const reviewStats = {
    averageRating: avgRating,
    totalReviews: reviewItems.length,
    ratingCounts: counts
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Animated.View style={[styles.tabsRowSticky, { opacity: stickyHeaderOpacity }]}> 
        <TouchableOpacity onPress={() => scrollTo(aboutRef)} style={styles.tab}>
          <Text style={styles.tabText}>{t('profile.about')}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => scrollTo(portfolioRef)} style={styles.tab}>
          <Text style={styles.tabText}>{t('profile.portfolio')}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => scrollTo(testimonialRef)} style={styles.tab}>
          <Text style={styles.tabText}>{t('profile.reviews')}</Text>
        </TouchableOpacity>
      </Animated.View>

      <ScrollView
        style={styles.container}
        ref={scrollRef}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        <View style={styles.coverContainer}>
          <Image source={provider.cover} style={styles.cover} />
          
          <TouchableOpacity 
            style={styles.editCoverButton}
            onPress={pickCoverImage}
          >
            <Ionicons name="camera" size={24} color="white" />
          </TouchableOpacity>
        </View>

        <ThemedView style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <Image source={provider.avatar} style={styles.avatarInline} />
            
            <TouchableOpacity 
              style={styles.editAvatarButton}
              onPress={pickAvatarImage}
            >
              <Ionicons name="camera" size={18} color="white" />
            </TouchableOpacity>
          </View>

          <View style={{ flex: 1 }}>
            <ThemedText type="defaultSemiBold" style={styles.name}>{provider.name}</ThemedText>
            <ThemedText>{provider.profession}</ThemedText>
            <ThemedText style={styles.rating}>{t('profile.ratingSummary', { rating: provider.rating, count: provider.reviews })}</ThemedText>
          </View>
        </ThemedView>

        <View style={styles.actionsRow}>
          <Button
            label={t('profile.message')}
            onPress={() => {}}
            variant="primary"
            size="small"
            style={styles.actionButton}
          />
          <Button
            label={t('profile.follow')}
            onPress={() => {}}
            variant="primary"
            size="small"
            style={styles.actionButton}
          />
        </View>

        <View style={styles.spacer} />

        <View style={styles.tabsRow} onLayout={onMainTabsLayout}>
          <TouchableOpacity onPress={() => scrollTo(aboutRef)} style={styles.tab}>
            <Text style={styles.tabText}>{t('profile.about')}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => scrollTo(portfolioRef)} style={styles.tab}>
            <Text style={styles.tabText}>{t('profile.portfolio')}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => scrollTo(testimonialRef)} style={styles.tab}>
            <Text style={styles.tabText}>{t('profile.reviews')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section} ref={aboutRef}>
          <ThemedText type="subtitle">{t('profile.about')}</ThemedText>
          <ThemedText>{provider.bio}</ThemedText>
        </View>

        <View style={styles.section} ref={portfolioRef}>
          <ThemedText type="subtitle">{t('profile.portfolio')}</ThemedText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
            {(portfolioExpanded ? provider.portfolio : provider.portfolio.slice(0, 1)).map((item, i) => (
              <View key={i} style={styles.card}>
                <Image source={{ uri: item.image }} style={styles.image} />
                {item.caption && <ThemedText style={styles.caption}>{item.caption}</ThemedText>}
              </View>
            ))}
          </ScrollView>
          {provider.portfolio.length > 1 && (
            <Pressable onPress={() => setPortfolioExpanded(!portfolioExpanded)}>
              <ThemedText style={styles.toggle}>{portfolioExpanded ? t('profile.showLess') : t('profile.seeMore')}</ThemedText>
            </Pressable>
          )}
        </View>

        <View style={styles.section}>
          <ThemedText type="subtitle">{t('profile.serviceShowcase')}</ThemedText>
          {(servicesExpanded ? provider.services : provider.services.slice(0, 1)).map((service, i) => (
            <View key={i} style={styles.serviceCard}>
              <ThemedText type="defaultSemiBold">{service.name}</ThemedText>
              <ThemedText style={{ color: '#FF9900' }}>{service.price}</ThemedText>
              <ThemedText style={{ fontSize: 12 }}>{service.availability}</ThemedText>
            </View>
          ))}
          {provider.services.length > 1 && (
            <Pressable onPress={() => setServicesExpanded(!servicesExpanded)}>
              <ThemedText style={styles.toggle}>{servicesExpanded ? t('profile.showLess') : t('profile.seeMore')}</ThemedText>
            </Pressable>
          )}
        </View>

        <View style={styles.section} ref={testimonialRef}>
          <ThemedText type="subtitle">{t('preview.clientReviews')}</ThemedText>
          <ReviewsComponent
            reviews={reviewItems}
            stats={reviewStats}
            showStats={false}
            showFilters={false}
            allowResponding={false}
            expandedByDefault={testimonialsExpanded}
            maxReviewsCollapsed={1}
          />
        </View>

        <View style={styles.section}>
          <ThemedText type="subtitle">{t('profile.pricingEstimate')}</ThemedText>
          <ThemedText>{provider.pricing}</ThemedText>
          <Button
            label={t('preview.editProfile')}
            onPress={handleEditProfile}
            variant="primary"
            style={styles.quoteButton}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(
  theme: typeof Colors.light,
  colorScheme: ReturnType<typeof Appearance.getColorScheme>
) {
  return StyleSheet.create({
    centeredState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
      backgroundColor: theme.background,
    },
    stateMessage: {
      marginTop: 8,
      textAlign: 'center',
      color: theme.icon,
    },
    container: { flex: 1, 
      backgroundColor: theme.background,
     padding:16},
    cover: { width: '100%', height: 180 },
    profileHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      marginTop: -40,
    },
    avatarInline: {
      width: 64,
      height: 64,
      borderRadius: 32,
      marginRight: 12,
    },
    name: { fontSize: 18, color: theme.text },
    rating: { marginTop: 4, color: theme.icon },
    actionsRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      paddingHorizontal: 20,
      marginVertical: 16,
    },
    actionButton: {
      flex: 1,
      marginHorizontal: 8,
    },
    buttonText: { color: '#fff', fontWeight: 'bold', textAlign: 'center' },
    tabsRowSticky: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1,
      flexDirection: 'row',
      justifyContent: 'space-around',
      borderBottomWidth: 1,
      borderColor: theme.icon,
      paddingVertical: 10,
      backgroundColor: theme.background,
    },
    tabsRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: theme.icon,
      paddingVertical: 10,
      backgroundColor: theme.background,
    },
    tab: { paddingHorizontal: 16 },
    tabText: {
      color: theme.tint,
      fontWeight: '600',
      fontSize: 14,
    },
    section: { padding: 20 },
    card: { marginRight: 12 },
    image: { width: 140, height: 100, borderRadius: 12 },
    caption: { marginTop: 6, fontSize: 12, color: theme.text },
    toggle: { marginTop: 10, color: '#FF9900' },
    serviceCard: {
      backgroundColor: colorScheme === 'dark' ? '#1e1e1e' : '#f4f4f4',
      padding: 16,
      borderRadius: 12,
      marginBottom: 12,
    },
    testimonial: {
      marginTop: 10,
      padding: 12,
      borderRadius: 10,
      backgroundColor: colorScheme === 'dark' ? '#2b2b2b' : '#eaeaea',
    },
    quoteButton: {
      marginTop: 16,
    },
    spacer: { height: 12 },
    coverContainer: {
      position: 'relative',
      height: 180,
    },
    editCoverButton: {
      position: 'absolute',
      right: 12,
      bottom: 12,
      backgroundColor: 'rgba(0,0,0,0.6)',
      borderRadius: 20,
      padding: 8,
      zIndex: 10,
    },
    avatarContainer: {
      position: 'relative',
      marginRight: 12,
    },
    editAvatarButton: {
      position: 'absolute',
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.6)',
      borderRadius: 15,
      padding: 6,
      zIndex: 10,
    },
    imagePickerOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.7)',
      zIndex: 5,
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarPickerOverlay: {
      position: 'absolute',
      top: -50,
      left: -50,
      width: 200,
      height: 200,
      backgroundColor: 'rgba(0,0,0,0.7)',
      zIndex: 5,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 100,
    },
    imagePicker: {
      width: '80%',
      height: '80%',
    },
    avatarPicker: {
      width: 120,
      height: 120,
      borderRadius: 60,
    },
  });
}
