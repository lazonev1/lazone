import { ThemedView } from '@/components/ThemedView'
import { ThemedText } from '@/components/ThemedText'
import { Image, View, StyleSheet, Appearance, ImageSourcePropType } from 'react-native'
import { Button } from '@lazone/ui'
import { Colors } from '@/constants/Colors'

type PaymentMethod = {
	id: number;
	label: string;
	vendorLogoSource: string;
	isDefault?: Boolean;
	mobileNumber: string;
}
type Props = {
	method: PaymentMethod,
	onSetDefault: () => void
}
export function PaymentMethodCard({ method, onSetDefault }: Props) {
	  const colorScheme = Appearance.getColorScheme();
	  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
	  const styles = createStyles(theme, colorScheme);
  return (
    <ThemedView style={styles.card}>
      <View style={styles.cardLeft}>
        <Image source={method.vendorLogoSource as ImageSourcePropType} style={styles.paymentLogo} />
        <ThemedText style={styles.paymentType}>
          {'Mobile'}
        </ThemedText>
      </View>
      
      <View style={styles.cardMiddle}>
        <ThemedText type="defaultSemiBold">{method.label}</ThemedText>
        
        <ThemedText style={styles.accountNumber}>
          {method.mobileNumber}
        </ThemedText>
      </View>
      
        <View style={styles.cardRight}>
			{method.isDefault ? 
			<ThemedText style={styles.defaultLabel}>Default</ThemedText> : 
          <Button 
            label="Set as Default"
            onPress={onSetDefault}
            variant="primary"
            size="small" 
            style={styles.defaultButton}
          /> 
		}
        </View>
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
 		paddingHorizontal: 10,
		borderRadius: 9,
		borderColor: '#0A76D8',
		borderWidth: 1
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
