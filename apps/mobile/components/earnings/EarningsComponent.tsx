import { View, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Ionicons } from '@expo/vector-icons';
import { Appearance } from 'react-native';
import { Colors } from '@/constants/Colors';
import {
  EarningViewModel,
  EarningsSummary,
  EarningPeriod,
  EarningsBreakdown,
  EarningStatus,
} from '@/types/earning';

type EarningsComponentProps = {
  earnings: EarningViewModel[];
  summary: EarningsSummary | null;
  breakdown: EarningsBreakdown[];
  isLoading?: boolean;
  isRefreshing?: boolean;
  period: EarningPeriod;
  onPeriodChange: (period: EarningPeriod) => void;
  statusFilter: EarningStatus | 'all';
  onStatusFilterChange: (status: EarningStatus | 'all') => void;
  onRefresh?: () => void;
};

const STATUS_CONFIG: Record<EarningStatus, { color: string; icon: string; label: string }> = {
  pending: { color: '#FFC107', icon: 'time-outline', label: 'Pending' },
  completed: { color: '#4CAF50', icon: 'checkmark-circle-outline', label: 'Completed' },
  paid: { color: '#0A58A5', icon: 'wallet-outline', label: 'Paid' },
  failed: { color: '#F44336', icon: 'close-circle-outline', label: 'Failed' },
};

const TYPE_LABELS: Record<string, string> = {
  service_payment: 'Service',
  tip: 'Tip',
  bonus: 'Bonus',
  refund: 'Refund',
};

