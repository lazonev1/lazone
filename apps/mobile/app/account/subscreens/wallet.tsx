import { View, StyleSheet } from 'react-native';
import { useNavigation } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { PaymentMethodCard } from '@/components/account/PaymentCard';
import { PaymentMethod } from '@/types/user'

export default function WalletScreen() {
  const navigation = useNavigation();
  const styles = createStyles()
  
  useEffect(() => {
    navigation.setOptions({ title: 'Wallet' });
  }, []);
  // This is a mock method simulating how we can add a mobile payment method
  const addPaymentMethod = (mobileNumber: string, ) => {
    const methodInfo = getMethodInfo(mobileNumber);
    const newPaymentMethod: PaymentMethod = {
      id: paymentMethods.length,
      vendor: methodInfo.vendor,
      label: methodInfo.label,
      type: 'mobile',
      isDefault: false,
      vendorLogoSource: methodInfo.vendorLogoSource,
      mobileNumber: mobileNumber
    }
    paymentMethods.push(newPaymentMethod)
  }
  const setDefaultMethod = (id: number) => {
  setPaymentMethods(current => 
    current.map(method => ({
      ...method,
      isDefault: method.id === id
    }))
  );
  // savePaymentMethodsToStorage(updatedMethods);
};
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([
    {
      id: 0,
      vendor: 'MTN',
      label: 'MTN Momo',
      type: 'mobile',
      vendorLogoSource: require('@/assets/images/wallet-mtn.jpeg'),
      isDefault: true,
      mobileNumber: '+226 123 456 7890',
      
    },
    {
      id: 1,
      vendor: 'Orange',
      label: 'Orange Money',
      type: 'mobile',
      isDefault: false,
      vendorLogoSource: require('@/assets/images/wallet-orange.png'),
      mobileNumber: '+226 098 765 4321',
    },
  ]);
  
  return (
    <View style={styles.container}>
      {paymentMethods.map(method => (
        <PaymentMethodCard 
          key={method.id} 
          method={method} 
          onSetDefault={() => setDefaultMethod(method.id)}
          />
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
        <ThemedText>Security Info</ThemedText>
      </ThemedView>
    </View>
  );
}

const getMethodInfo = (mobileNumber: string): { vendor: string, label: string, vendorLogoSource: any } => {
  // Example logic to determine vendor info based on mobile number
  if (mobileNumber.startsWith('+226 123')) {
    return {
      vendor: 'MTN',
      label: 'MTN Momo',
      vendorLogoSource: require('@/assets/images/wallet-mtn.jpeg'),
    };
  }
  // Default fallback
  return {
    vendor: 'Orange',
    label: 'Orange Money',
    vendorLogoSource: require('@/assets/images/wallet-orange.png'),
  };
};

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
