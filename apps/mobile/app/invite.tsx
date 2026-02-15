import { SafeAreaView, StyleSheet, Appearance } from 'react-native';
import { Stack } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/contexts/auth';
import { useReferrals } from '@/hooks/useReferrals';
import InviteComponent from '@/components/invite/InviteComponent';

export default function InviteScreen() {
  const colorScheme = Appearance.getColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;

  const { user } = useAuth();
  const userId = user?.uid;

  const {
    referrals,
    summary,
    isLoading,
    isRefreshing,
    statusFilter,
    setStatusFilter,
    refresh,
    referralCode,
  } = useReferrals(userId);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ title: 'Invite Friends' }} />
      <InviteComponent
        referrals={referrals}
        summary={summary}
        isLoading={isLoading}
        isRefreshing={isRefreshing}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        onRefresh={refresh}
        referralCode={referralCode}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
