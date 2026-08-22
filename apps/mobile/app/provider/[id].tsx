import { ScrollView, StyleSheet, Image, View, Text, TouchableOpacity, Animated, Appearance, SafeAreaView, Pressable, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useState, useRef, useEffect } from 'react';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '@/constants/Colors';
import { useProvider } from '@/hooks/useProvider';
import { Button } from '@lazone/ui';
import { Ionicons } from '@expo/vector-icons';
import { useBookmarks } from '@/hooks/useBookmarks';
import ReviewsComponent from '@/components/reviews/ReviewsComponent';
import { useReviews } from '@/hooks/useReviews';
import { useAuth } from '@/contexts/auth';
import { requireAuth } from '@/utils/auth';
import Toast from '@/components/ui/Toast';
import { useToast } from '@/hooks/useToast';
import * as messageRepository from '@/repositories/messageRepository';
import { useTranslation } from 'react-i18next';

export default function ProviderProfileScreen() {
  const { t } = useTranslation('provider');
  const colorScheme = Appearance.getColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const { id } = useLocalSearchParams();

  // Fetch real provider data from Firebase
  const { provider, isLoading: providerLoading, error: providerError } = useProvider(id as string);

  const scrollRef = useRef<ScrollView>(null);
  const aboutRef = useRef<View>(null);
  const portfolioRef = useRef<View>(null);
  const testimonialRef = useRef<View>(null);
  const scrollY = useRef(new Animated.Value(0)).current;

  const scrollTo = (ref: React.RefObject<View | null>) => {
    if (ref.current && scrollRef.current) {
      ref.current.measure((x: number, y: number, width: number, height: number, pageX: number, pageY: number) => {
        scrollRef.current?.scrollTo({ y: pageY - 100, animated: true });
      });
    }
  };


  const [portfolioExpanded, setPortfolioExpanded] = useState(false);
  const [servicesExpanded, setServicesExpanded] = useState(false);
  const [testimonialsExpanded] = useState(false);
  const [isMessaging, setIsMessaging] = useState(false);
  const [mainTabsPosition, setMainTabsPosition] = useState(0);

  const stickyHeaderOpacity = scrollY.interpolate({
    inputRange: [mainTabsPosition - 1, mainTabsPosition],
    outputRange: [0, 1],
    extrapolate: 'clamp'
  });

  const onMainTabsLayout = (event: any) => {
    const layout = event.nativeEvent.layout;
    setMainTabsPosition(layout.y);
  };

  const navigation = useNavigation();
  useEffect(() => {
    if (provider?.name) {
      navigation.setOptions({ title: provider.name });
    }
  }, [provider?.name, navigation]);

  const styles = createStyles(theme, colorScheme);

  const handleScroll = (event: any) => {
    const scrollPosition = event.nativeEvent.contentOffset.y;
    scrollY.setValue(scrollPosition);
  };

  const { isBookmarked, toggleBookmark, isLoading } = useBookmarks();
  const providerId = id.toString();
  const { toast, showToast, hideToast } = useToast();

  // Get current user for review submission
  const { user } = useAuth();
  const currentUserId = user?.uid;

  const handleBookmarkPress = async () => {
    if (!requireAuth(currentUserId, t('profile.signInToSave'))) return;
    toggleBookmark(providerId);
  };


  // Use enhanced reviews hook with user context
  const {
    reviews: reviewItems,
    stats: reviewStats,
    isLoading: reviewsLoading,
    respondToReview,
    updateReview,
    deleteReview,
    markHelpful,
  } = useReviews(providerId, currentUserId);

  // Handler for provider responding to reviews
  const handleRespondToReview = async (reviewId: string, responseText: string) => {
    try {
      await respondToReview(reviewId, responseText);
      showToast(t('reviews.toasts.responseSubmitted'), 'success');
    } catch {
      showToast(t('reviews.toasts.responseFailed'), 'error');
    }
  };

  // Loading state
  if (providerLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.tint} />
        <ThemedText style={styles.loadingText}>{t('profile.loading')}</ThemedText>
      </SafeAreaView>
    );
  }

  // Error state
  if (providerError || !provider) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Ionicons name="alert-circle-outline" size={64} color={theme.icon} />
        <ThemedText style={styles.errorText}>
          {providerError ? t('profile.loadFailed') : t('profile.notFound')}
        </ThemedText>
        <Button
          label={t('profile.goBack')}
          onPress={() => router.back()}
          variant="primary"
          size="small"
          style={{ marginTop: 16 }}
        />
      </SafeAreaView>
    );
  }

  const hasBookableServices = provider.services.length > 0;

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
        <Image
          source={typeof provider.cover === 'string' ? { uri: provider.cover } : provider.cover}
          style={styles.cover}
        />

        <ThemedView style={styles.profileHeader}>
          <Image
            source={typeof provider.avatar === 'string' ? { uri: provider.avatar } : provider.avatar}
            style={styles.avatarInline}
          />
          <View style={{ flex: 1 }}>
            <View style={styles.nameRow}>
              <ThemedText type="defaultSemiBold" style={styles.name}>{provider.name}</ThemedText>
              <TouchableOpacity 
                onPress={handleBookmarkPress}
                style={styles.bookmarkButton}
                disabled={isLoading}
              >
                <Ionicons 
                  name={isBookmarked(providerId) ? "bookmark" : "bookmark-outline"} 
                  size={24} 
                  color={isBookmarked(providerId) ? "#0A58A5" : theme.text} 
                  style={isLoading ? { opacity: 0.5 } : {}}
                />
              </TouchableOpacity>
            </View>
            <ThemedText>{provider.profession}</ThemedText>
            <ThemedText style={styles.rating}>{t('profile.ratingSummary', { rating: provider.rating, count: provider.reviews })}</ThemedText>
          </View>
        </ThemedView>

        <View style={styles.actionsRow}>
          <Button
            label={isMessaging ? t('profile.opening') : t('profile.message')}
            disabled={isMessaging}
            onPress={async () => {
              if (!requireAuth(currentUserId, t('profile.signInToMessage'))) return;

              setIsMessaging(true);
              try {
                // Create the conversation before navigating. The messages screen
                // subscribes to a nested collection, which Firestore correctly
                // rejects when the parent conversation does not exist.
                const conversationId = await messageRepository.findOrCreateConversation(
                  currentUserId!,
                  String(provider.id),
                );
                router.push({
                  pathname: '/messages/[id]',
                  params: {
                    id: conversationId,
                    name: provider.name,
                    avatar: typeof provider.avatar === 'string' ? provider.avatar : '',
                  },
                });
              } catch (error) {
                console.error('[ProviderProfile] Unable to open conversation:', error);
                showToast(t('profile.conversationFailed'), 'error');
              } finally {
                setIsMessaging(false);
              }
            }}
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
          {provider.portfolio && provider.portfolio.length > 0 ? (
            <>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
                {(portfolioExpanded ? provider.portfolio : provider.portfolio.slice(0, 1)).map((item, i) => (
                  <View key={item.id || i} style={styles.card}>
                    <Image
                      source={{ uri: item.image }}
                      style={styles.image}
                    />
                    {item.caption && <ThemedText style={styles.caption}>{item.caption}</ThemedText>}
                  </View>
                ))}
              </ScrollView>
              {provider.portfolio.length > 1 && (
                <Pressable onPress={() => setPortfolioExpanded(!portfolioExpanded)}>
                  <ThemedText style={styles.toggle}>{portfolioExpanded ? t('profile.showLess') : t('profile.seeMore')}</ThemedText>
                </Pressable>
              )}
            </>
          ) : (
            <ThemedText style={{ marginTop: 10, opacity: 0.7 }}>{t('profile.noPortfolio')}</ThemedText>
          )}
        </View>

        <View style={styles.section}>
          <ThemedText type="subtitle">{t('profile.serviceShowcase')}</ThemedText>
          {provider.services && provider.services.length > 0 ? (
            <>
              {(servicesExpanded ? provider.services : provider.services.slice(0, 1)).map((service, i) => (
                <View key={service.id || i} style={styles.serviceCard}>
                  <ThemedText type="defaultSemiBold">{service.name}</ThemedText>
                  <ThemedText style={{ color: '#FF9900' }}>{service.price} CFA</ThemedText>
                  <ThemedText style={{ fontSize: 12 }}>{service.availability}</ThemedText>
                </View>
              ))}
              {provider.services.length > 1 && (
                <Pressable onPress={() => setServicesExpanded(!servicesExpanded)}>
                  <ThemedText style={styles.toggle}>{servicesExpanded ? t('profile.showLess') : t('profile.seeMore')}</ThemedText>
                </Pressable>
              )}
            </>
          ) : (
            <ThemedText style={{ marginTop: 10, opacity: 0.7 }}>{t('profile.noServices')}</ThemedText>
          )}
        </View>

        <View style={styles.section} ref={testimonialRef}>
          <View style={styles.sectionHeader}>
            <ThemedText type="subtitle">{t('profile.reviews')}</ThemedText>
            <View style={styles.reviewActions}>
              <TouchableOpacity
                onPress={() => router.push(`/provider/reviews?id=${providerId}`)}
                style={styles.viewAllButton}
              >
                <ThemedText style={styles.viewAllText}>{t('profile.viewAll')}</ThemedText>
                <Ionicons name="chevron-forward" size={16} color="#0A58A5" />
              </TouchableOpacity>
            </View>
          </View>
          <ReviewsComponent
            reviews={reviewItems}
            stats={reviewStats}
            isLoading={reviewsLoading}
            showStats={false}
            showFilters={false}
            allowResponding={currentUserId === providerId}
            expandedByDefault={testimonialsExpanded}
            maxReviewsCollapsed={1}
            currentUserId={currentUserId}
            onRespondToReview={handleRespondToReview}
            onUpdateReview={async (reviewId, data) => {
              await updateReview(reviewId, data);
              showToast(t('reviews.toasts.reviewUpdated'), 'success');
            }}
            onMarkHelpful={async (reviewId) => {
              if (!requireAuth(currentUserId, t('reviews.signInToVote'))) return;
              try {
                await markHelpful(reviewId);
              } catch {
                showToast(t('reviews.toasts.voteFailed'), 'error');
              }
            }}
            onDeleteReview={async (reviewId) => {
              try {
                await deleteReview(reviewId);
                showToast(t('reviews.toasts.reviewDeleted'), 'success');
              } catch {
                showToast(t('reviews.toasts.reviewDeleteFailed'), 'error');
              }
            }}
          />
        </View>

        <View style={styles.section}>
          <ThemedText type="subtitle">{t('profile.pricingEstimate')}</ThemedText>
          <ThemedText>{provider.pricing}</ThemedText>
          <Button
            label={hasBookableServices ? t('profile.bookNow') : t('profile.bookingUnavailable')}
            disabled={!hasBookableServices}
            onPress={() => {
              if (!hasBookableServices) return;
              router.push(`/booking/new?providerId=${provider.id}`);
            }}
            variant="primary"
            style={styles.quoteButton}
          />
          {!hasBookableServices && (
            <ThemedText style={styles.bookingUnavailableText}>
              {t('profile.bookingUnavailableNotice')}
            </ThemedText>
          )}
        </View>
      </ScrollView>

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onDismiss={hideToast}
      />
    </SafeAreaView>
  );
}

function createStyles(theme: any, colorScheme: any) {
  return StyleSheet.create({
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
    bookingUnavailableText: {
      marginTop: 10,
      color: theme.icon,
      fontSize: 13,
      lineHeight: 18,
    },
    spacer: { height: 12 },
    nameRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      width: '100%',
    },
    bookmarkButton: {
      padding: 8,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    viewAllButton: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    viewAllText: {
      color: '#0A58A5',
      fontSize: 14,
      marginRight: 4,
    },
    reviewActions: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    loadingText: {
      marginTop: 12,
      fontSize: 16,
      opacity: 0.7,
    },
    errorText: {
      marginTop: 16,
      fontSize: 16,
      opacity: 0.7,
      textAlign: 'center',
    },
  });
}
