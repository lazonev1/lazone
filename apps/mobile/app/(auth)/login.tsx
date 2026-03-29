import React, { useState, useCallback } from 'react';
import {
  Image,
  StyleSheet,
  View,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import Animated, {
  FadeInDown,
  FadeOutUp,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/auth';
import strings from '@/strings';
import EditableField from '@/components/account/EditableField';
import { ThemedText } from '@/components/ThemedText';
import CheckBox from '@/components/ui/CheckBox';
import Ionicons from '@expo/vector-icons/Ionicons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TAB_WIDTH = (SCREEN_WIDTH - 48 - 8) / 2;

type AuthMode = 'login' | 'signup';

export default function LoginScreen() {
  // ── Shared state ──
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { login, signup } = useAuth();

  // ── Signup-only state ──
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [termsAgreed, setTermsAgreed] = useState(false);

  // ── Login-only state ──
  const [rememberMe, setRememberMe] = useState(false);

  // ── Animated pill indicator ──
  const tabOffset = useSharedValue(0);

  const animatedIndicator = useAnimatedStyle(() => ({
    transform: [{ translateX: tabOffset.value }],
  }));

  const switchMode = useCallback((newMode: AuthMode) => {
    setMode(newMode);
    tabOffset.value = withSpring(newMode === 'login' ? 0 : TAB_WIDTH, {
      damping: 18,
      stiffness: 200,
    });
  }, [tabOffset]);

  // ── Handlers ──
  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password.');
      return;
    }
    setIsLoading(true);
    try {
      await login(email, password);
    } catch (error: any) {
      Alert.alert('Login Failed', error.message || 'Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async () => {
    if (!termsAgreed) {
      Alert.alert('Agreement Required', 'Please agree to the Terms and Privacy Policy.');
      return;
    }
    if (!fullName || !email || !password) {
      Alert.alert('Missing Information', 'Please fill out all required fields.');
      return;
    }
    setIsLoading(true);
    try {
      await signup(fullName, email, password, phone);
    } catch (error: any) {
      Alert.alert('Signup Failed', error.message || 'Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Derived values ──
  const isLogin = mode === 'login';
  const title = isLogin ? strings.auth.login.title : strings.auth.signup.title;
  const subtitle = isLogin ? strings.auth.login.subtitle : strings.auth.signup.subtitle;

  return (
    <View style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Logo ── */}
          <View style={styles.logoContainer}>
            <Image
              source={require('../../assets/images/lazone-logo.png')}
              style={styles.logo}
            />
          </View>

          {/* ── Pill Toggle ── */}
          <View style={styles.toggleContainer}>
            <Animated.View style={[styles.toggleIndicator, animatedIndicator]} />
            <TouchableOpacity
              style={styles.toggleTab}
              onPress={() => switchMode('login')}
              activeOpacity={0.7}
            >
              <ThemedText
                style={[
                  styles.toggleLabel,
                  isLogin && styles.toggleLabelActive,
                ]}
              >
                {strings.auth.login.tabLogin}
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.toggleTab}
              onPress={() => switchMode('signup')}
              activeOpacity={0.7}
            >
              <ThemedText
                style={[
                  styles.toggleLabel,
                  !isLogin && styles.toggleLabelActive,
                ]}
              >
                {strings.auth.login.tabSignup}
              </ThemedText>
            </TouchableOpacity>
          </View>

          {/* ── Title & Subtitle ── */}
          <Animated.View
            key={mode + '-header'}
            entering={FadeInDown.duration(300).delay(50)}
            exiting={FadeOutUp.duration(200)}
            style={styles.headerZone}
          >
            <ThemedText style={styles.title}>{title}</ThemedText>
            <ThemedText style={styles.subtitle}>{subtitle}</ThemedText>
          </Animated.View>

          {/* ── Form ── */}
          <Animated.View
            layout={LinearTransition.springify().damping(18)}
            style={styles.formZone}
          >
            {/* Signup-only: Full Name */}
            {!isLogin && (
              <Animated.View
                entering={FadeInDown.duration(250).delay(50)}
                exiting={FadeOutUp.duration(200)}
              >
                <EditableField
                  placeholder={strings.auth.signup.fullName}
                  value={fullName}
                  onChangeText={setFullName}
                  autoCapitalize="words"
                  returnKeyType="next"
                />
              </Animated.View>
            )}

            {/* Email */}
            <EditableField
              placeholder={
                isLogin
                  ? strings.auth.login.emailPhone
                  : strings.auth.signup.emailAddress
              }
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              returnKeyType="next"
            />

            {/* Signup-only: Phone */}
            {!isLogin && (
              <Animated.View
                entering={FadeInDown.duration(250).delay(100)}
                exiting={FadeOutUp.duration(200)}
              >
                <EditableField
                  placeholder={strings.auth.signup.phoneNumber}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
              </Animated.View>
            )}

            {/* Password with eye toggle */}
            <View style={styles.passwordContainer}>
              <EditableField
                placeholder={strings.auth.login.password}
                secureTextEntry={!isPasswordVisible}
                value={password}
                onChangeText={setPassword}
                returnKeyType="done"
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setIsPasswordVisible((v) => !v)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons
                  name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'}
                  size={22}
                  color="#888"
                />
              </TouchableOpacity>
            </View>

            {/* Login-only: Remember me / Forgot password */}
            {isLogin && (
              <Animated.View
                entering={FadeInDown.duration(250)}
                exiting={FadeOutUp.duration(200)}
                style={styles.optionsRow}
              >
                <TouchableOpacity
                  style={styles.rememberMe}
                  onPress={() => setRememberMe((v) => !v)}
                  activeOpacity={0.7}
                >
                  <CheckBox
                    isChecked={rememberMe}
                    setChecked={() => setRememberMe((v) => !v)}
                  />
                  <ThemedText style={styles.smallText}>
                    {strings.auth.login.rememberMe}
                  </ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() =>
                    Alert.alert('Reset Password', 'A reset link will be sent to your email.')
                  }
                  activeOpacity={0.7}
                >
                  <ThemedText style={styles.forgotText}>
                    {strings.auth.login.forgotPassword}
                  </ThemedText>
                </TouchableOpacity>
              </Animated.View>
            )}

            {/* Signup-only: Terms agreement */}
            {!isLogin && (
              <Animated.View
                entering={FadeInDown.duration(250).delay(150)}
                exiting={FadeOutUp.duration(200)}
                style={styles.termsRow}
              >
                <CheckBox
                  isChecked={termsAgreed}
                  setChecked={() => setTermsAgreed((v) => !v)}
                />
                <ThemedText style={styles.termsText}>
                  {strings.auth.signup.agreement}
                </ThemedText>
              </Animated.View>
            )}

            {/* Primary CTA */}
            <TouchableOpacity
              style={[styles.primaryButton, isLoading && styles.primaryButtonDisabled]}
              onPress={isLogin ? handleLogin : handleSignup}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              {isLoading ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator color="#fff" size="small" />
                  <ThemedText style={styles.primaryButtonText}>
                    {isLogin
                      ? strings.auth.login.loggingIn
                      : strings.auth.signup.signingUp}
                  </ThemedText>
                </View>
              ) : (
                <ThemedText style={styles.primaryButtonText}>
                  {isLogin
                    ? strings.auth.login.loginButton
                    : strings.auth.signup.signUpButton}
                </ThemedText>
              )}
            </TouchableOpacity>
          </Animated.View>

          {/* ── Bottom Zone ── */}
          <View style={styles.bottomZone}>
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <ThemedText style={styles.dividerText}>or</ThemedText>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={styles.ghostButton}
              onPress={() => router.replace('/(tabs)')}
              activeOpacity={0.7}
            >
              <Ionicons name="compass-outline" size={20} color="#fcbd02" />
              <ThemedText style={styles.ghostButtonText}>
                {strings.auth.login.browseFirst}
              </ThemedText>
            </TouchableOpacity>

            <ThemedText style={styles.motto}>
              {strings.branding.motto}
            </ThemedText>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: {
    flex: 1,
    backgroundColor: '#151718',
    paddingTop: Platform.OS === 'ios' ? 56 : 32,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },

  /* Logo */
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logo: {
    height: 40,
    width: 160,
    resizeMode: 'contain',
  },

  /* Pill Toggle */
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#1e1f20',
    borderRadius: 14,
    padding: 4,
    marginBottom: 28,
    position: 'relative',
    overflow: 'hidden',
  },
  toggleIndicator: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: TAB_WIDTH,
    height: '100%',
    backgroundColor: '#0A58A5',
    borderRadius: 11,
  },
  toggleTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    zIndex: 1,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#888',
  },
  toggleLabelActive: {
    color: '#fff',
  },

  /* Header */
  headerZone: {
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#ECEDEE',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: '#aaa',
  },

  /* Form */
  formZone: {
    width: '100%',
  },
  passwordContainer: {
    position: 'relative',
    justifyContent: 'center',
  },
  eyeButton: {
    position: 'absolute',
    right: 14,
    top: 14,
  },
  optionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  rememberMe: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  smallText: {
    fontSize: 13,
    color: '#aaa',
  },
  forgotText: {
    fontSize: 13,
    color: '#fcbd02',
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  termsText: {
    fontSize: 13,
    color: '#aaa',
    flexShrink: 1,
  },

  /* Primary CTA */
  primaryButton: {
    width: '100%',
    backgroundColor: '#0A58A5',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  /* Bottom */
  bottomZone: {
    marginTop: 'auto',
    alignItems: 'center',
    paddingTop: 32,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#2a2b2c',
  },
  dividerText: {
    marginHorizontal: 14,
    fontSize: 13,
    color: '#555',
  },
  ghostButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    borderWidth: 1.5,
    borderColor: '#fcbd02',
    borderRadius: 14,
    paddingVertical: 14,
  },
  ghostButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fcbd02',
  },
  motto: {
    textAlign: 'center',
    fontSize: 12,
    color: '#555',
    marginTop: 20,
    fontStyle: 'italic',
    letterSpacing: 0.3,
  },
});

