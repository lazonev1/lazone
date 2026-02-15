import {
  View,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Share,
  Alert,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Ionicons } from '@expo/vector-icons';
import { Appearance } from 'react-native';
import { Colors } from '@/constants/Colors';
import {
  ReferralViewModel,
  ReferralSummary,
  ReferralStatus,
} from '@/types/referral';

// ── Props ──

type InviteComponentProps = {
  referrals: ReferralViewModel[];
  summary: ReferralSummary | null;
  isLoading?: boolean;
  isRefreshing?: boolean;
  statusFilter: ReferralStatus | 'all';
  onStatusFilterChange: (status: ReferralStatus | 'all') => void;
  onRefresh?: () => void;
  referralCode: string;
};

// ── Status config ──

const STATUS_CONFIG: Record<ReferralStatus, { color: string; icon: string; label: string }> = {
  pending: { color: '#FFC107', icon: 'time-outline', label: 'Pending' },
  signed_up: { color: '#2196F3', icon: 'person-add-outline', label: 'Signed Up' },
  completed: { color: '#4CAF50', icon: 'checkmark-circle-outline', label: 'Completed' },
  rewarded: { color: '#0A58A5', icon: 'gift-outline', label: 'Rewarded' },
};

// ── Component ──

export default function InviteComponent({
  referrals,
  summary,
  isLoading = false,
  isRefreshing = false,
  statusFilter,
  onStatusFilterChange,
  onRefresh,
  referralCode,
}: InviteComponentProps) {
  const colorScheme = Appearance.getColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;

  const formatCurrency = (amount: number, currency: string = 'XOF') => {
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

  const handleCopyCode = async () => {
    try {
      await Clipboard.setStringAsync(referralCode);
      Alert.alert('Copied!', 'Referral code copied to clipboard.');
    } catch {
      Alert.alert('Error', 'Could not copy code.');
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Join LaZone — the #1 service marketplace! Use my referral code ${referralCode} when you sign up and we both get rewarded. Download now: https://lazone.app/invite?code=${referralCode}`,
      });
    } catch {
      // user cancelled or other error — silently ignore
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.tint} />
        <ThemedText style={styles.loadingText}>Loading...</ThemedText>
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
      {/* ── Hero / Referral Code Card ── */}
      <ThemedView style={styles.heroCard}>
        <View style={styles.heroIconContainer}>
          <Ionicons name="gift-outline" size={40} color="#0A58A5" />
        </View>
        <ThemedText style={styles.heroTitle}>Invite Friends, Get Rewarded</ThemedText>
        <ThemedText style={styles.heroSubtitle}>
          Share your code and earn rewards when friends join and use LaZone.
        </ThemedText>

        {/* Code display */}
        <View style={[styles.codeContainer, { borderColor: theme.tint + '40' }]}>
          <ThemedText style={styles.codeLabel}>Your referral code</ThemedText>
          <ThemedText style={[styles.codeText, { color: theme.tint }]}>
            {referralCode || '------'}
          </ThemedText>
        </View>

        {/* Action buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionButton, styles.copyButton]}
            onPress={handleCopyCode}
            activeOpacity={0.7}
          >
            <Ionicons name="copy-outline" size={18} color="#0A58A5" />
            <ThemedText style={styles.copyButtonText}>Copy</ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.shareButton]}
            onPress={handleShare}
            activeOpacity={0.7}
          >
            <Ionicons name="share-social-outline" size={18} color="#fff" />
            <ThemedText style={styles.shareButtonText}>Share Invite</ThemedText>
          </TouchableOpacity>
        </View>
      </ThemedView>

      {/* ── Stats Row ── */}
      {summary && (
        <View style={styles.statsRow}>
          <ThemedView style={styles.statCard}>
            <ThemedText style={styles.statValue}>{summary.totalInvited}</ThemedText>
            <ThemedText style={styles.statLabel}>Invited</ThemedText>
          </ThemedView>
          <ThemedView style={styles.statCard}>
            <ThemedText style={[styles.statValue, { color: '#2196F3' }]}>
              {summary.totalSignedUp}
            </ThemedText>
            <ThemedText style={styles.statLabel}>Signed Up</ThemedText>
          </ThemedView>
          <ThemedView style={styles.statCard}>
            <ThemedText style={[styles.statValue, { color: '#4CAF50' }]}>
              {summary.totalCompleted}
            </ThemedText>
            <ThemedText style={styles.statLabel}>Completed</ThemedText>
          </ThemedView>
        </View>
      )}

      {/* ── Rewards earned row ── */}
      {summary && summary.totalRewardsEarned > 0 && (
        <ThemedView style={styles.rewardBanner}>
          <Ionicons name="trophy-outline" size={22} color="#0A58A5" />
          <View style={styles.rewardBannerText}>
            <ThemedText style={styles.rewardAmount}>
              {formatCurrency(summary.totalRewardsEarned, summary.currency)}
            </ThemedText>
            <ThemedText style={styles.rewardLabel}>Total rewards earned</ThemedText>
          </View>
        </ThemedView>
      )}

      {/* ── How it works ── */}
      <ThemedView style={styles.howItWorksCard}>
        <ThemedText style={styles.sectionTitle}>How it works</ThemedText>
        {[
          { icon: 'paper-plane-outline' as const, step: '1', text: 'Share your code with friends via SMS, WhatsApp, or any app' },
          { icon: 'person-add-outline' as const, step: '2', text: 'Your friend signs up on LaZone using your code' },
          { icon: 'gift-outline' as const, step: '3', text: 'You both get rewarded after their first completed service' },
        ].map((item) => (
          <View key={item.step} style={styles.stepRow}>
            <View style={styles.stepIconCircle}>
              <Ionicons name={item.icon} size={18} color="#0A58A5" />
            </View>
            <View style={styles.stepContent}>
              <ThemedText style={styles.stepNumber}>Step {item.step}</ThemedText>
              <ThemedText style={styles.stepText}>{item.text}</ThemedText>
            </View>
          </View>
        ))}
      </ThemedView>

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
              { id: 'pending', label: 'Pending' },
              { id: 'signed_up', label: 'Signed Up' },
              { id: 'completed', label: 'Completed' },
              { id: 'rewarded', label: 'Rewarded' },
            ] as { id: ReferralStatus | 'all'; label: string }[]
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

      {/* ── Referral List ── */}
      <View style={styles.listContainer}>
        <ThemedText style={styles.sectionTitle}>Your Referrals</ThemedText>

        {referrals.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={48} color={theme.icon} />
            <ThemedText style={styles.emptyStateTitle}>No Referrals Yet</ThemedText>
            <ThemedText style={styles.emptyStateText}>
              Share your referral code to start inviting friends!
            </ThemedText>
          </View>
        ) : (
          referrals.map((referral) => {
            const statusCfg = STATUS_CONFIG[referral.status];
            return (
              <ThemedView key={referral.id} style={styles.referralCard}>
                <View style={styles.referralRow}>
                  <View
                    style={[
                      styles.referralIcon,
                      { backgroundColor: statusCfg.color + '20' },
                    ]}
                  >
                    <Ionicons
                      name={statusCfg.icon as any}
                      size={22}
                      color={statusCfg.color}
                    />
                  </View>

                  <View style={styles.referralDetails}>
                    <ThemedText style={styles.referralName} numberOfLines={1}>
                      {referral.refereeName || referral.refereeContact}
                    </ThemedText>
                    <ThemedText style={styles.referralDate}>
                      {formatDate(referral.createdAt)}
                    </ThemedText>
                  </View>

                  <View style={styles.referralStatusCol}>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: statusCfg.color + '20' },
                      ]}
                    >
                      <ThemedText
                        style={[styles.statusBadgeText, { color: statusCfg.color }]}
                      >
                        {statusCfg.label}
                      </ThemedText>
                    </View>
                    {referral.status === 'rewarded' && referral.rewardAmount > 0 && (
                      <ThemedText style={styles.rewardBadge}>
                        +{formatCurrency(referral.rewardAmount, referral.currency)}
                      </ThemedText>
                    )}
                  </View>
                </View>
              </ThemedView>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

// ── Styles ──

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

  // ── Hero Card ──
  heroCard: {
    margin: 16,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  heroIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#0A58A510',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 14,
    opacity: 0.6,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  codeContainer: {
    width: '100%',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  codeLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
    opacity: 0.5,
    marginBottom: 4,
  },
  codeText: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 2,
  },

  // ── Action Buttons ──
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  copyButton: {
    backgroundColor: '#0A58A515',
    borderWidth: 1,
    borderColor: '#0A58A540',
  },
  copyButtonText: {
    color: '#0A58A5',
    fontSize: 15,
    fontWeight: '600',
  },
  shareButton: {
    backgroundColor: '#0A58A5',
  },
  shareButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },

  // ── Stats Row ──
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 4,
  },

  // ── Reward Banner ──
  rewardBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    gap: 12,
  },
  rewardBannerText: {
    flex: 1,
  },
  rewardAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0A58A5',
  },
  rewardLabel: {
    fontSize: 12,
    opacity: 0.6,
  },

  // ── How it works ──
  howItWorksCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 14,
    gap: 12,
  },
  stepIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0A58A510',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepContent: {
    flex: 1,
  },
  stepNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0A58A5',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  stepText: {
    fontSize: 14,
    opacity: 0.7,
    lineHeight: 20,
    marginTop: 2,
  },

  // ── Filter Tabs ──
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

  // ── Referral List ──
  listContainer: {
    padding: 16,
    paddingTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  referralCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  referralRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  referralIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  referralDetails: {
    flex: 1,
    marginRight: 8,
  },
  referralName: {
    fontSize: 15,
    fontWeight: '600',
  },
  referralDate: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 2,
  },
  referralStatusCol: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  rewardBadge: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4CAF50',
    marginTop: 4,
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
