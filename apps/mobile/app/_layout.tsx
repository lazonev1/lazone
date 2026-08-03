import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useEffect, useRef, useState } from 'react';
import { DeviceEventEmitter } from 'react-native';
import { AuthProvider, useAuth } from '@/contexts/auth';
import { BookmarkProvider } from '@/contexts/bookmarks';
import { useColorScheme } from '@/hooks/useColorScheme';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  registerForegroundMessageHandler,
  registerNotificationOpenHandlers,
  SHOW_NOTIFICATION_BANNER,
} from '@/services/notifications/messageHandlers';
import NotificationBanner from '@/components/ui/NotificationBanner';

function RootLayoutNav() {
  const { isAuthenticated, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const pathname = usePathname();

  const currentPathRef = useRef<string | null>(null);
  useEffect(() => {
    currentPathRef.current = pathname;
  }, [pathname]);

  const [bannerConfig, setBannerConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    conversationId?: string;
    avatar?: string;
  }>({
    visible: false,
    title: '',
    message: '',
  });

  useEffect(() => {
    const bannerListener = DeviceEventEmitter.addListener(SHOW_NOTIFICATION_BANNER, (data) => {
      setBannerConfig({
        visible: true,
        title: data.title,
        message: data.message,
        conversationId: data.conversationId,
        avatar: data.avatar,
      });
    });

    return () => {
      bannerListener.remove();
    };
  }, []);

  useEffect(() => {
    if (loading) {
      return;
    }

    const inAuthGroup = segments[0] === '(auth)';

    if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, segments, loading, router]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const unsubscribeForeground = registerForegroundMessageHandler(() => currentPathRef.current);
    const unsubscribeOpen = registerNotificationOpenHandlers(router);

    return () => {
      unsubscribeForeground();
      unsubscribeOpen();
    };
  }, [isAuthenticated, router]);

  if (loading) {
    return null;
  }

  return (
    <>
      <Stack>
        <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false, title: '' }} />
        <Stack.Screen name="+not-found" />
      </Stack>

      <NotificationBanner
        visible={bannerConfig.visible}
        title={bannerConfig.title}
        message={bannerConfig.message}
        avatar={bannerConfig.avatar}
        onPress={() => {
          setBannerConfig((prev) => ({ ...prev, visible: false }));
          if (bannerConfig.conversationId) {
            router.push({
              pathname: '/messages/[id]',
              params: {
                id: bannerConfig.conversationId,
                name: bannerConfig.title,
                avatar: bannerConfig.avatar || '',
              },
            });
          }
        }}
        onDismiss={() => {
          setBannerConfig((prev) => ({ ...prev, visible: false }));
        }}
      />
    </>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  if (!loaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <BookmarkProvider>
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <RootLayoutNav />
            <StatusBar style="auto" />
          </ThemeProvider>
        </BookmarkProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
