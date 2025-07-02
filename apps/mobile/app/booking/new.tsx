import { View, StyleSheet, Alert, TouchableWithoutFeedback, Keyboard, Appearance } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { BookingRequestForm } from '@/components/booking/BookingRequestForm';
import { Providers } from '@/constants/providers';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';

export default function NewBookingScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const colorScheme = Appearance.getColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;

  // Retrieve the provider based on the providerId from params
  const providerId = params.providerId as string;
  const provider = Providers.find(p => p.id.toString() === providerId);
  if (!provider) {return (<View style={styles.container}><ThemedText>Provider not found</ThemedText></View> );}

  const handleSubmit = async (booking: BookingRequest) => {
    try {
      // TODO: Replace with actual API call
      //Simulate API call to submit booking request
      console.log('Submitting booking request:', booking);
      // Simulate a successful API response
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
      // This is a placeholder booking ID. In a real application, this would be returned from the API.
      const bookingId = 2; // This will come from API

      // Navigate to success screen
      router.replace({
        pathname: '/booking/success',
        params: {
          bookingId,
          providerName: provider.name
        }
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to submit booking request');
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Stack.Screen 
          options={{
            title: `Book ${provider.name}`,
            headerBackTitle: 'Back',
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