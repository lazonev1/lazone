import React, { useState } from 'react';
import { Image, StyleSheet, View, SafeAreaView, Alert, Appearance } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/auth';
import { Button } from '@lazone/ui/';
import AppHeader from '@/components/ui/AppHeader';
import strings from '@/strings';
import EditableField from '@/components/account/EditableField';
import { ThemedText } from '@/components/ThemedText';
import CheckBox from '@/components/ui/CheckBox';
import { ButtonIcon } from '@/components/ui/ButtonIcon';
import { Colors } from '@/constants/Colors';

export default function SignupScreen() {
  const colorScheme = Appearance.getColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const styles = createStyles(theme);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [termsAgreed, setTermsAgreed] = useState(false);
  const router = useRouter();
  const { signup } = useAuth();

  const handleSignup = async () => {
    if (!termsAgreed) {
      Alert.alert('Agreement Required', 'Please agree to the Terms and Privacy Policy');
      return;
    }
    
        try {
        const userData = {
        fullName,
        email,
        phoneNumber: phone,
        password
      };

    // Call signup from auth context
    // await signup(userData);
    router.replace('/(tabs)');
  }catch (error: any) {
    Alert.alert('Signup Failed', error.message || 'Please try again later');
  }
}

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader />
      <View style={styles.contentContainer}>
        <View style={{paddingBottom: 20}}>
          <ButtonIcon
            icon="arrow.uturn.forward.square"
            label={strings.auth.signup.asProvider}
            onPress={() => Alert.alert('You are now a provider')}
          />
        </View>
        <View style={{width:'75%'}}>
          <EditableField
          placeholder={strings.auth.signup.fullName}
          value={fullName}
          onChangeText={setFullName}
        />
        <EditableField
          placeholder={strings.auth.signup.emailAddress}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
        />
        <EditableField
          placeholder={strings.auth.signup.phoneNumber}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />
        <EditableField
          placeholder={strings.auth.signup.password}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        </View>
        
        <View style={styles.termsRow}>
          <CheckBox 
            isChecked={termsAgreed} 
            setChecked={() => setTermsAgreed(!termsAgreed)}
          />
          <ThemedText type='link' onPress={()=>{Alert.alert('Press longer:)')}} 
                  onLongPress={() => {Alert.alert('You waisted 2s of your life :(')}}>{strings.auth.signup.agreement}</ThemedText>
        </View>
        <Button label={strings.auth.signup.signUpButton} onPress={handleSignup}/>
        
        <View style={styles.accountRow}>
          <ThemedText>{strings.auth.signup.haveAccount}</ThemedText>
          <ThemedText 
            type='link'
            onPress={() => router.replace('/(auth)/login')}
            >
            {strings.auth.signup.loginLink}</ThemedText>
        </View>
        <View style={{height: 40}}/>
        
        <ButtonIcon
          icon="forward.fill"
          label={strings.auth.signup.exploreFirst}
          onPress={() => Alert.alert('Coming soon')}
        />
      </View>
    </SafeAreaView>
  );
}

function createStyles(theme: typeof Colors.light) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.background,
    },
    contentContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'flex-start',
      paddingHorizontal: 20,
      paddingTop: 20,
    },
    providerText: {
      color: '#fcbd02',
      fontSize: 14,
      fontWeight: 'bold',
      marginVertical: 20,
      textAlign: 'center',
    },
    accountRow: {
      alignItems: 'center',
      width: '80%',
      flexDirection: 'row',
      justifyContent: 'center',
      marginTop: 20,
      gap: 8,
    },
    termsRow: {
      alignItems: 'center',
      width: '75%',
      flexDirection: 'row',
      justifyContent: 'center',
      marginTop: 20,
    },
  });
}
