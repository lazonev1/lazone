import { ScrollView, StyleSheet, Image, View, Text, TouchableOpacity, Animated, Appearance, SafeAreaView, Pressable } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useState, useRef, useEffect } from 'react';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '@/constants/Colors';
import { Providers } from '@/constants/providers';
import { Button } from '@lazone/ui';
import { push } from 'expo-router/build/global-state/routing';

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
            <ThemedText type="defaultSemiBold" style={styles.name}>{provider.name}</ThemedText>
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
          <ThemedText type="subtitle">Client Testimonials</ThemedText>
          {(testimonialsExpanded ? provider.testimonials : provider.testimonials.slice(0, 2)).map((t, i) => (
            <View key={i} style={styles.testimonial}>
              <ThemedText type="defaultSemiBold">{t.name}</ThemedText>
              <ThemedText>"{t.quote}"</ThemedText>
            </View>
          ))}
          {provider.testimonials.length > 2 && (
            <Pressable onPress={() => setTestimonialsExpanded(!testimonialsExpanded)}>
              <ThemedText style={styles.toggle}>{testimonialsExpanded ? 'Show Less' : 'See More'}</ThemedText>
            </Pressable>
          )}
        </View>

        <View style={styles.section}>
          <ThemedText type="subtitle">Pricing Estimate</ThemedText>
          <ThemedText>{provider.pricing}</ThemedText>
          <Button
            label="Request a Quote"
            onPress={() => {push('/booking/new');}}
            variant="primary"
            style={styles.quoteButton}
          />
        </View>
      </ScrollView>
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
  });
}