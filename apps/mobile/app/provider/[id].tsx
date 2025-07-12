import { ScrollView, StyleSheet, Image, View, Text, TouchableOpacity, Animated, Appearance, SafeAreaView, Pressable, Modal, TextInput, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useState, useRef, useEffect } from 'react';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '@/constants/Colors';
import { Providers } from '@/hooks/useProviders';
import { Button } from '@lazone/ui';
import { Ionicons } from '@expo/vector-icons';
import { useBookmarks } from '@/hooks/useBookmarks';
import ReviewsComponent from '@/components/reviews/ReviewsComponent';
import { useReviews } from '@/hooks/useReviews';

export default function ProviderProfileScreen() {
  const colorScheme = Appearance.getColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const { id } = useLocalSearchParams();

  const scrollRef = useRef(null);
  const aboutRef = useRef(null);
  const portfolioRef = useRef(null);
  const testimonialRef = useRef(null);
  const scrollY = useRef(new Animated.Value(0)).current;

  const scrollTo = (ref) => {
    if (ref.current && scrollRef.current) {
      ref.current.measure((x, y, width, height, pageX, pageY) => {
        scrollRef.current.scrollTo({ y: pageY - 100, animated: true });
      });
    }
  };

  const provider = Providers.find((p) => p.id === parseInt(id, 10)) || Providers[0];

  const [portfolioExpanded, setPortfolioExpanded] = useState(false);
  const [servicesExpanded, setServicesExpanded] = useState(false);
  const [testimonialsExpanded, setTestimonialsExpanded] = useState(false);
  const [mainTabsPosition, setMainTabsPosition] = useState(0);

  const stickyHeaderOpacity = scrollY.interpolate({
    inputRange: [mainTabsPosition - 1, mainTabsPosition],
    outputRange: [0, 1],
    extrapolate: 'clamp'
  });

  const onMainTabsLayout = (event) => {
    const layout = event.nativeEvent.layout;
    setMainTabsPosition(layout.y);
  };

  const navigation = useNavigation();
  useEffect(() => {
    navigation.setOptions({ title: provider.name });
  }, [provider.name]);

  const styles = createStyles(theme, colorScheme);

  const handleScroll = (event) => {
    const scrollPosition = event.nativeEvent.contentOffset.y;
    scrollY.setValue(scrollPosition);
  };

  const { isBookmarked, toggleBookmark, isLoading } = useBookmarks();
  const providerId = id.toString();

  const { 
    reviews: reviewItems, 
    respondToReview: handleRespondToReview 
  } = useReviews(providerId);

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

  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [newReviewRating, setNewReviewRating] = useState(0);
  const [newReviewComment, setNewReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const submitReview = async () => {
    if (newReviewRating === 0) {
      Alert.alert('Error', 'Please select a rating');
      return;
    }

    if (!newReviewComment.trim()) {
      Alert.alert('Error', 'Please write a comment');
      return;
    }

    setSubmittingReview(true);

    try {
      const newReview = {
        id: `review-${Date.now()}`,
        clientName: 'You',
        rating: newReviewRating,
        comment: newReviewComment,
        date: new Date().toISOString()
      };

      setReviewModalVisible(false);
      setNewReviewRating(0);
      setNewReviewComment('');
    } catch (error) {
      Alert.alert('Error', 'Failed to submit review. Please try again.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const StarRatingSelector = ({ rating, onRatingChange }) => {
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
        <Image source={provider.cover} style={styles.cover} />

        <ThemedView style={styles.profileHeader}>
          <Image source={provider.avatar} style={styles.avatarInline} />
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
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
            {(portfolioExpanded ? provider.portfolio : provider.portfolio.slice(0, 1)).map((item, i) => (
              <View key={i} style={styles.card}>
                <Image source={item.image} style={styles.image} />
                {item.caption && <ThemedText style={styles.caption}>{item.caption}</ThemedText>}
              </View>
            ))}
          </ScrollView>
          {provider.portfolio.length > 1 && (
            <Pressable onPress={() => setPortfolioExpanded(!portfolioExpanded)}>
              <ThemedText style={styles.toggle}>{portfolioExpanded ? 'Show Less' : 'See More'}</ThemedText>
            </Pressable>
          )}
        </View>

        <View style={styles.section}>
          <ThemedText type="subtitle">Service Showcase</ThemedText>
          {(servicesExpanded ? provider.services : provider.services.slice(0, 1)).map((service, i) => (
            <View key={i} style={styles.serviceCard}>
              <ThemedText type="defaultSemiBold">{service.name}</ThemedText>
              <ThemedText style={{ color: '#FF9900' }}>{service.price}</ThemedText>
              <ThemedText style={{ fontSize: 12 }}>{service.availability}</ThemedText>
            </View>
          ))}
          {provider.services.length > 1 && (
            <Pressable onPress={() => setServicesExpanded(!servicesExpanded)}>
              <ThemedText style={styles.toggle}>{servicesExpanded ? 'Show Less' : 'See More'}</ThemedText>
            </Pressable>
          )}
        </View>

        <View style={styles.section} ref={testimonialRef}>
          <View style={styles.sectionHeader}>
            <ThemedText type="subtitle">Client Reviews</ThemedText>
            <View style={styles.reviewActions}>
              <TouchableOpacity 
                onPress={() => setReviewModalVisible(true)}
                style={styles.writeReviewButton}
              >
                <Ionicons name="create-outline" size={16} color="#0A58A5"  />
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
            showStats={false}
            showFilters={false}
            allowResponding={true}
            expandedByDefault={testimonialsExpanded}
            maxReviewsCollapsed={1}
            onRespondToReview={handleRespondToReview}
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
            <View style={styles.modalHeader}>
              {/* <ThemedText type="subtitle">Write a Review</ThemedText> */}
              <TouchableOpacity onPress={() => setReviewModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            
            <ThemedText style={styles.ratingLabel}>Your Rating</ThemedText>
            <StarRatingSelector 
              rating={newReviewRating} 
              onRatingChange={setNewReviewRating} 
            />
            
            <ThemedText style={styles.commentLabel}>Your Review</ThemedText>
            <TextInput
              style={[styles.reviewInput, { color: theme.text, borderColor: theme.border }]}
              placeholder="Share your experience with this provider..."
              placeholderTextColor={theme.icon}
              multiline
              numberOfLines={5}
              value={newReviewComment}
              onChangeText={setNewReviewComment}
            />
            
            <View style={styles.modalActions}>
              <Button
                label="Cancel"
                onPress={() => setReviewModalVisible(false)}
                variant="secondary"
                style={styles.modalButton}
              />
              <Button
                label={submittingReview ? "Submitting..." : "Submit Review"}
                onPress={submitReview}
                variant="primary"
                style={styles.modalButton}
                disabled={submittingReview || newReviewRating === 0 || !newReviewComment.trim()}
              />
            </View>
          </ThemedView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function createStyles(theme, colorScheme) {
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

    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    modalContent: {
      width: '100%',
      borderRadius: 16,
      padding: 20,
      maxHeight: '80%',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
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
      borderRadius: 8,
      padding: 12,
      minHeight: 120,
      textAlignVertical: 'top',
      marginBottom: 20,
    },
    modalActions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    modalButton: {
      flex: 1,
      marginHorizontal: 5,
    },
  });
}