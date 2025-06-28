import { ThemedView } from '@/components/ThemedView'
import { ThemedText } from '@/components/ThemedText'
import { Image, View, StyleSheet, Appearance } from 'react-native'
import { Button } from '@lazone/ui'
import { Colors } from '@/constants/Colors'

type PaymentMethod = {
	id: number;
	name: string;
	type: 'mobile' | 'card';
	image: any;
	isDefault?: Boolean;
	number: string;
	cardNumber: string;
}
export function PaymentMethodCard({ method }: { method: PaymentMethod }) {
	  const colorScheme = Appearance.getColorScheme();
	  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
	  const styles = createStyles(theme, colorScheme);
  return (
    <ThemedView style={styles.card}>
      <View style={styles.cardLeft}>
        <Image source={method.image} style={styles.paymentLogo} />
        <ThemedText style={styles.paymentType}>
          {method.type === 'card' ? 'Credit / Debit' : 'Mobile'}
        </ThemedText>
      </View>
      
      <View style={styles.cardMiddle}>
        <ThemedText type="defaultSemiBold">{method.name}</ThemedText>
        {method.isDefault && <ThemedText style={styles.defaultLabel}>Default</ThemedText>}
        
        <ThemedText style={styles.accountLabel}>
          {method.type === 'card' ? 'Credit' : 'Compte mobile'}
        </ThemedText>
        <ThemedText style={styles.accountNumber}>
          {method.cardNumber || method.number}
        </ThemedText>
      </View>
      
      {!method.isDefault && (
        <View style={styles.cardRight}>
          <Button 
            label="Set as Default"
            onPress={() => {}}
            variant="primary"
            size="small" 
            style={styles.defaultButton}
          />
        </View>
      )}
    </ThemedView>
  );
}

const createStyles = (theme : any, colorScheme: 'dark' | 'light' | null | undefined) => StyleSheet.create({
	card: {
		flexDirection: 'row',
		borderRadius: 14,
		padding: 15,
		marginBottom: 15,
		alignItems: 'center',
		backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : theme.background

	},
	cardLeft: {
		alignItems: 'center',
		width: 70
	},
	cardMiddle: {
		flex: 1,
		paddingHorizontal: 10
	},
	cardRight: {
		alignItems:  'flex-end',
		justifyContent: 'center'
	},
	accountNumber: {
		fontSize: 12,
		opacity: 0.8,
	},
	accountLabel: {
		fontSize: 14,
		marginTop: 5,
	},
	defaultLabel: {
		fontSize: 12,
		opacity: 0.7,
	},
	paymentType: {
		fontSize: 12,
		opacity: 0.7,
	},
	paymentLogo: {
		borderRadius: 14,
		width: 50 ,
		height: 50,
		marginBottom: 5,
		resizeMode: 'contain'
	},
	defaultButton: {
		backgroundColor: '#0A76D8',
 		paddingHorizontal: 10,
		paddingVertical: 5,
	}
})
