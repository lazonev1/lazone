import { View, StyleSheet, SafeAreaView, Image, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Appearance } from 'react-native';
import { Colors } from '@/constants/Colors';
import { MOCK_USER_PROFILE, ACCOUNT_MENU_ITEMS } from '@/constants/account';
import { MenuItem } from '@/types/user';
import { SegmentedToggle } from '@/components/ui/SegmentedToggle';
import { useState } from 'react';
import { MenuSection } from '@/components/ui/MenuSection';

export default function AccountScreen() {
  const router = useRouter();
  const colorScheme = Appearance.getColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const styles = createStyles(theme, colorScheme);
  const [userRole, setUserRole] = useState<'requester' | 'provider'>(
    MOCK_USER_PROFILE.role === 'requester' || MOCK_USER_PROFILE.role === 'provider'
      ? MOCK_USER_PROFILE.role
      : 'requester'
  );

  const navigateTo = (route: string) => {
    router.push(route);
  };

  const handleProfilePress = () => {
    router.push('/account/info');
  };

  // Filter resources based on current role
  const getFilteredResources = (items: MenuItem[], role: 'requester' | 'provider') => {
    return items.filter(item => {
      if (!item.roleAccess) return true;
      return item.roleAccess.includes(role);
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollContent}>
        <TouchableOpacity onPress={handleProfilePress} activeOpacity={0.7}>
          <ThemedView style={styles.header}>
            <Image
              source={MOCK_USER_PROFILE.avatar}
              style={styles.avatar}
            />
            <View style={styles.headerText}>
              <ThemedText type="defaultSemiBold" style={styles.name}>
                {`${MOCK_USER_PROFILE.firstName} ${MOCK_USER_PROFILE.lastName}`}
              </ThemedText>
              <ThemedText>{MOCK_USER_PROFILE.email}</ThemedText>
              <ThemedText>{MOCK_USER_PROFILE.phone}</ThemedText>
            </View>
          </ThemedView>
        </TouchableOpacity>

        <SegmentedToggle
          options={[
            { label: 'Requester', value: 'requester' },
            { label: 'Provider', value: 'provider' },
          ]}
          value={userRole}
          onChange={(role) => setUserRole(role as 'requester' | 'provider')}
        />

        {/* Show different menu sections based on role */}
        {userRole === 'requester' ? (
          <MenuSection
            items={ACCOUNT_MENU_ITEMS.requester}
            onPress={navigateTo}
            styles={styles}
          />
        ) : (
          <MenuSection
            items={ACCOUNT_MENU_ITEMS.provider || []}
            onPress={navigateTo}
            styles={styles}
          />
        )}

        <MenuSection
          title="Settings"
          items={ACCOUNT_MENU_ITEMS.settings}
          onPress={navigateTo}
          styles={styles}
        />

        <MenuSection
          title="Resources"
          items={getFilteredResources(ACCOUNT_MENU_ITEMS.resources, userRole)}
          onPress={navigateTo}
          styles={styles}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(theme: any, colorScheme: 'dark' | 'light' | null | undefined) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    scrollContent: {
      padding: 16,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      marginBottom: 24,
      borderRadius: 12,
      backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : theme.background,
      // backgroundColor: theme.background,
      borderColor: colorScheme === 'dark' ? '#333' : '#ccc',
      borderWidth: 1,
      marginTop: 16,
      paddingBottom: 16,
      paddingTop: 16,
      paddingHorizontal: 16,
    },
    avatar: {
      width: 64,
      height: 64,
      borderRadius: 32,
      marginRight: 16,
    },
    headerText: {
      flex: 1,
    },
    name: {
      fontSize: 18,
      marginBottom: 4,
    },
    section: {
      marginBottom: 24,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 8,
      backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : theme.background,
      // backgroundColor:theme.background,
    },
    sectionWithoutTitle: {
      paddingTop: 0,
    },
    sectionTitle: {
      marginBottom: 12,
    },
    menuItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderRadius: 8,
    },
    menuItemLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    menuIcon: {
      marginRight: 12,
      color: theme.text,
      width: 24,
    },
    divider: {
      height: 0.5,
      backgroundColor: colorScheme === 'dark' ? '#444' : '#E0E0E0',
      marginLeft: 36,
      marginRight: 25,
      marginVertical: 8,
    },
  });
}
