import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, ActivityIndicator, Appearance, ScrollView } from 'react-native';
import { BottomPopup } from './BottomPopup';
import EditableField from './EditableField';
import { Button } from '@lazone/ui';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/contexts/auth';
import { useTranslation } from 'react-i18next';
import { ThemedText } from '@/components/ThemedText';

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
	const [phone, setPhone] = useState(initialData.phone);
	const [saving, setSaving] = useState(false);

	const { updateProfile } = useAuth();
	const { t } = useTranslation(['account', 'common']);
	const colorScheme = Appearance.getColorScheme();
	const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;

	// Reset form when popup opens with fresh data
	useEffect(() => {
		if (visible) {
			setFirstName(initialData.firstName);
			setLastName(initialData.lastName);
			setPhone(initialData.phone);
		}
	}, [visible]);

	const handleSave = () => {
		if (!firstName.trim() || !lastName.trim()) {
			Alert.alert(t('info.editPopup.missingInfoTitle'), t('info.editPopup.missingInfoMessage'));
			return;
		}

		Alert.alert(
			t('info.editPopup.confirmTitle'),
			t('info.editPopup.confirmMessage'),
			[
				{ text: t('common:actions.cancel'), style: 'cancel' },
				{
					text: t('info.editPopup.update'),
					onPress: async () => {
						setSaving(true);
						try {
							await updateProfile({
								firstName: firstName.trim(),
								lastName: lastName.trim(),
								phoneNumber: phone.trim(),
							});
							Alert.alert(t('common:alerts.success'), t('info.editPopup.successMessage'));
							onClose();
					} catch {
							Alert.alert(t('common:alerts.error'), t('info.editPopup.errorMessage'));
						}
						setSaving(false);
					},
				},
			]
		);
	};

	return (
		<BottomPopup visible={visible} onClose={onClose} title={t('info.editPopup.title')}>
			<ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
					<EditableField
						label={t('info.editPopup.firstName')}
						value={firstName}
						onChangeText={setFirstName}
						placeholder={t('info.editPopup.firstNamePlaceholder')}
					/>
					<EditableField
						label={t('info.editPopup.lastName')}
						value={lastName}
						onChangeText={setLastName}
						placeholder={t('info.editPopup.lastNamePlaceholder')}
					/>
					<View style={styles.readOnlyEmail}>
						<ThemedText style={styles.emailLabel}>{t('info.editPopup.emailReadOnlyLabel')}</ThemedText>
						<ThemedText selectable>
							{initialData.email || t('info.noEmail')}
						</ThemedText>
						<ThemedText style={styles.emailHint}>{t('info.editPopup.emailReadOnlyHint')}</ThemedText>
					</View>
					<EditableField
						label={t('info.editPopup.phone')}
						value={phone}
						onChangeText={setPhone}
						keyboardType="phone-pad"
						placeholder={t('info.editPopup.phonePlaceholder')}
					/>

					<View style={styles.buttonContainer}>
						{saving ? (
							<ActivityIndicator size="large" color={theme.tint} />
						) : (
							<View style={styles.buttonRow}>
								<View style={styles.buttonWrapper}>
									<Button label={t('common:actions.cancel')} onPress={onClose} variant="secondary" />
								</View>
								<View style={styles.buttonWrapper}>
									<Button label={t('common:actions.save')} onPress={handleSave} variant="primary" />
								</View>
							</View>
						)}
					</View>
			</ScrollView>
		</BottomPopup>
	);
}

const styles = StyleSheet.create({
	readOnlyEmail: { marginBottom: 16, gap: 6 },
	emailLabel: { fontSize: 13, fontWeight: '600' },
	emailHint: { fontSize: 13, opacity: 0.8 },
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
