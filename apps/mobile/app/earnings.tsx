import { SafeAreaView, StyleSheet, Appearance } from 'react-native';
import { Stack } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/contexts/auth';
import { useEarnings } from '@/hooks/useEarnings';
import EarningsComponent from '@/components/earnings/EarningsComponent';

export default function EarningsScreen() {
  const colorScheme = Appearance.getColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;

  const { user } = useAuth();
  const providerId = user?.uid;

  const {
    earnings,
    summary,
    breakdown,
    isLoading,
    isRefreshing,
    period,
    setPeriod,
    statusFilter,
    setStatusFilter,
    refresh,
  } = useEarnings(providerId);

  // Payouts are handled by the platform; no manual withdraw action.

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ title: 'Earnings' }} />
      <EarningsComponent
        earnings={earnings}
        summary={summary}
        breakdown={breakdown}
        isLoading={isLoading}
        isRefreshing={isRefreshing}
        period={period}
        onPeriodChange={setPeriod}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        onRefresh={refresh}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
