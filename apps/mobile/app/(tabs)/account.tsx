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
import { Theme } from '@/constants/theme';
import { padding, margin, getColor, } from '@/utils/styleUtils';

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
    router.push({
      pathname: '/account/info',
      params: {
        userProfile: JSON.stringify(MOCK_USER_PROFILE)
      }
    });
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
  const mode = colorScheme === 'dark' ? 'dark' : 'light';

  return StyleSheet.create({
    container: {
      flex: 1,
    },
    scrollContent: {
      ...padding.all('md'),
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      ...padding.all('md'),
      ...margin.bottom('lg'),
      borderRadius: Theme.borderRadius.md,
      backgroundColor: getColor(`${mode}.card`),
      borderColor: getColor(`${mode}.border`),
      borderWidth: 1,
      ...margin.top('md'),
    },
    avatar: {
      width: Theme.spacing.xxxl,
      height: Theme.spacing.xxxl,
      borderRadius: Theme.spacing.xl,
      ...margin.right('md'),
    },
    headerText: {
      flex: 1,
    },
    name: {
      fontSize: Theme.typography.size.subtitle,
      ...margin.bottom('xs'),
    },
    section: {
      ...margin.bottom('lg'),
      ...padding.vertical('md'),
      ...padding.horizontal('md'),
      borderRadius: Theme.borderRadius.sm,
      backgroundColor: getColor(`${mode}.card`),
    },
    sectionWithoutTitle: {
      paddingTop: 0,
    },
    sectionTitle: {
      ...margin.bottom('md'),
    },
    menuItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderRadius: Theme.borderRadius.sm,
    },
    menuItemLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    menuIcon: {
      ...margin.right('md'),
      color: theme.text,
      width: Theme.spacing.md + Theme.spacing.xs,
    },
    divider: {
      height: 0.5,
      backgroundColor: getColor(`${mode}.divider`),
      marginLeft: Theme.spacing.md + Theme.spacing.xl,
      marginRight: Theme.spacing.md + Theme.spacing.sm,
      ...margin.vertical('sm'),
    },
  });
}
