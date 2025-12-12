import { View, StyleSheet, Alert, TouchableWithoutFeedback, Keyboard, Appearance } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { BookingRequestForm } from '@/components/booking/BookingRequestForm';
import { Providers } from '@/hooks/useProvidersMock';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';

export default function EditBookingScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const colorScheme = Appearance.getColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;

  const providerId = params.providerId as string;
  const provider = Providers.find(p => p.id.toString() === providerId);

  if (!provider) {
    return <ThemedText>Provider not found</ThemedText>;
  }

  const handleSubmit = async (updatedBooking: BookingRequest) => {
    Alert.alert(
      'Confirm Changes',
      'Are you sure you want to modify this booking?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Update',
          onPress: async () => {
            try {
              // TODO: API call to update booking
              await new Promise(resolve => setTimeout(resolve, 1000));
              
              Alert.alert(
                'Booking Updated',
                'Your booking has been successfully updated.',
                [{ text: 'OK', onPress: () => router.back() }]
              );
            } catch (error) {
              Alert.alert('Error', 'Failed to update booking');
            }
          }
        }
      ]
    );
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Stack.Screen 
          options={{
            title: 'Edit Booking',
            headerStyle: {
              backgroundColor: theme.background,
            },
            headerTintColor: theme.text,
          }} 
        />
        <BookingRequestForm
          providerId={providerId}
          services={provider.services}
          onSubmit={handleSubmit}
          onCancel={() => router.back()}
          initialValues={{
            serviceId: params.currentService as string,
            scheduledDate: new Date(params.currentDate as string),
            price: params.currentPrice as string,
            description: params.description as string,
          }}
        />
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  }
});
