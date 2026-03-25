import { View, StyleSheet, Alert, Pressable, ScrollView, Appearance } from 'react-native';
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth';
import { Button } from '@lazone/ui';
import ProfileAvatar from '../../components/account/ProfileAvatar';
import EditInfoPopup from '../../components/account/EditInfoPopup';
import { Colors } from '@/constants/Colors';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useNavigation } from '@react-navigation/native';
import { router } from 'expo-router';

export default function AccountInfoScreen() {
	const { user, userProfile, logout } = useAuth();
	const [editPopupVisible, setEditPopupVisible] = useState(false);
	const navigation = useNavigation();

	const colorScheme = Appearance.getColorScheme();
	const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
	const styles = createStyles(theme, colorScheme);

	const firstName = userProfile?.firstName ?? '';
	const lastName = userProfile?.lastName ?? '';
	const fullName = [firstName, lastName].filter(Boolean).join(' ');
	const email = user?.email ?? '';
	const phone = userProfile?.phoneNumber ?? '';
	const avatar = userProfile?.avatar ?? null;

	useEffect(() => {
		navigation.setOptions({ title: 'Account Info' });
	}, []);

	if (!user) { return null; }

	const editData = { firstName, lastName, email, phone };

	return (
		<ScrollView contentContainerStyle={styles.container}>
			<ProfileAvatar uri={avatar} onChange={() => setEditPopupVisible(true)} />

			<View style={styles.infoSection}>
				<InfoRow label="Name" value={fullName} placeholder="No name provided" theme={theme} />
				<View style={styles.divider} />
				<InfoRow label="Email" value={email} placeholder="No email on file" theme={theme} />
				<View style={styles.divider} />
				<InfoRow label="Phone" value={phone} placeholder="No phone number on file" theme={theme} />
			</View>

			<View style={styles.buttonContainer}>
				<Button
					label="Edit Information"
					onPress={() => setEditPopupVisible(true)}
					variant="primary"
				/>
			</View>

			<ThemedText type="subtitle" style={styles.sectionTitle}>Account Management</ThemedText>

			<ThemedView style={styles.managementSection}>
				<Pressable
					style={styles.row}
					onPress={() => Alert.alert('TODO', 'Handle deactivate')}
				>
					<ThemedText>Deactivate and deletion</ThemedText>
					<ThemedText style={styles.arrow}>›</ThemedText>
				</Pressable>

				<View style={styles.divider} />

				<Pressable
					style={styles.row}
					onPress={() => Alert.alert('TODO', 'Handle change password')}
				>
					<ThemedText>Change Password</ThemedText>
					<ThemedText style={styles.arrow}>›</ThemedText>
				</Pressable>
			</ThemedView>

			<Pressable
				style={styles.logout}
				onPress={() => {
					Alert.alert(
						'Logout',
						'Are you sure you want to logout?',
						[
							{ text: 'Cancel', style: 'cancel' },
							{ text: 'Logout', style: 'destructive', onPress: () => {
								logout();
								router.replace("/(tabs)");
							} },
						]
					);
				}}
			>
				<ThemedText style={styles.logoutText}>⎋ Logout</ThemedText>
			</Pressable>

			<EditInfoPopup
				visible={editPopupVisible}
				onClose={() => setEditPopupVisible(false)}
				initialData={editData}
			/>
		</ScrollView>
	);
}

function InfoRow({ label, value, placeholder, theme }: { label: string; value: string; placeholder: string; theme: any }) {
	const hasValue = value.trim().length > 0;
	return (
		<View style={infoRowStyles.container}>
			<ThemedText style={infoRowStyles.label}>{label}</ThemedText>
			<ThemedText style={[infoRowStyles.value, !hasValue && { color: '#999', fontStyle: 'italic' }]}>
				{hasValue ? value : placeholder}
			</ThemedText>
		</View>
	);
}

const infoRowStyles = StyleSheet.create({
	container: {
		paddingVertical: 14,
		paddingHorizontal: 16,
	},
	label: {
		fontSize: 13,
		color: '#888',
		marginBottom: 4,
		textTransform: 'uppercase',
		letterSpacing: 0.5,
	},
	value: {
		fontSize: 16,
	},
});

function createStyles(theme: typeof Colors.light, colorScheme: 'light' | 'dark' | null | undefined) {
	return StyleSheet.create({
		container: {
			padding: 24,
		},
		infoSection: {
			borderRadius: 12,
			backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : theme.background,
			borderColor: colorScheme === 'dark' ? '#333' : '#ccc',
			borderWidth: 1,
			overflow: 'hidden',
			marginBottom: 8,
		},
		buttonContainer: {
			marginTop: 16,
			marginBottom: 32,
		},
		sectionTitle: {
			fontSize: 18,
			fontWeight: '600',
			marginBottom: 16,
			marginTop: 24,
		},
		managementSection: {
			borderRadius: 12,
			backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : theme.background,
			borderColor: colorScheme === 'dark' ? '#333' : '#ccc',
			borderWidth: 1,
			overflow: 'hidden',
		},
		row: {
			flexDirection: 'row',
			justifyContent: 'space-between',
			alignItems: 'center',
			padding: 16,
		},
		divider: {
			height: 1,
			backgroundColor: colorScheme === 'dark' ? '#333' : '#ccc',
		},
		arrow: {
			fontSize: 20,
		},
		logout: {
			marginTop: 32,
			marginBottom: 16,
			alignItems: 'center',
			padding: 16,
		},
		logoutText: {
			fontSize: 16,
			color: '#FF3B30',
		},
		center: {
			flex: 1,
			justifyContent: 'center',
			alignItems: 'center',
			backgroundColor: theme.background,
		},
	});
}
