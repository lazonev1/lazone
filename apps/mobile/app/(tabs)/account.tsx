import { View, StyleSheet, SafeAreaView, Image, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Appearance } from 'react-native';
import { Colors } from '@/constants/Colors';
import { ACCOUNT_MENU_ITEMS } from '@/constants/account';
import { MenuItem } from '@/types/user';
import { SegmentedToggle } from '@/components/ui/SegmentedToggle';
import { useState } from 'react';
import { MenuSection } from '@/components/ui/MenuSection';
import { useAuth } from '@/contexts/auth';
import { Button } from '@lazone/ui';

export default function AccountScreen() {
  const router = useRouter();
  const { user, userProfile, logout, refreshUserProfile, loading } = useAuth();
  const colorScheme = Appearance.getColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const styles = createStyles(theme, colorScheme);
  
  const [userRole, setUserRole] = useState<'requester' | 'provider'>(
    userProfile?.role === 'provider' ? 'provider' : 'requester'
  );

  // Show a loading indicator while the initial auth check is happening.
  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  // If auth check is done, but there's no profile, show a specific message.
  // This is the state you were seeing.
  if (!userProfile) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ThemedText style={{textAlign: 'center', marginBottom: 20}}>Could not load profile. This can happen if the database entry is missing for this user.</ThemedText>
        <Button label="Try to Refresh Profile" onPress={refreshUserProfile} />
        <Button label="Logout" onPress={logout} style={{marginTop: 20}}/>
      </SafeAreaView>
    );
  }

  const navigateTo = (route: string) => {
    router.push(route);
  };

  const handleProfilePress = () => {
    router.push({
      pathname: '/account/info',
      params: {
        userProfile: JSON.stringify(userProfile)
      }
    });
  };

  const handleLogout = async () => {
    try {
      await logout();
      // The root layout will handle redirection automatically.
    } catch (error) {
      Alert.alert("Logout Failed", "An error occurred while logging out.");
    }
  };

  // Filter resources based on current role
  const getFilteredResources = (items: MenuItem[], role: 'requester' | 'provider') => {
    return items.filter(item => {
      if (!item.roleAccess) return true;
      return item.roleAccess.includes(role);
    });
  };
  /**
 * Returns provider-specific menu items with the real authenticated user's ID.
 * This replaces the old static `provider` array that used MOCK_USER_PROFILE.id.
 */
  const getProviderMenuItems = (userId: string): MenuItem[] => {
    console.log('Generating provider menu items for user ID:', userId);
    return [
        
        {
            id: 'my-portfolio',
            label: 'View or Edit Portfolio',
            route: `/provider/${userId}`,
            icon: 'briefcase-outline',
        },
        {
            id: 'earnings',
            label: 'Earnings',
            route: '/earnings',
            icon: 'cash-outline',
        },
        {
            id: 'reviews',
            label: 'Reviews',
            route: `/provider/reviews?id=${userId}`,
            icon: 'star-outline',
        },
        {
            id: 'invite',
            label: 'Invite friends',
            route: '/invite',
            icon: 'share-social-outline',
        },
    ];
}

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollContent}>
        <TouchableOpacity onPress={handleProfilePress} activeOpacity={0.7}>
          <ThemedView style={styles.header}>
            <Image
              source={userProfile.avatar ? { uri: userProfile.avatar } : require('../../assets/images/icon.png')}
              style={styles.avatar}
            />
            <View style={styles.headerText}>
              <ThemedText type="defaultSemiBold" style={styles.name}>
                {`${userProfile.firstName} ${userProfile.lastName}`}
              </ThemedText>
              <ThemedText>{user?.email}</ThemedText>
              <ThemedText>{userProfile.phoneNumber}</ThemedText>
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
            items={user?.uid ? getProviderMenuItems(user.uid) : []}
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

        <Button label="Logout" onPress={handleLogout} style={{marginTop: 20}}/>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(theme: any, colorScheme: 'dark' | 'light' | null | undefined) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
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
