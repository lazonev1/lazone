import React, { useState } from 'react';
import { Image, StyleSheet, View, SafeAreaView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/auth';
import { Button } from '@lazone/ui/';
import AppHeader from '@/components/ui/AppHeader';
import strings from '@/strings';
import EditableField from '@/components/account/EditableField';
import { ThemedText } from '@/components/ThemedText';
import CheckBox from '@/components/ui/CheckBox';
import { ButtonIcon } from '@/components/ui/ButtonIcon';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();
  const { login } = useAuth();
  const [remembermeChecked, setRemembermeChecked] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password.');
      return;
    }
    try {
      // 1. Await the login process to complete.
      await login(email, password);
      // 2. Do NOT navigate here. The root layout will handle it automatically
      //    once the `isAuthenticated` state changes.
    } catch (error: any) {
      Alert.alert('Login Failed', error.message || 'Please check your credentials and try again.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Appbar. Needs to be customized. */}
      <AppHeader />

      <View style={styles.contentContainer}>
        <Image 
          source={require('../../assets/images/loginbg.png')}
          style={styles.bglogin}
        />
        <ThemedText style={styles.title}>{strings.auth.login.title}</ThemedText>
        <ThemedText style={styles.subtitle}>{strings.auth.login.subtitle}</ThemedText>
        <EditableField
          placeholder={strings.auth.login.emailPhone}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <EditableField
          placeholder={strings.auth.login.password}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        <Button label={strings.auth.login.loginButton} onPress={handleLogin}/>
        <View style={styles.rememberPasswordRow}>
          <View style={styles.rememberme}>
            <CheckBox isChecked = {remembermeChecked} setChecked={()=>{setRemembermeChecked(!remembermeChecked)}}/>
            <ThemedText>{strings.auth.login.rememberMe}</ThemedText>
          </View>
          <ThemedText type='link' onPress={() => Alert.alert('Your password will be reset soon')}
            >{strings.auth.login.forgotPassword}</ThemedText>
        </View>
        <View style={{height: 48}}/>
        <View style={styles.noAccount}>
          <ThemedText>{strings.auth.login.noAccount}</ThemedText>
          <ThemedText type='link' onPress={() => router.replace('/(auth)/signup')}>{strings.auth.login.signUpLink}</ThemedText>
        </View>
        <View style={{height: 64}}/>
        <ButtonIcon
          icon='forward.fill'
          label={strings.auth.login.discoverText}
          onPress={() => "Coming soon"}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#171617',
  },
  contentContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },  
  subtitle: {
    fontSize: 16,
    fontWeight: 'light',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    height: 50,
    width: '100%',
    maxWidth: 350,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    marginBottom: 15,
    paddingHorizontal: 10,
  },
  bglogin: {
    height: '20%',
    width: '100%',
    resizeMode: 'contain',
    marginBottom: 20,
    borderRadius: 20,
  },
  rememberme: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'flex-start'
  },
  rememberPasswordRow: {
    alignItems: 'center',
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  noAccount: {
    alignItems: 'center',
    width: '80%',
    flexDirection: 'row',
    justifyContent: 'space-evenly'
  },
});