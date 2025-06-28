import { View, StyleSheet, Alert, Pressable, ActivityIndicator, ScrollView, Appearance } from 'react-native';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/auth';
import { Button } from '@lazone/ui';
import EditableField from '../../components/account/EditableField';
import ProfileAvatar from '../../components/account/ProfileAvatar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '@/constants/Colors';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useNavigation } from '@react-navigation/native';

const STORAGE_KEY = 'user-info';

export default function AccountInfoScreen() {
	const [name, setName] = useState('');
	const [email, setEmail] = useState('');
	const [phone, setPhone] = useState('');
	const [avatar, setAvatar] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const { logout } = useAuth();
	const router = useRouter();
	const colorScheme = Appearance.getColorScheme();
	const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
	const styles = createStyles(theme, colorScheme);
	const navigation = useNavigation();

	useEffect(() => {
		(async () => {
			setLoading(true);
			try {
				const data = await AsyncStorage.getItem(STORAGE_KEY);
				if (data) {
					const parsed = JSON.parse(data);
					setName(parsed.name);
					setEmail(parsed.email);
					setPhone(parsed.phone);
					setAvatar(parsed.avatar);
				}
			} catch (err) {
				Alert.alert('Error', 'Could not load user data');
			}
			setLoading(false);
		})();
		navigation.setOptions({ title: 'Account Info' });
	}, []);

	// Save to local storage (Todo: replace with API)
	const handleSave = async () => {
		setSaving(true);
		const payload = { name, email, phone, avatar };

		try {
			//TODO:Replace this with API later
			await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
			Alert.alert('Success', 'Your changes have been saved!');
		} catch (err) {
			Alert.alert('Error', 'Could not save your info');
		}

		setSaving(false);
	};

	if (loading) {
		return (
			<View style={styles.center}>
				<ActivityIndicator size="large" color={theme.tint} />
			</View>
		);
	}

	return (
		<ScrollView contentContainerStyle={styles.container}>
			<ProfileAvatar uri={avatar} onChange={setAvatar} />
			<EditableField value={name} onChangeText={setName} />
			<EditableField value={email} onChangeText={setEmail} keyboardType="email-address" />
			<EditableField value={phone} onChangeText={setPhone} keyboardType="phone-pad" />

			<View style={styles.buttonContainer}>
				{saving ? (
					<ActivityIndicator size="large" color={theme.tint} />
				) : (
					<Button
						label="Save Changes"
						onPress={handleSave}
						variant="primary"
					/>
				)}
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
					logout();
					router.replace('/(auth)/login');
				}}
			>
				<ThemedText style={styles.logoutText}>⎋ Logout</ThemedText>
			</Pressable>
		</ScrollView>
	);
}

function createStyles(theme, colorScheme) {
	return StyleSheet.create({
		container: {
			padding: 24,
		},
		buttonContainer: {
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
