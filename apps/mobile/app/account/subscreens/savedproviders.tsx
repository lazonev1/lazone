import { useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Image, ScrollView, SafeAreaView, ActivityIndicator, RefreshControl, Platform, Appearance } from 'react-native';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { useBookmarks } from '@/hooks/useBookmarks';
import { Button } from '@lazone/ui';
import { useTranslation } from 'react-i18next';

export default function SavedProvidersScreen() {
    const router = useRouter();
    const { t } = useTranslation('account');
    const colorScheme = Appearance.getColorScheme();
    const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
    const styles = createStyles(theme, colorScheme);

    const { entries, bookmarkedIds, fetchBookmarkedProviders, isLoading, hasLoadError, toggleBookmark, isBookmarkPending, canChangeBookmarks } = useBookmarks();

    useFocusEffect(useCallback(() => { void fetchBookmarkedProviders(); }, [fetchBookmarkedProviders]));

    const showRetry = hasLoadError || entries.some(entry => entry.status === 'failed' || (entry.status === 'available' && entry.stale));
    const waitingForProfiles = !hasLoadError && entries.length === 0 && (isLoading || bookmarkedIds.length > 0);

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ headerTitle: t('saved.title'), headerStyle: { backgroundColor: theme.background }, headerTintColor: theme.text }} />
            <ScrollView
                style={styles.scrollContainer}
                refreshControl={<RefreshControl refreshing={isLoading} onRefresh={fetchBookmarkedProviders} tintColor={theme.tint} />}
            >
                {showRetry && (
                    <View style={styles.recovery}>
                        <ThemedText accessibilityLiveRegion="polite">
                            {t(entries.length ? 'saved.partialFailure' : 'saved.loadFailed')}
                        </ThemedText>
                        <Button label={t('saved.retry')} onPress={fetchBookmarkedProviders} disabled={isLoading} variant="secondary" size="small" />
                    </View>
                )}
                {waitingForProfiles ? (
                    <View style={styles.emptyState}>
                        <ActivityIndicator size="large" color={theme.tint} />
                        <ThemedText style={styles.emptySubtext}>{t('saved.loading')}</ThemedText>
                    </View>
                ) : !hasLoadError && entries.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="bookmark" size={48} color={theme.tabIconDefault} />
                        <ThemedText style={styles.emptyText}>{t('saved.emptyTitle')}</ThemedText>
                        <ThemedText style={styles.emptySubtext}>{t('saved.emptySubtitle')}</ThemedText>
                    </View>
                ) : entries.map(entry => {
                    const busy = isBookmarkPending(entry.id);
                    return (
                        <View key={entry.id} style={styles.providerCard}>
                            {entry.status === 'available' ? (
                                <TouchableOpacity
                                    style={styles.providerLink}
                                    accessibilityRole="button"
                                    onPress={() => router.push({ pathname: '/provider/[id]', params: { id: entry.id } })}
                                >
                                    <Image
                                        source={typeof entry.provider.avatar === 'string' ? { uri: entry.provider.avatar } : entry.provider.avatar ?? require('@/assets/images/avatar-placeholder.png')}
                                        style={styles.providerAvatar}
                                    />
                                    <View style={styles.providerInfo}>
                                        <ThemedText type="defaultSemiBold" style={styles.providerName}>{entry.provider.name}</ThemedText>
                                        <ThemedText style={styles.providerDescription}>{entry.provider.profession}</ThemedText>
                                        <View style={styles.ratingContainer}>
                                            <ThemedText style={styles.ratingText}>
                                                {entry.provider.rating.toFixed(1)} <Ionicons name="star" size={14} color="#FFD700" />
                                            </ThemedText>
                                            <ThemedText style={styles.reviewCount}>{t('saved.reviewCount', { count: entry.provider.reviews })}</ThemedText>
                                        </View>
                                        {entry.stale && <ThemedText style={styles.reviewCount}>{t('saved.stale')}</ThemedText>}
                                    </View>
                                </TouchableOpacity>
                            ) : (
                                <View style={styles.providerInfo}>
                                    <ThemedText type="defaultSemiBold">{t(entry.status === 'unavailable' ? 'saved.unavailable' : 'saved.profileFailed')}</ThemedText>
                                    <ThemedText style={styles.providerDescription}>
                                        {t(entry.status === 'unavailable' ? 'saved.unavailableHint' : 'saved.profileFailedHint')}
                                    </ThemedText>
                                </View>
                            )}
                            <TouchableOpacity
                                style={styles.removeButton}
                                onPress={() => toggleBookmark(entry.id)}
                                disabled={!canChangeBookmarks || busy}
                                accessibilityRole="button"
                                accessibilityLabel={t('saved.remove')}
                                accessibilityState={{ busy, disabled: !canChangeBookmarks || busy }}
                            >
                                {busy ? <ActivityIndicator color={theme.tint} /> : <Ionicons name="bookmark" size={22} color={theme.tint} />}
                            </TouchableOpacity>
                        </View>
                    );
                })}
            </ScrollView>
        </SafeAreaView>
    );
}

function createStyles(theme: typeof Colors.light, colorScheme: ReturnType<typeof Appearance.getColorScheme>) {
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
        providerLink: {
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
        },
        removeButton: { minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' },
        recovery: { gap: 12, paddingVertical: 12 },
        providerName: {
            fontSize: 18,
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
