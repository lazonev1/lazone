import { ThemedView } from '@/components/ThemedView'
import { ThemedText } from '@/components/ThemedText';
import { Button } from '@lazone/ui'
import { StyleSheet, Alert } from 'react-native'
import { useTranslation } from 'react-i18next'

type DocType = {
	type: 'certificate' | 'reference' | 'id'
	title: string;
	description: string;
}

const DocCard = ({ type, title, description }: DocType) => {
	const { t } = useTranslation('common');
	return <ThemedView style={styles.card}>
		<ThemedText style={styles.title}>
			{title}
		</ThemedText>

		<ThemedText style={styles.desc}>
			{description}
		</ThemedText>
		<Button label={t('actions.submit')} onPress={() => { Alert.alert("Bonjour") }}></Button>
	</ThemedView>


}
export const Separator = () => {
	return (
		<ThemedView style={styles.separator} />
	)
}
const styles = StyleSheet.create({
	card: {
		borderRadius: '14',
		padding: 15,
		marginBottom: 15,
		alignItems: 'center'
	},
	title: {
		fontSize: 24,
		padding: 4,
	},
	desc: {
		fontSize: 14,
		padding: 4,
	},
	separator: {
		width: '50%',
		height: 16,
		backgroundColor: '#332'
	}
})

export default DocCard;
