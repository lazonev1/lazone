import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import { useTranslation } from 'react-i18next';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useAuth } from '@/contexts/auth';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { t } = useTranslation();
  const { userProfile } = useAuth();
  const isProvider = userProfile?.role === 'provider' || userProfile?.role === 'both';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarStyle: Platform.select({
          ios: {
            // Use a transparent background on iOS to show the blur effect
            position: 'absolute',
          },
          default: {},
        }),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.home'),
          tabBarIcon: ({ color }: { color: string }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />

      <Tabs.Screen
        name="booked"
        options={{
          title: t('tabs.booked'),
          tabBarIcon: ({ color }: { color: string }) => <IconSymbol size={28} name="calendar" color={color} />,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: t('tabs.messages'),
          tabBarIcon: ({ color }: { color: string }) => <IconSymbol size={28} name="message" color={color} />,
        }}
      />
      <Tabs.Screen
        name="business"
        options={{
          title: t('tabs.business'),
          tabBarIcon: ({ color }: { color: string }) => <IconSymbol size={28} name="briefcase" color={color} />,
          // When href undefined, Expo will use the default href and tab is shown. Otherwise, tab is hidden.
          href: isProvider ? undefined : null, 
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: t('tabs.account'),
          tabBarIcon: ({ color }: { color: string }) => <IconSymbol size={28} name="person.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
