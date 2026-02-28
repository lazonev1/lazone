import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, ActivityIndicator, Appearance, ScrollView } from 'react-native';
import { BottomPopup } from './BottomPopup';
import EditableField from './EditableField';
import { Button } from '@lazone/ui';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/contexts/auth';

type Props = {
	visible: boolean;
	onClose: () => void;
	initialData: {
		firstName: string;
		lastName: string;
		email: string;
		phone: string;
	};
};

export default function EditInfoPopup({ visible, onClose, initialData }: Props) {
	const [firstName, setFirstName] = useState(initialData.firstName);
	const [lastName, setLastName] = useState(initialData.lastName);
	const [email, setEmail] = useState(initialData.email);
	const [phone, setPhone] = useState(initialData.phone);
	const [saving, setSaving] = useState(false);

	const { updateProfile } = useAuth();
	const colorScheme = Appearance.getColorScheme();
	const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;

	// Reset form when popup opens with fresh data
	useEffect(() => {
		if (visible) {
			setFirstName(initialData.firstName);
			setLastName(initialData.lastName);
			setEmail(initialData.email);
			setPhone(initialData.phone);
		}
	}, [visible]);

	const handleSave = () => {
		if (!firstName.trim() || !lastName.trim()) {
			Alert.alert('Missing Info', 'First name and last name are required.');
			return;
		}

		Alert.alert(
			'Confirm Changes',
			'Are you sure you want to update your information?',
			[
				{ text: 'Cancel', style: 'cancel' },
				{
					text: 'Update',
					onPress: async () => {
						setSaving(true);
						try {
							await updateProfile({
								firstName: firstName.trim(),
								lastName: lastName.trim(),
								phoneNumber: phone.trim(),
							});
							Alert.alert('Success', 'Your information has been updated.');
							onClose();
						} catch (err) {
							Alert.alert('Error', 'Could not save your info. Please try again.');
						}
						setSaving(false);
					},
				},
			]
		);
	};

	return (
		<BottomPopup visible={visible} onClose={onClose} title="Edit Information">
			<ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
					<EditableField
						label="First Name"
						value={firstName}
						onChangeText={setFirstName}
						placeholder="Enter your first name"
					/>
					<EditableField
						label="Last Name"
						value={lastName}
						onChangeText={setLastName}
						placeholder="Enter your last name"
					/>
					<EditableField
						label="Email"
						value={email}
						onChangeText={setEmail}
						keyboardType="email-address"
						placeholder="Enter your email address"
						autoCapitalize="none"
					/>
					<EditableField
						label="Phone"
						value={phone}
						onChangeText={setPhone}
						keyboardType="phone-pad"
						placeholder="Enter your phone number"
					/>

					<View style={styles.buttonContainer}>
						{saving ? (
							<ActivityIndicator size="large" color={theme.tint} />
						) : (
							<View style={styles.buttonRow}>
								<View style={styles.buttonWrapper}>
									<Button label="Cancel" onPress={onClose} variant="secondary" />
								</View>
								<View style={styles.buttonWrapper}>
									<Button label="Save" onPress={handleSave} variant="primary" />
								</View>
							</View>
						)}
					</View>
			</ScrollView>
		</BottomPopup>
	);
}

const styles = StyleSheet.create({
	buttonContainer: {
		marginTop: 8,
		marginBottom: 16,
	},
	buttonRow: {
		flexDirection: 'row',
		gap: 12,
	},
	buttonWrapper: {
		flex: 1,
	},
});
