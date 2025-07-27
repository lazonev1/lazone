import React, { useState } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { getAuth } from '@react-native-firebase/auth';

export default function FirebaseTest() {
  const [status, setStatus] = useState('Not tested');

  const testFirebase = async () => {
    try {
      setStatus('Testing connection...');
      console.log('Testing Firebase connection...');
      // Use getAuth() instead of auth()
      const auth = getAuth();
      const currentUser = auth.currentUser;
      setStatus(`Connected successfully! User: ${currentUser ? 'Signed in' : 'Not signed in'}`);
      console.log('Firebase connection test completed.');
    } catch (error) {
      setStatus(`Error: ${error.message}`);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Firebase Connection Test</Text>
      <Text style={styles.status}>Status: {status}</Text>
      <Button title="Test Firebase Connection" onPress={testFirebase} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    marginVertical: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  status: {
    marginBottom: 15,
  },
});