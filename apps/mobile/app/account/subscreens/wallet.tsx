import { View, StyleSheet } from 'react-native';
import { useNavigation } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { PaymentMethodCard } from '@/components/account/PaymentCard';

type PaymentMethod = {
  id: number;
  name: string;
  type: 'mobile' | 'card';
  image: any;
  isDefault?: boolean;
  number: string;
  cardNumber: string;
};

export default function WalletScreen() {
  const navigation = useNavigation();
  const styles = createStyles()
  
  useEffect(() => {
    navigation.setOptions({ title: 'Wallet' });
  }, []);
  
  const paymentMethods: PaymentMethod[] = [
    {
      id: 1,
      name: 'MTN Momo',
      type: 'mobile',
      image: require('@/assets/images/wallet-mtn.jpeg'),
      isDefault: true,
      number: '+226 123 456 7890',
      cardNumber: '',
    },
    {
      id: 2,
      name: 'Orange Money',
      type: 'mobile',
      image: require('@/assets/images/wallet-orange.png'),
      number: '+226 123 456 7890',
      cardNumber: '',
    },
    {
      id: 3,
      name: 'Visa',
      type: 'card',
      image: require('@/assets/images/wallet-card.png'),
      number: '4789',
      cardNumber: '•••••• 67890',
    },
  ];
  
  return (
    <View style={styles.container}>
      {paymentMethods.map(method => (
        <PaymentMethodCard key={method.id} method={method} />
      ))}
      
      <ThemedText type="subtitle" style={styles.sectionTitle}>Settings</ThemedText>
      
      <ThemedView style={styles.settingItem}>
        <Ionicons name="card-outline" size={24} color="#666" style={styles.settingIcon} />
        <ThemedText>Manage payment info</ThemedText>
      </ThemedView>
      
      <ThemedView style={styles.settingItem}>
        <Ionicons name="add-circle-outline" size={24} color="#666" style={styles.settingIcon} />
        <ThemedText>Add new payment method</ThemedText>
      </ThemedView>
      
      <ThemedView style={styles.settingItem}>
        <Ionicons name="lock-closed-outline" size={24} color="#666" style={styles.settingIcon} />
        <ThemedText>Security</ThemedText>
      </ThemedView>
    </View>
  );
}


const createStyles = () => StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    marginTop: 25,
    marginBottom: 10,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 15,
    borderRadius: 14,
    marginBottom: 12,
  },
  settingIcon: {
    marginRight: 15,
  },
});
