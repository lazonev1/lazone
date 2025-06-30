import { View, StyleSheet, SafeAreaView } from 'react-native';
import { useNavigation } from 'expo-router';
import { useEffect, useState } from 'react';
import { PaymentMethodCard } from '@/components/account/PaymentCard';
import { PaymentMethod } from '@/types/user'
import { Appearance } from 'react-native';
import { Colors } from '@/constants/Colors';
import { WALLET_SETTINGS_ITEMS } from '@/constants/account';
import { ThemedText } from '@/components/ThemedText';
import { Ionicons } from '@expo/vector-icons';
import { BottomPopup } from '@/components/account/BottomPopup';
import { ScrollView } from 'react-native-gesture-handler';
import { MenuSection } from '@/components/ui/MenuSection';


export default function WalletScreen() {
  const navigation = useNavigation();
  const colorScheme = Appearance.getColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const styles = createStyles(theme, colorScheme)
  const [securityPopupVisible, setSecurityPopupVisible] = useState(false);
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


  useEffect(() => {
    navigation.setOptions({ title: 'Wallet' });
  }, []);
  // This is a mock method simulating how we can add a mobile payment method
  const addPaymentMethod = (mobileNumber: string,) => {
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


  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {paymentMethods.map(method => (
          <PaymentMethodCard
            key={method.id}
            method={method}
            onSetDefault={() => setDefaultMethod(method.id)}
          />
        ))}
        <MenuSection
          title='Settings'
          items={WALLET_SETTINGS_ITEMS.settings.map(item => ({
            ...item,
            onPress: item.id === 'security'
              ? () => setSecurityPopupVisible(true)
              : () => { }
          }))}

          onPress={(route) => {
            const securityItem = WALLET_SETTINGS_ITEMS.settings.find(
              item => item.route === route && item.id === 'security'
            );

            if (securityItem) {
              setSecurityPopupVisible(true);
            } else {

            }
          }}
          styles={styles}
        />
        <BottomPopup
          visible={securityPopupVisible}
          onClose={() => setSecurityPopupVisible(false)}
          title="Security Information"
        >
          <View>
            <View style={styles.securityItem}>
              <Ionicons name="shield-checkmark" size={24} color="#e1a100" style={styles.securityIcon} />
              <View>
                <ThemedText type="defaultSemiBold">End-to-End Encryption</ThemedText>
                <ThemedText style={styles.securityText}>
                  We use the latest, cutting edge, top-notch encryption algorithms to securly store your information.
                </ThemedText>
              </View>
            </View>

            <View style={styles.securityItem}>
              <Ionicons name="lock-closed" size={24} color="#e1a100" style={styles.securityIcon} />
              <View>
                <ThemedText type="defaultSemiBold">Secure Transactions</ThemedText>
                <ThemedText style={styles.securityText}>
                  All transactions are processed through secure channels using industry standards security algorithms.
                </ThemedText>
              </View>
            </View>


          </View>
        </BottomPopup>
      </ScrollView>
    </SafeAreaView>
  );
}

const getMethodInfo = (mobileNumber: string): { vendor: string, label: string, vendorLogoSource: any } => {

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
  securityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  securityIcon: {
    marginRight: 16,
    marginTop: 2,
  },
  securityText: {
    opacity: 0.7,
    marginTop: 4,
  },
});
