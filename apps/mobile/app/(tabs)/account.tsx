import { View, StyleSheet, SafeAreaView, Image, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Appearance } from 'react-native';
import { Colors } from '@/constants/Colors';
import { ACCOUNT_MENU_ITEMS } from '@/constants/account';
import { MenuItem } from '@/types/user';
import { useState, useEffect } from 'react';
import { MenuSection } from '@/components/ui/MenuSection';
import { useAuth } from '@/contexts/auth';
import { Button } from '@lazone/ui';

export default function AccountScreen() {
  const router = useRouter();
  const { user, userProfile, logout, refreshUserProfile, loading } = useAuth();
  const colorScheme = Appearance.getColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const styles = createStyles(theme, colorScheme);

  // Determine the effective role for display:
  // - 'requester' or 'provider' => single role, no switching
  // - 'both' => defaults to 'provider', can switch to 'requester'
  const isDualRole = userProfile?.role === 'both';
  console.log('User Profile Role:', userProfile?.role, 'Effective Role:', isDualRole ? 'provider (default)' : userProfile?.role);
  const effectiveRole: 'requester' | 'provider' = isDualRole
    ? 'provider'
    : (userProfile?.role === 'provider' ? 'provider' : 'requester');

  const [userRole, setUserRole] = useState<'requester' | 'provider'>(effectiveRole);

  // Sync userRole state when userProfile loads or changes
  useEffect(() => {
    console.log
    setUserRole(effectiveRole);
  }, [effectiveRole]);

  // Show a loading indicator while the initial auth check is happening.
  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  // If auth check is done, but there's no profile, show a specific message.
  
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

  /**
   * Switches the active role for dual-profile users.
   * This requires a full app reload so the entire app state
   * reflects the new role. Reload logic is stubbed for now.
   */
  const handleSwitchRole = (newRole: 'requester' | 'provider') => {
    setUserRole(newRole);
    // TODO: Implement full app reload to propagate the new role across all screens.
    // e.g. Updates.reloadAsync() or a custom restart mechanism.
    Alert.alert(
      'Profile Switched',
      `Switched to ${newRole} profile. A full app reload is needed to apply this across the app.`
    );
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

        {/* Role-specific menu section */}
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

        {/* Dual-role users can switch profiles (requires full app reload) */}
        {isDualRole && (
          <Button
            label={userRole === 'provider' ? 'Switch to Requester Profile' : 'Switch to Provider Profile'}
            onPress={() => handleSwitchRole(userRole === 'provider' ? 'requester' : 'provider')}
            style={styles.switchRoleButton}
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
    switchRoleButton: {
      marginBottom: 16,
    },
  });
}
