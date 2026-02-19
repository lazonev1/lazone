import { ScrollView, StyleSheet, Image, View, Text, TouchableOpacity, Animated, Appearance, SafeAreaView, Pressable, Modal, TextInput, Alert, ActivityIndicator } from 'react-native';
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
import Toast from '@/components/ui/Toast';
import { useToast } from '@/hooks/useToast';

export default function ProviderProfileScreen() {
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
  const [testimonialsExpanded, setTestimonialsExpanded] = useState(false);
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

  // Use enhanced reviews hook with user context
  const {
    reviews: reviewItems,
    stats: reviewStats,
    isLoading: reviewsLoading,
    canReview,
    canReviewReason,
    submitReview,
    respondToReview,
    deleteReview,
    refreshReviews,
    markHelpful,
  } = useReviews(providerId, currentUserId);

  // Handler for provider responding to reviews
  const handleRespondToReview = async (reviewId: string, responseText: string) => {
    try {
      await respondToReview(reviewId, responseText);
      showToast('Response submitted', 'success');
    } catch (error) {
      showToast('Failed to submit response', 'error');
    }
  };

  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [newReviewRating, setNewReviewRating] = useState(0);
  const [newReviewComment, setNewReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const handleSubmitReview = async () => {
    if (newReviewRating === 0) {
      Alert.alert('Error', 'Please select a rating');
      return;
    }

    if (!newReviewComment.trim()) {
      Alert.alert('Error', 'Please write a comment');
      return;
    }

    if (!currentUserId) {
      Alert.alert('Error', 'Please log in to submit a review');
      return;
    }

    setSubmittingReview(true);

    try {
      await submitReview({
        rating: newReviewRating,
        comment: newReviewComment,
      });

      setReviewModalVisible(false);
      setNewReviewRating(0);
      setNewReviewComment('');
      showToast('Your review has been submitted!', 'success');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit review. Please try again.';
      showToast(errorMessage, 'error');
    } finally {
      setSubmittingReview(false);
    }
  };

  const StarRatingSelector = ({ rating, onRatingChange }: { rating: number; onRatingChange: (rating: number) => void }) => {
    return (
      <View style={styles.starRatingSelector}>
        {[1, 2, 3, 4, 5].map(star => (
          <TouchableOpacity
            key={star}
            onPress={() => onRatingChange(star)}
            style={styles.starButton}
          >
            <Ionicons
              name={star <= rating ? "star" : "star-outline"}
              size={32}
              color="#FFD700"
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  // Loading state
  if (providerLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.tint} />
        <ThemedText style={styles.loadingText}>Loading provider details...</ThemedText>
      </SafeAreaView>
    );
  }

  // Error state
  if (providerError || !provider) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Ionicons name="alert-circle-outline" size={64} color={theme.icon} />
        <ThemedText style={styles.errorText}>
          {providerError ? 'Failed to load provider' : 'Provider not found'}
        </ThemedText>
        <Button
          label="Go Back"
          onPress={() => router.back()}
          variant="primary"
          size="small"
          style={{ marginTop: 16 }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Animated.View style={[styles.tabsRowSticky, { opacity: stickyHeaderOpacity }]}> 
        <TouchableOpacity onPress={() => scrollTo(aboutRef)} style={styles.tab}>
          <Text style={styles.tabText}>About</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => scrollTo(portfolioRef)} style={styles.tab}>
          <Text style={styles.tabText}>Portfolio</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => scrollTo(testimonialRef)} style={styles.tab}>
          <Text style={styles.tabText}>Reviews</Text>
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
                onPress={() => toggleBookmark(providerId)}
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
            <ThemedText style={styles.rating}>⭐ {provider.rating} | {provider.reviews} Reviews</ThemedText>
          </View>
        </ThemedView>

        <View style={styles.actionsRow}>
          <Button
            label="Message"
            onPress={() => {}}
            variant="primary"
            size="small"
            style={styles.actionButton}
          />
          <Button
            label="Follow"
            onPress={() => {}}
            variant="primary"
            size="small"
            style={styles.actionButton}
          />
        </View>

        <View style={styles.spacer} />

        <View style={styles.tabsRow} onLayout={onMainTabsLayout}>
          <TouchableOpacity onPress={() => scrollTo(aboutRef)} style={styles.tab}>
            <Text style={styles.tabText}>About</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => scrollTo(portfolioRef)} style={styles.tab}>
            <Text style={styles.tabText}>Portfolio</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => scrollTo(testimonialRef)} style={styles.tab}>
            <Text style={styles.tabText}>Reviews</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section} ref={aboutRef}>
          <ThemedText type="subtitle">About</ThemedText>
          <ThemedText>{provider.bio}</ThemedText>
        </View>

        <View style={styles.section} ref={portfolioRef}>
          <ThemedText type="subtitle">Portfolio</ThemedText>
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
                  <ThemedText style={styles.toggle}>{portfolioExpanded ? 'Show Less' : 'See More'}</ThemedText>
                </Pressable>
              )}
            </>
          ) : (
            <ThemedText style={{ marginTop: 10, opacity: 0.7 }}>No portfolio items yet</ThemedText>
          )}
        </View>

        <View style={styles.section}>
          <ThemedText type="subtitle">Service Showcase</ThemedText>
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
                  <ThemedText style={styles.toggle}>{servicesExpanded ? 'Show Less' : 'See More'}</ThemedText>
                </Pressable>
              )}
            </>
          ) : (
            <ThemedText style={{ marginTop: 10, opacity: 0.7 }}>No services listed yet</ThemedText>
          )}
        </View>

        <View style={styles.section} ref={testimonialRef}>
          <View style={styles.sectionHeader}>
            <ThemedText type="subtitle">Reviews</ThemedText>
            <View style={styles.reviewActions}>
              <TouchableOpacity
                onPress={() => {
                  if (!currentUserId) {
                    Alert.alert('Sign In Required', 'Please sign in to leave a review');
                    return;
                  }

                  // TODO: Toggle this to enable/disable review eligibility check
                  // Set to `true` to enforce booking requirement, `false` to skip for testing
                  const ENFORCE_BOOKING_CHECK = false;

                  if (ENFORCE_BOOKING_CHECK && !canReview && canReviewReason) {
                    Alert.alert('Cannot Review', canReviewReason);
                    return;
                  }

                  setReviewModalVisible(true);
                }}
                style={styles.writeReviewButton}
              >
                <Ionicons name="create-outline" size={16} color="#0A58A5" />
                <ThemedText style={styles.writeReviewText}>Write a Review</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push(`/provider/reviews?id=${providerId}`)}
                style={styles.viewAllButton}
              >
                <ThemedText style={styles.viewAllText}>View All</ThemedText>
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
            allowResponding={true}
            expandedByDefault={testimonialsExpanded}
            maxReviewsCollapsed={1}
            currentUserId={currentUserId}
            onRespondToReview={handleRespondToReview}
            onMarkHelpful={async (reviewId) => {
              if (!currentUserId) {
                Alert.alert('Sign In Required', 'Please sign in to vote');
                return;
              }
              try {
                await markHelpful(reviewId);
              } catch {
                showToast('Failed to update vote', 'error');
              }
            }}
            onDeleteReview={async (reviewId) => {
              try {
                await deleteReview(reviewId);
                showToast('Review deleted', 'success');
              } catch {
                showToast('Failed to delete review', 'error');
              }
            }}
          />
        </View>

        <View style={styles.section}>
          <ThemedText type="subtitle">Pricing Estimate</ThemedText>
          <ThemedText>{provider.pricing}</ThemedText>
          <Button
            label="Book Now"
            onPress={() => {
              router.push(`/booking/new?providerId=${provider.id}`);
            }}
            variant="primary"
            style={styles.quoteButton}
          />
        </View>
      </ScrollView>

      <Modal
        animationType="slide"
        transparent={true}
        visible={reviewModalVisible}
        onRequestClose={() => setReviewModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <ThemedView style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View>
                <ThemedText style={{ fontSize: 20, fontWeight: '700' }}>Write a Review</ThemedText>
                <ThemedText style={{ fontSize: 14, opacity: 0.6, marginTop: 4 }}>Share your experience</ThemedText>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setReviewModalVisible(false);
                  setNewReviewRating(0);
                  setNewReviewComment('');
                }}
                style={{
                  padding: 8,
                  borderRadius: 20,
                  backgroundColor: 'rgba(128, 128, 128, 0.1)',
                }}
              >
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Rating Section */}
              <View style={{ marginBottom: 24 }}>
                <ThemedText style={{ fontSize: 16, fontWeight: '600', marginBottom: 12 }}>
                  How would you rate your experience?
                </ThemedText>
                <StarRatingSelector
                  rating={newReviewRating}
                  onRatingChange={setNewReviewRating}
                />
                {newReviewRating > 0 && (
                  <ThemedText style={{ textAlign: 'center', opacity: 0.7, marginTop: 8 }}>
                    {newReviewRating === 5 ? 'Excellent!' :
                     newReviewRating === 4 ? 'Very Good' :
                     newReviewRating === 3 ? 'Good' :
                     newReviewRating === 2 ? 'Fair' : 'Poor'}
                  </ThemedText>
                )}
              </View>

              {/* Comment Section */}
              <View style={{ marginBottom: 24 }}>
                <ThemedText style={{ fontSize: 16, fontWeight: '600', marginBottom: 12 }}>
                  Tell us more about your experience
                </ThemedText>
                <TextInput
                  style={[styles.reviewInput, { color: theme.text, borderColor: theme.icon }]}
                  placeholder="What did you like? What could be improved?"
                  placeholderTextColor={theme.icon}
                  multiline
                  numberOfLines={5}
                  value={newReviewComment}
                  onChangeText={setNewReviewComment}
                />
                <ThemedText style={{ fontSize: 12, opacity: 0.5, marginTop: 8, textAlign: 'right' }}>
                  {newReviewComment.length}/500 characters
                </ThemedText>
              </View>

              {/* Image Attachment Section - Coming Soon */}
              <View style={{
                marginBottom: 24,
                padding: 16,
                backgroundColor: 'rgba(128, 128, 128, 0.1)',
                borderRadius: 12,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Ionicons name="camera-outline" size={20} color={theme.icon} />
                  <ThemedText style={{ fontSize: 16, fontWeight: '600', marginLeft: 8 }}>
                    Add Photos
                  </ThemedText>
                  <View style={{
                    backgroundColor: theme.tint,
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 8,
                    marginLeft: 8,
                  }}>
                    <ThemedText style={{ fontSize: 10, color: 'white', fontWeight: '600' }}>
                      COMING SOON
                    </ThemedText>
                  </View>
                </View>
                <ThemedText style={{ fontSize: 14, opacity: 0.6 }}>
                  Photo attachments will be available in a future update
                </ThemedText>
              </View>
            </ScrollView>

            {/* Submit Button */}
            <View style={{ marginTop: 16 }}>
              <Button
                label={submittingReview ? "Submitting..." : "Submit Review"}
                onPress={handleSubmitReview}
                variant="primary"
                disabled={submittingReview || newReviewRating === 0 || !newReviewComment.trim()}
                style={{ paddingVertical: 16, borderRadius: 12 }}
              />
            </View>
          </ThemedView>
        </View>
      </Modal>

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
    writeReviewButton: {
      flexDirection: 'row',
      alignItems: 'center',
      marginRight: 16,
    },
    writeReviewText: {
      color: '#0A58A5',
      fontSize: 14,
      marginLeft: 4,
      fontWeight: '500',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 20,
      paddingBottom: 40,
      maxHeight: '90%',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 24,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(128, 128, 128, 0.2)',
    },
    ratingLabel: {
      fontSize: 16,
      marginBottom: 10,
    },
    starRatingSelector: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginBottom: 20,
    },
    starButton: {
      padding: 5,
    },
    commentLabel: {
      fontSize: 16,
      marginBottom: 10,
    },
    reviewInput: {
      borderWidth: 1,
      borderRadius: 12,
      padding: 16,
      minHeight: 120,
      textAlignVertical: 'top',
      fontSize: 16,
      lineHeight: 24,
    },
    modalActions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    modalButton: {
      flex: 1,
      marginHorizontal: 5,
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