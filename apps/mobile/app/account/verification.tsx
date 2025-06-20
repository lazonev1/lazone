import { StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import DocCard from '@/components/ui/DocCard';
import { Separator } from '@/components/ui/DocCard';

const DocUpload = () => {
	return (
		<SafeAreaView>
			<ScrollView>
				<DocCard
					type='id'
					title='Verification'
					description='Upload a government-issued ID for verification' />
				<DocCard
					type='certificate'
					title='Certificates'
					description='Upload a professional certificate to establish trust' />
				<DocCard
					type='reference'
					title='References'
					description='Provide references to confirm your reliability' />

			</ScrollView>
		</SafeAreaView>
	)
};

export default DocUpload;

const styles = StyleSheet.create({
	container: {
		flex: 1,
		padding: 20
	}
});