export default function EarningsComponent({
  earnings,
  summary,
  breakdown,
  isLoading = false,
  isRefreshing = false,
  period,
  onPeriodChange,
  statusFilter,
  onStatusFilterChange,
  onRefresh,
}: EarningsComponentProps) {
  const colorScheme = Appearance.getColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;

  const formatCurrency = (amount: number, currency: string = 'XOF') => {
    // Amount stored in smallest unit; divide by 100 for display
    const value = amount / 100;
    return `${value.toLocaleString('fr-FR')} ${currency}`;
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return 'Invalid date';
    }
  };

  // Compute max for breakdown chart scaling
  const maxBreakdown = Math.max(...breakdown.map((b) => b.amount), 1);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.tint} />
        <ThemedText style={styles.loadingText}>Loading earnings...</ThemedText>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        ) : undefined
      }
    >
      {/* ── Period Selector ── */}
      <View style={styles.filterWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContent}
        >
          {(
            [
              { id: 'week', label: 'This Week' },
              { id: 'month', label: 'This Month' },
              { id: 'year', label: 'This Year' },
              { id: 'all', label: 'All Time' },
            ] as { id: EarningPeriod; label: string }[]
          ).map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.filterTab, period === item.id && styles.activeFilterTab]}
              onPress={() => onPeriodChange(item.id)}
            >
              <ThemedText
                style={[styles.filterTabText, period === item.id && styles.activeFilterTabText]}
              >
                {item.label}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ── Summary Card ── */}
      {summary && (
        <ThemedView style={styles.summaryCard}>
          <ThemedText style={styles.summaryPeriodLabel}>{summary.periodLabel}</ThemedText>
          <ThemedText style={styles.summaryTotalAmount}>
            {formatCurrency(summary.totalEarnings, summary.currency)}
          </ThemedText>
          <ThemedText style={styles.summarySubLabel}>Total Earned</ThemedText>

          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <View style={[styles.summaryDot, { backgroundColor: '#FFC107' }]} />
              <View>
                <ThemedText style={styles.summaryItemLabel}>Pending</ThemedText>
                <ThemedText style={styles.summaryItemAmount}>
                  {formatCurrency(summary.pendingEarnings, summary.currency)}
                </ThemedText>
              </View>
            </View>
            <View style={styles.summaryItem}>
              <View style={[styles.summaryDot, { backgroundColor: '#0A58A5' }]} />
              <View>
                      <ThemedText style={styles.summaryItemLabel}>Paid</ThemedText>
                      <ThemedText style={styles.summaryItemAmount}>
                        {formatCurrency(summary.paidEarnings, summary.currency)}
                      </ThemedText>
              </View>
            </View>
            <View style={styles.summaryItem}>
              <View style={[styles.summaryDot, { backgroundColor: '#4CAF50' }]} />
              <View>
                <ThemedText style={styles.summaryItemLabel}>Transactions</ThemedText>
                <ThemedText style={styles.summaryItemAmount}>
                  {summary.totalTransactions}
                </ThemedText>
              </View>
            </View>
          </View>
        </ThemedView>
      )}

      {/* ── Bar Chart (last 6 months) ── using simple styling*/}
      {breakdown.length > 0 && (
        <ThemedView style={styles.chartCard}>
          <ThemedText style={styles.chartTitle}>Monthly Overview</ThemedText>
          <View style={styles.chartContainer}>
            {breakdown.map((item) => (
              <View key={item.label} style={styles.barColumn}>
                <ThemedText style={styles.barValue}>
                  {item.amount > 0 ? `${Math.round(item.amount / 100)}` : ''}
                </ThemedText>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        height: `${Math.max((item.amount / maxBreakdown) * 100, 2)}%`,
                        backgroundColor: item.amount > 0 ? '#0A58A5' : '#E0E0E0',
                      },
                    ]}
                  />
                </View>
                <ThemedText style={styles.barLabel}>{item.label}</ThemedText>
              </View>
            ))}
          </View>
        </ThemedView>
      )}

      {/* ── Status Filter ── */}
      <View style={styles.filterWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContent}
        >
          {(
            [
              { id: 'all', label: 'All' },
              { id: 'completed', label: 'Completed' },
              { id: 'pending', label: 'Pending' },
              { id: 'paid', label: 'Paid' },
            ] as { id: EarningStatus | 'all'; label: string }[]
          ).map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.statusTab,
                statusFilter === item.id && styles.activeStatusTab,
              ]}
              onPress={() => onStatusFilterChange(item.id)}
            >
              <ThemedText
                style={[
                  styles.statusTabText,
                  statusFilter === item.id && styles.activeStatusTabText,
                ]}
              >
                {item.label}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ── Transaction List ── */}
      <View style={styles.transactionsContainer}>
        <ThemedText style={styles.sectionTitle}>Transactions</ThemedText>

        {earnings.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="cash-outline" size={48} color={theme.icon} />
            <ThemedText style={styles.emptyStateTitle}>No Earnings Yet</ThemedText>
            <ThemedText style={styles.emptyStateText}>
              When clients pay for your services, earnings will appear here.
            </ThemedText>
          </View>
        ) : (
          earnings.map((earning) => {
            const statusCfg = STATUS_CONFIG[earning.status];
            return (
              <ThemedView key={earning.id} style={styles.transactionCard}>
                <View style={styles.transactionRow}>
                  <View style={[styles.transactionIcon, { backgroundColor: statusCfg.color + '20' }]}>
                    <Ionicons name={statusCfg.icon as any} size={22} color={statusCfg.color} />
                  </View>

                  <View style={styles.transactionDetails}>
                    <ThemedText style={styles.transactionDescription} numberOfLines={1}>
                      {earning.description}
                    </ThemedText>
                    <View style={styles.transactionMeta}>
                      {earning.serviceName && (
                        <ThemedText style={styles.transactionService}>
                          {earning.serviceName}
                        </ThemedText>
                      )}
                      <ThemedText style={styles.transactionDate}>
                        {formatDate(earning.createdAt)}
                      </ThemedText>
                    </View>
                  </View>

                  <View style={styles.transactionAmountCol}>
                    <ThemedText
                      style={[
                        styles.transactionAmount,
                        earning.type === 'refund' && { color: '#F44336' },
                      ]}
                    >
                      {earning.type === 'refund' ? '−' : '+'}
                      {formatCurrency(earning.netAmount, earning.currency)}
                    </ThemedText>
                    <View style={[styles.statusBadge, { backgroundColor: statusCfg.color + '20' }]}>
                      <ThemedText style={[styles.statusBadgeText, { color: statusCfg.color }]}>
                        {statusCfg.label}
                      </ThemedText>
                    </View>
                  </View>
                </View>

                {/* Platform fee detail */}
                {earning.platformFee > 0 && (
                  <View style={styles.feeRow}>
                    <ThemedText style={styles.feeText}>
                      Platform fee: {formatCurrency(earning.platformFee, earning.currency)}
                    </ThemedText>
                  </View>
                )}

                {/* Manual withdrawals are not supported — platform issues payouts */}
              </ThemedView>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    padding: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },

  // ── Period / Status Filters ──
  filterWrapper: {
    backgroundColor: 'transparent',
    marginBottom: 8,
    minHeight: 50,
  },
  filterContent: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    minWidth: 90,
    alignItems: 'center',
  },
  activeFilterTab: {
    backgroundColor: '#0A58A5',
    borderColor: '#0A58A5',
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  activeFilterTabText: {
    color: 'white',
    fontWeight: '600',
  },
  statusTab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginRight: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  activeStatusTab: {
    backgroundColor: '#0A58A5',
    borderColor: '#0A58A5',
  },
  statusTabText: {
    fontSize: 13,
    fontWeight: '500',
  },
  activeStatusTabText: {
    color: 'white',
    fontWeight: '600',
  },

  // ── Summary Card ──
  summaryCard: {
    margin: 16,
    marginTop: 4,
    padding: 24,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    alignItems: 'center',
  },
  summaryPeriodLabel: {
    fontSize: 14,
    opacity: 0.6,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  summaryTotalAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    lineHeight: 44,
  },
  summarySubLabel: {
    fontSize: 14,
    opacity: 0.5,
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  summaryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  summaryItemLabel: {
    fontSize: 12,
    opacity: 0.6,
  },
  summaryItemAmount: {
    fontSize: 14,
    fontWeight: '600',
  },

  // ── Chart Card ──
  chartCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 20,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  barValue: {
    fontSize: 10,
    opacity: 0.6,
    marginBottom: 4,
  },
  barTrack: {
    width: 28,
    height: 80,
    backgroundColor: '#E0E0E020',
    borderRadius: 4,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 4,
  },
  barLabel: {
    fontSize: 12,
    marginTop: 6,
    opacity: 0.7,
  },

  // ── Transactions List ──
  transactionsContainer: {
    padding: 16,
    paddingTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  transactionCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  transactionIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionDetails: {
    flex: 1,
    marginRight: 8,
  },
  transactionDescription: {
    fontSize: 15,
    fontWeight: '600',
  },
  transactionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  transactionService: {
    fontSize: 13,
    color: '#0A58A5',
    marginRight: 8,
  },
  transactionDate: {
    fontSize: 12,
    opacity: 0.6,
  },
  transactionAmountCol: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: '#4CAF50',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 4,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  feeRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E0E0E0',
  },
  feeText: {
    fontSize: 12,
    opacity: 0.5,
    fontStyle: 'italic',
  },
  withdrawButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 10,
  },
  withdrawButtonText: {
    color: '#0A58A5',
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '500',
  },

  // ── Empty State ──
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    textAlign: 'center',
    opacity: 0.7,
  },
});
