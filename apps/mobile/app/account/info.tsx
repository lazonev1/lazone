import { View, Text, StyleSheet, Alert, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/auth';
import { Button } from '@lazone/ui';
import EditableField from '../../components/account/EditableField';
import ProfileAvatar from '../../components/account/ProfileAvatar';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'user-info';

export default function AccountInfoScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { logout } = useAuth()
  const router = useRouter()

  //Load user data from local storage or API later
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
        <ActivityIndicator size="large" color="#FF9900" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.sectionTitle}>Account Info</Text>

      <ProfileAvatar uri={avatar} onChange={setAvatar} />

      <EditableField value={name} onChangeText={setName} />
      <EditableField value={email} onChangeText={setEmail} keyboardType="email-address" />
      <EditableField value={phone} onChangeText={setPhone} keyboardType="phone-pad" />

      <View style={{ marginBottom: 32 }}>
        {saving ? (
          <ActivityIndicator size="large" color="#FF9900" />
        ) : (
          <Button label="Save Changes" onPress={handleSave} />
        )}
      </View>

      <Text style={styles.sectionTitle}>Account Management</Text>

      <Pressable style={styles.row} onPress={() => Alert.alert('TODO', 'Handle deactivate')}>
        <Text style={styles.rowText}>Deactivate and deletion</Text>
        <Text style={styles.arrow}>{'›'}</Text>
      </Pressable>

      <Pressable style={styles.row} onPress={() => Alert.alert('TODO', 'Handle change password')}>
        <Text style={styles.rowText}>Change Password</Text>
        <Text style={styles.arrow}>{'›'}</Text>
      </Pressable>

      <Pressable style={styles.row} 
        onPress={() => {
          router.push('./wallet');
            }
        }>
        <Text style={styles.logoutText}>Wallet</Text>
      </Pressable>
      <Pressable style={styles.logout} 
        onPress={() => {
          logout();
          router.replace('/(auth)/login');
            }
        }>
        <Text style={styles.logoutIcon}>⎋</Text>
        <Text style={styles.logoutText}>Logout</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    backgroundColor: '#000',
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    marginTop: 24,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#444',
  },
  rowText: {
    color: '#fff',
    fontSize: 16,
  },
  arrow: {
    color: '#fff',
    fontSize: 20,
  },
  logout: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 32,
  },
  logoutIcon: {
    fontSize: 20,
    marginRight: 8,
    color: '#fff',
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
