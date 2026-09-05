import { StyleSheet, View, Appearance, TouchableOpacity } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { BookingViewModel } from '@/types/booking';
import { BookingStatus, getStatusColor } from './BookingStatus';
import { ArrowButton } from '@/components/ui/ArrowButton';
import { Colors } from '@/constants/Colors';
import { useTranslation } from 'react-i18next';

type Props = {
  booking: BookingViewModel;
  onPress?: (booking: BookingViewModel) => void;
};

export function BookingCard({ booking, onPress }: Props) {
  const colorScheme = Appearance.getColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const { t, i18n } = useTranslation('booking');
  const dateLocale = i18n.language === 'fr' ? 'fr-FR' : 'en-US';

  const formatDateTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return {
        date: date.toLocaleDateString(dateLocale, {
          month: 'short',
          day: 'numeric',
        }),
        time: date.toLocaleTimeString(dateLocale, {
          hour: 'numeric',
          minute: '2-digit',
          hour12: i18n.language !== 'fr',
        }).toLowerCase()
      };
    } catch {
      return { date: '', time: '' };
    }
  };

  const { date, time } = formatDateTime(booking.bookingDate);
  const formattedDateTime = t('card.dateAtTime', { date, time });

  return (
    <TouchableOpacity
      onPress={() => onPress?.(booking)}
      activeOpacity={0.7}
    >
      <ThemedView
        style={[styles.card, { borderLeftWidth: 5, borderLeftColor: getStatusColor(booking.status) }]}
        lightColor={theme.background}
        darkColor="#333"
      >
        <View style={styles.content}>
          <View style={styles.details}>
            <ThemedText type="defaultSemiBold">{booking.providerName}</ThemedText>
            <ThemedText>{booking.serviceName}</ThemedText>
            <ThemedText style={styles.datetime}>{formattedDateTime}</ThemedText>
            <BookingStatus status={booking.status} />
          </View>
          <View pointerEvents="none">
            <ArrowButton 
              onPress={() => {}} 
              color={colorScheme === 'dark' ? '#fff' : '#666'}
            />
          </View>
        </View>
      </ThemedView>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  details: {
    flex: 1,
  },
  datetime: {
    fontSize: 13,
    opacity: 0.6,
  },
});
