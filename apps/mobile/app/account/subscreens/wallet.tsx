import { View, StyleSheet } from 'react-native';
import { useNavigation } from 'expo-router';
import { useEffect, useState } from 'react';
import { PaymentMethodCard } from '@/components/account/PaymentCard';
import { PaymentMethod } from '@/types/user'
import { Appearance } from 'react-native';
import { Colors } from '@/constants/Colors';
import { WALLET_SETTINGS_ITEMS } from '@/constants/account';
import { MenuItem } from '@/types/user';
import { TouchableOpacity } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { Ionicons } from '@expo/vector-icons';
import { ArrowButton } from '@/components/ui/ArrowButton';

export default function WalletScreen() {
  const navigation = useNavigation();
  const colorScheme = Appearance.getColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const styles = createStyles(theme, colorScheme)
  
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
      <MenuSection 
        title='Settings' 
        items={WALLET_SETTINGS_ITEMS.settings}
        onPress={() => {}} 
        styles={styles}
      /> 
    </View>
  );
}
// Abdoul's method just as-is
function MenuSection({ title, items, onPress, styles }: { 
  title?: string; 
  items: MenuItem[];
  onPress: (route: string) => void;
  styles: any;
}) {
  return (
    <View style={[
      styles.section,
      !title && styles.sectionWithoutTitle
    ]}>
      {title && (
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          {title}
        </ThemedText>
      )}
      {items.map((item, index) => (
        <View key={item.id}>
          <TouchableOpacity 
            onPress={() => onPress(item.route)} 
            style={styles.menuItem}
          >
            <View style={styles.menuItemLeft}>
              {item.icon && (
                <Ionicons 
                  name={item.icon} 
                  size={24} 
                  style={styles.menuIcon}
                />
              )}
              <ThemedText>{item.label}</ThemedText>
            </View>
            <ArrowButton onPress={() => onPress(item.route)} />
          </TouchableOpacity>
          {index < items.length - 1 && <View style={styles.divider} />}
        </View>
      ))}
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

const createStyles = (theme: any, colorScheme: 'dark' | 'light' | undefined | null) => StyleSheet.create({
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
      section: {
      marginBottom: 24,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 8,
      backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : theme.background,
      // backgroundColor:theme.background,
    },
    sectionWithoutTitle: {
      paddingTop: 0,
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
});
