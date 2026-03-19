import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from '@/contexts/auth';
import { BookmarkProvider } from '@/contexts/bookmarks';
import { useColorScheme } from '@/hooks/useColorScheme';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  registerForegroundMessageHandler,
  registerNotificationOpenHandlers,
} from '@/services/notifications/messageHandlers';


function RootLayoutNav() {
  const { isAuthenticated, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) {
      return;
    }

    const inAuthGroup = segments[0] === '(auth)';
    // Protected routes that require authentication
    const protectedRoutes = ['booking', 'messages', 'account'];
    const inProtectedRoute = protectedRoutes.includes(segments[0] as string) ||
                             (segments[0] === '(tabs)' && protectedRoutes.includes(segments[1] as string));

    // If authenticated and in auth group, redirect to home
    if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)');
    }
    // If not authenticated and trying to access protected route, redirect to login
    else if (!isAuthenticated && inProtectedRoute) {
      router.replace('/(auth)/login');
    }
    // Otherwise, allow browsing (home, explore, provider details) without auth
  }, [isAuthenticated, segments, loading, router]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const unsubscribeForeground = registerForegroundMessageHandler();
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
    <Stack>
      <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)/signup" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false, title: ''}} />
      <Stack.Screen name="+not-found" />
    </Stack>
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
