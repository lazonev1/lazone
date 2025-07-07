import { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Image, ScrollView, SafeAreaView } from 'react-native';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Platform } from 'react-native';
import { Colors } from '@/constants/Colors';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { SAVED_PROVIDERS } from '@/constants/providers';

type Provider = {
    id: number;
    name: string;
    description: string;
    rating: number;
    avatar: any;
};

export default function SavedProvidersScreen() {
    const router = useRouter();
    const colorScheme = Appearance.getColorScheme();
    const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
    const styles = createStyles(theme, colorScheme);

    const [savedProviders, setSavedProviders] = useState<Provider[]>([]);

    useFocusEffect(() => {
        loadSavedProviders();
    });

    // Normally, load saved providers from AsyncStorage
    const loadSavedProviders = async () => {
        try {
            const savedData = await AsyncStorage.getItem('savedProviders');
            if (savedData) {
                setSavedProviders(JSON.parse(savedData));
            } else {
                setSavedProviders(
                    SAVED_PROVIDERS.map((p) => ({
                        id: p.id,
                        name: p.name,
                        description: p.bio,
                        rating: p.rating,
                        avatar: p.avatar,
                    }))
                );
            }
        } catch (error) {
            console.error("Failed to load saved providers:", error);
        }
    };

    // Navigate to a provider's profile
    const navigateToProvider = (id: number) => {
        router.push(`/provider/${id}`);
    };

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen
                options={{
                    headerTitle: "Saved Providers",
                    headerStyle: {
                        backgroundColor: theme.background,
                    },
                    headerTintColor: theme.text,
                }}
            />

            <ScrollView style={styles.scrollContainer}>
                {savedProviders.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="bookmark" size={48} color={theme.tabIconDefault} />
                        <ThemedText style={styles.emptyText}>
                            You haven't saved any providers yet.
                        </ThemedText>
                        <ThemedText style={styles.emptySubtext}>
                            Browse providers and tap the bookmark icon to save them here.
                        </ThemedText>
                    </View>
                ) : (
                    savedProviders.map((provider) => (
                        <TouchableOpacity
                            key={provider.id}
                            style={styles.providerCard}
                            // No need to add unbookmark ability. User can press and unbookmark from the profider's profile and 
                            // saved providers list will update itself and reflect back here.
                            onPress={() => navigateToProvider(provider.id)}

                        >
                            <Image source={provider.avatar} style={styles.providerAvatar} />
                            <View style={styles.providerInfo}>
                                <ThemedText type="defaultSemiBold" style={styles.providerName}>
                                    {provider.name}
                                </ThemedText>
                                <ThemedText style={styles.providerDescription}>
                                    {provider.description}
                                </ThemedText>
                                <View style={styles.ratingContainer}>
                                    <ThemedText style={styles.ratingText}>
                                        {provider.rating} <Ionicons name="star" size={14} color="#FFD700" />
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
            // Shadow for light mode
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
        providerName: {
            fontSize: 18,
            marginBottom: 4,
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