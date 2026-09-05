import { useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Image, ScrollView, SafeAreaView, ActivityIndicator, RefreshControl } from 'react-native';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { Platform } from 'react-native';
import { Colors } from '@/constants/Colors';
import { Appearance } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBookmarks } from '@/hooks/useBookmarks';
import { useTranslation } from 'react-i18next';

export default function SavedProvidersScreen() {
    const router = useRouter();
    const { t } = useTranslation('account');
    const colorScheme = Appearance.getColorScheme();
    const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
    const styles = createStyles(theme, colorScheme);

    const {
        bookmarkedProviders,
        fetchBookmarkedProviders,
        isLoadingProviders,
        toggleBookmark,
    } = useBookmarks();

    // Fetch full provider details when screen comes into focus
    useFocusEffect(
        useCallback(() => {
            fetchBookmarkedProviders();
        }, [fetchBookmarkedProviders])
    );

    // Navigate to a provider's profile
    const navigateToProvider = (id: string | number) => {
        router.push(`/provider/${id}`);
    };

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen
                options={{
                    headerTitle: t('saved.title'),
                    headerStyle: {
                        backgroundColor: theme.background,
                    },
                    headerTintColor: theme.text,
                }}
            />

            <ScrollView
                style={styles.scrollContainer}
                refreshControl={
                    <RefreshControl
                        refreshing={isLoadingProviders}
                        onRefresh={fetchBookmarkedProviders}
                        tintColor={theme.tint}
                    />
                }
            >
                {isLoadingProviders && bookmarkedProviders.length === 0 ? (
                    <View style={styles.emptyState}>
                        <ActivityIndicator size="large" color={theme.tint} />
                        <ThemedText style={styles.emptySubtext}>{t('saved.loading')}</ThemedText>
                    </View>
                ) : bookmarkedProviders.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="bookmark" size={48} color={theme.tabIconDefault} />
                        <ThemedText style={styles.emptyText}>
                            {t('saved.emptyTitle')}
                        </ThemedText>
                        <ThemedText style={styles.emptySubtext}>
                            {t('saved.emptySubtitle')}
                        </ThemedText>
                    </View>
                ) : (
                    bookmarkedProviders.map((provider) => (
                        <TouchableOpacity
                            key={String(provider.id)}
                            style={styles.providerCard}
                            onPress={() => navigateToProvider(provider.id)}
                        >
                            <Image
                                source={
                                    typeof provider.avatar === 'string'
                                        ? { uri: provider.avatar }
                                        : provider.avatar ?? require('@/assets/images/avatar-placeholder.png')
                                }
                                style={styles.providerAvatar}
                            />
                            <View style={styles.providerInfo}>
                                <View style={styles.nameRow}>
                                    <ThemedText type="defaultSemiBold" style={styles.providerName}>
                                        {provider.name}
                                    </ThemedText>
                                    <TouchableOpacity
                                        onPress={() => toggleBookmark(String(provider.id))}
                                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                    >
                                        <Ionicons name="bookmark" size={22} color="#0A58A5" />
                                    </TouchableOpacity>
                                </View>
                                <ThemedText style={styles.providerDescription}>
                                    {provider.profession}
                                </ThemedText>
                                <View style={styles.ratingContainer}>
                                    <ThemedText style={styles.ratingText}>
                                        {provider.rating.toFixed(1)} <Ionicons name="star" size={14} color="#FFD700" />
                                    </ThemedText>
                                    <ThemedText style={styles.reviewCount}>
                                        {t('saved.reviewCount', { count: provider.reviews })}
                                    </ThemedText>
                                </View>
                            </View>
                        </TouchableOpacity>
                    ))
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

function createStyles(theme: any, colorScheme: string | null | undefined) {
    return StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: theme.background,
        },
        scrollContainer: {
            padding: 16,
        },
        providerCard: {
            flexDirection: 'row',
            backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : theme.background,
            borderRadius: 16,
            padding: 16,
            marginBottom: 16,
            alignItems: 'center',
            ...Platform.select({
                ios: {
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                },
                android: {
                    elevation: 3,
                },
            }),
            borderWidth: colorScheme === 'dark' ? 1 : 0,
            borderColor: colorScheme === 'dark' ? '#333' : 'transparent',
        },
        providerAvatar: {
            width: 60,
            height: 60,
            borderRadius: 30,
            marginRight: 16,
        },
        providerInfo: {
            flex: 1,
        },
        nameRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 4,
        },
        providerName: {
            fontSize: 18,
            flex: 1,
            marginRight: 8,
        },
        providerDescription: {
            fontSize: 14,
            opacity: 0.8,
            marginBottom: 6,
        },
        ratingContainer: {
            flexDirection: 'row',
            alignItems: 'center',
        },
        ratingText: {
            fontSize: 14,
            color: '#FFD700',
            fontWeight: '600',
        },
        reviewCount: {
            fontSize: 13,
            opacity: 0.6,
            marginLeft: 6,
        },
        emptyState: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            paddingVertical: 60,
            paddingHorizontal: 30,
        },
        emptyText: {
            fontSize: 18,
            fontWeight: '600',
            marginTop: 16,
            textAlign: 'center',
        },
        emptySubtext: {
            fontSize: 14,
            opacity: 0.7,
            marginTop: 8,
            textAlign: 'center',
        },
    });
}
