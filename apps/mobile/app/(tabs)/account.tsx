import { View, StyleSheet, SafeAreaView, Image, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Appearance } from 'react-native';
import { Colors } from '@/constants/Colors';
import { getProfileMenuItems } from '@/constants/account';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { MenuSection } from '@/components/ui/MenuSection';
import { useAuth } from '@/contexts/auth';
import { Button } from '@lazone/ui';
import { LoginPrompt } from "@/components/auth/LoginPrompt";
import { Ionicons } from '@expo/vector-icons';

export default function AccountScreen() {
  const router = useRouter();
  const { t } = useTranslation(['account', 'provider']);
  const { user, userProfile, logout, refreshUserProfile, loading } = useAuth();
  const colorScheme = Appearance.getColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const styles = createStyles(theme, colorScheme);

  const isProvider = userProfile?.role === 'provider' || userProfile?.role === 'both';
  const [businessVisible, setBusinessVisible] = useState(true);
  const menuItems = getProfileMenuItems();

  // Show a loading indicator while the initial auth check is happening.
  if (!user) { return <LoginPrompt title={t('tab.loginTitle')} message={t('tab.loginMessage')} />; }

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
        <ThemedText style={{textAlign: 'center', marginBottom: 20}}>{t('tab.profileLoadFailed')}</ThemedText>
        <Button label={t('tab.refreshProfile')} onPress={refreshUserProfile} />
        <Button label={t('tab.logout')} onPress={logout} style={{marginTop: 20}}/>
      </SafeAreaView>
    );
  }

  const navigateTo = (route: string) => {
    router.push(route as any);
  };

  const handleProfilePress = () => {
    router.push({
      pathname: '/account/info',
      params: {
        userProfile: JSON.stringify(userProfile)
      }
    });
  };


  const handleToggleBusinessVisibility = (value: boolean) => {
    setBusinessVisible(value);
    // TODO: persist this to Firestore on the provider document
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* ── Profile header ─────────────────────────────── */}
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
            <Ionicons name="chevron-forward" size={20} color={theme.icon} />
          </ThemedView>
        </TouchableOpacity>

        {/* ── General (everyone) ──────────────────────────── */}
        <MenuSection
          items={menuItems.general}
          onPress={navigateTo}
          styles={styles}
        />

        {/* ── Settings (everyone) ─────────────────────────── */}
        <MenuSection
          title={t('menu.settings')}
          items={menuItems.settings}
          onPress={navigateTo}
          styles={styles}
        />

        {/* ── Business visibility toggle (providers only) ── */}
        {isProvider && (
          <ThemedView style={styles.toggleSection}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleLeft}>
                <Ionicons name="storefront-outline" size={24} style={styles.menuIcon} />
                <View>
                  <ThemedText type="defaultSemiBold">{t('tab.businessVisibility')}</ThemedText>
                  <ThemedText style={styles.toggleHint}>
                    {businessVisible ? t('tab.businessVisible') : t('tab.businessHidden')}
                  </ThemedText>
                </View>
              </View>
              <Switch
                value={businessVisible}
                onValueChange={handleToggleBusinessVisibility}
                trackColor={{ false: '#767577', true: '#0A58A5' }}
                thumbColor="#fff"
              />
            </View>
          </ThemedView>
        )}

        {/* ── Support (everyone) ──────────────────────────── */}
        <MenuSection
          title={t('menu.support')}
          items={menuItems.support}
          onPress={navigateTo}
          styles={styles}
        />

        {/* ── Become a Provider (requesters only) ─────────── */}
        {!isProvider && (
          <TouchableOpacity
            style={styles.becomeProviderCard}
            activeOpacity={0.7}
            onPress={() => router.push('/provider/registration')}
          >
            <Ionicons name="briefcase-outline" size={24} color="#0A58A5" style={{ marginRight: 12 }} />
            <View style={{ flex: 1 }}>
              <ThemedText type="defaultSemiBold">{t('provider:registration.title')}</ThemedText>
              <ThemedText style={styles.becomeProviderHint}>
                {t('tab.becomeProviderHint')}
              </ThemedText>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.icon} />
          </TouchableOpacity>
        )}

        {/* <Button label="Logout" onPress={handleLogout} style={{ marginTop: 20 }} /> */}

        {/* Bottom spacing */}
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(theme: any, colorScheme: 'dark' | 'light' | null | undefined) {
  const cardBg = colorScheme === 'dark' ? '#1c1c1e' : theme.background;
  const borderClr = colorScheme === 'dark' ? '#333' : '#ccc';

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
      backgroundColor: cardBg,
      borderColor: borderClr,
      borderWidth: 1,
      marginTop: 16,
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
      backgroundColor: cardBg,
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

    // ── Business visibility toggle ──
    toggleSection: {
      marginBottom: 24,
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderRadius: 8,
      backgroundColor: cardBg,
    },
    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    toggleLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      marginRight: 12,
    },
    toggleHint: {
      fontSize: 12,
      opacity: 0.5,
      marginTop: 2,
    },

    // ── Become a Provider CTA ──
    becomeProviderCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#0A58A5',
      backgroundColor: colorScheme === 'dark' ? '#0a2540' : '#eaf3fc',
      marginBottom: 8,
    },
    becomeProviderHint: {
      fontSize: 13,
      opacity: 0.6,
      marginTop: 2,
    },
  });
}
