import React, { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { AuthCredential, onAuthStateChanged, PhoneAuthCredential, User as FirebaseUser } from 'firebase/auth';
import { auth } from '../backend/main/src/config/firebase';
import {
  changePhone,
  createUserProfile,
  getUserProfile,
  linkEmailPassword,
  linkPhone,
  LoginMethod,
  loginMethods,
  loginUser,
  loginWithPhone,
  logoutUser,
  reauthenticate,
  removeLoginMethod,
  requestEmailVerification,
  signupUser,
  updateUserProfile,
} from '../backend/main/src/services/authService';
import { User as AppUser } from '../backend/main/src/models/User';
import {
  cleanupPushNotificationsOnLogout,
  cancelPushNotificationSession,
  initializePushNotificationsForUser,
} from '@/services/notifications/pushNotifications';

/** Login identities from Firebase Authentication, the only source of truth for sign-in. */
export interface LoginIdentities {
  phoneNumber: string | null;
  email: string | null;
  emailVerified: boolean;
  methods: LoginMethod[];
}

interface AuthContextType {
  user: FirebaseUser | null;
  userProfile: AppUser | null;
  identities: LoginIdentities | null;
  isAuthenticated: boolean;
  loading: boolean;
  profileLoading: boolean;
  profileError: Error | null;
  /** Signed in, but no profile exists yet: the account must be completed. */
  profileMissing: boolean;
  signup: (fullName: string, email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  loginWithPhone: (credential: PhoneAuthCredential) => Promise<void>;
  completeProfile: (firstName: string, lastName: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUserProfile: () => Promise<void>;
  refreshIdentities: () => Promise<void>;
  updateProfile: (data: { firstName?: string; lastName?: string }) => Promise<void>;
  linkPhone: (credential: PhoneAuthCredential) => Promise<void>;
  changePhone: (credential: PhoneAuthCredential) => Promise<void>;
  linkEmail: (email: string, password: string) => Promise<void>;
  reauthenticate: (credential: AuthCredential) => Promise<void>;
  removeLoginMethod: (method: LoginMethod) => Promise<void>;
  resendEmailVerification: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<Error | null>(null);
  const [profileMissing, setProfileMissing] = useState(false);
  // Linking/unlinking mutates the same Firebase user object, which neither
  // fires onAuthStateChanged nor changes React state; this forces a re-read.
  const [identityRevision, setIdentityRevision] = useState(0);
  const sessionVersionRef = useRef(0);
  const profileRequestRef = useRef(0);
  const pushSessionRef = useRef<number | null>(null);
  // Email signup creates Auth before the profile commit; the listener's early
  // read must not mistake that window for an account needing completion.
  const creatingAccountRef = useRef(false);
  const invalidatePendingSessionWork = useCallback(() => {
    sessionVersionRef.current += 1;
    profileRequestRef.current += 1;
    pushSessionRef.current = null;
    cancelPushNotificationSession();
  }, []);

  const applyProfile = useCallback((userId: string, sessionVersion: number, profile: AppUser) => {
    setUserProfile(profile);
    setProfileMissing(false);
    if (pushSessionRef.current === sessionVersion) return;
    pushSessionRef.current = sessionVersion;
    initializePushNotificationsForUser(userId).catch((error) => {
      console.warn('Push notification initialization failed:', error);
    });
  }, []);

  const loadCurrentProfile = useCallback(async (throwOnError: boolean): Promise<void> => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const userId = currentUser.uid;
    const sessionVersion = sessionVersionRef.current;
    const requestVersion = ++profileRequestRef.current;
    const isCurrentRequest = () => (
      sessionVersionRef.current === sessionVersion
      && profileRequestRef.current === requestVersion
      && auth.currentUser?.uid === userId
    );

    setProfileLoading(true);
    setProfileError(null);
    try {
      const profile = await getUserProfile(userId);
      if (!isCurrentRequest()) return;
      if (!profile) {
        setUserProfile(null);
        setProfileMissing(true);
        if (throwOnError) throw new Error('Authenticated user profile was not found');
        return;
      }
      applyProfile(userId, sessionVersion, profile);
    } catch (error) {
      const profileLoadError = error instanceof Error ? error : new Error('Failed to load user profile');
      if (isCurrentRequest() && !profileLoadError.message.includes('not found')) setProfileError(profileLoadError);
      if (throwOnError) throw profileLoadError;
    } finally {
      if (isCurrentRequest()) {
        setProfileLoading(false);
      }
    }
  }, [applyProfile]);

  const refreshUserProfile = useCallback(
    () => loadCurrentProfile(false),
    [loadCurrentProfile]
  );

  // This effect handles initial app load and session persistence.
  useEffect(() => {
    let mounted = true;
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      const sessionVersion = ++sessionVersionRef.current;
      const profileRequestVersion = ++profileRequestRef.current;
      pushSessionRef.current = null;
      cancelPushNotificationSession();
      setUser(firebaseUser);
      setProfileError(null);
      setProfileMissing(false);

      if (!firebaseUser) {
        setUserProfile(null);
        setProfileLoading(false);
        setLoading(false);
        return;
      }

      const userId = firebaseUser.uid;
      setUserProfile(null);
      setProfileLoading(true);

      const isCurrent = () => mounted
        && sessionVersionRef.current === sessionVersion
        && profileRequestRef.current === profileRequestVersion
        && auth.currentUser?.uid === userId;

      void getUserProfile(userId)
        .then((profile) => {
          if (!isCurrent()) return;
          if (profile) applyProfile(userId, sessionVersion, profile);
          else if (!creatingAccountRef.current) setProfileMissing(true);
        })
        .catch((error) => {
          if (!isCurrent()) return;
          setProfileError(error instanceof Error ? error : new Error('Failed to load user profile'));
        })
        .finally(() => {
          if (!mounted || sessionVersionRef.current !== sessionVersion || profileRequestRef.current !== profileRequestVersion) return;
          setProfileLoading(false);
          setLoading(false);
        });
    });

    return () => {
      mounted = false;
      invalidatePendingSessionWork();
      unsubscribe();
    };
  }, [applyProfile, invalidatePendingSessionWork]);

  const handleLogin = useCallback(async (email: string, password: string) => {
    await loginUser(email, password);
  }, []);

  const handleLoginWithPhone = useCallback(async (credential: PhoneAuthCredential) => {
    // The auth listener loads the profile, or reports it missing for a new number.
    await loginWithPhone(credential);
  }, []);

  const handleSignup = useCallback(async (fullName: string, email: string, password: string) => {
    creatingAccountRef.current = true;
    try {
      await signupUser(fullName, email, password);
      // Starting this load invalidates the listener's earlier read.
      await loadCurrentProfile(false);
    } finally {
      creatingAccountRef.current = false;
    }
  }, [loadCurrentProfile]);

  const handleCompleteProfile = useCallback(async (firstName: string, lastName: string) => {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('No authenticated user');
    // Returns false when another device completed it first; either way, load it.
    await createUserProfile(currentUser.uid, firstName, lastName);
    await loadCurrentProfile(true);
  }, [loadCurrentProfile]);

  const handleLogout = useCallback(async () => {
    const currentUserId = auth.currentUser?.uid ?? null;

    try {
      await cleanupPushNotificationsOnLogout(currentUserId);
    } catch (error) {
      console.warn('Push notification logout cleanup failed:', error);
    }

    try {
      await logoutUser();
    } catch (error) {
      if (currentUserId && auth.currentUser?.uid === currentUserId) {
        initializePushNotificationsForUser(currentUserId).catch((notificationError) => {
          console.warn('Failed to restore push notifications after sign-out failure:', notificationError);
        });
      }
      throw error;
    }
  }, []);

  // Wrapper for updating user profile fields in Firestore.
  const handleUpdateProfile = useCallback(async (data: { firstName?: string; lastName?: string }) => {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('No authenticated user');
    await updateUserProfile(currentUser.uid, data);
    await loadCurrentProfile(true);
  }, [loadCurrentProfile]);

  // Runs an identity change, then re-reads the (mutated) Firebase user.
  const withIdentityRefresh = useCallback(async (operation: () => Promise<unknown>): Promise<void> => {
    try {
      await operation();
    } finally {
      setIdentityRevision((revision) => revision + 1);
    }
  }, []);

  const refreshIdentities = useCallback(async () => {
    const currentUser = auth.currentUser;
    if (currentUser) await withIdentityRefresh(() => currentUser.reload());
  }, [withIdentityRefresh]);

  const handleLinkPhone = useCallback(
    (credential: PhoneAuthCredential) => withIdentityRefresh(() => linkPhone(credential)),
    [withIdentityRefresh]
  );
  const handleChangePhone = useCallback(
    (credential: PhoneAuthCredential) => withIdentityRefresh(() => changePhone(credential)),
    [withIdentityRefresh]
  );
  const handleLinkEmail = useCallback(
    (email: string, password: string) => withIdentityRefresh(() => linkEmailPassword(email, password)),
    [withIdentityRefresh]
  );
  const handleRemoveLoginMethod = useCallback(
    (method: LoginMethod) => withIdentityRefresh(() => removeLoginMethod(method)),
    [withIdentityRefresh]
  );
  const handleResendEmailVerification = useCallback(() => requestEmailVerification(), []);

  const identities = useMemo<LoginIdentities | null>(() => {
    if (!user) return null;
    const methods = loginMethods(user);
    return {
      phoneNumber: methods.includes('phone') ? user.phoneNumber : null,
      email: methods.includes('password') ? user.email : null,
      emailVerified: user.emailVerified,
      methods,
    };
    // identityRevision is the signal that the mutable `user` object changed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, identityRevision]);

  const value = useMemo<AuthContextType>(() => ({
    user,
    userProfile,
    identities,
    isAuthenticated: !!user,
    loading,
    profileLoading,
    profileError,
    profileMissing,
    signup: handleSignup,
    login: handleLogin,
    loginWithPhone: handleLoginWithPhone,
    completeProfile: handleCompleteProfile,
    logout: handleLogout,
    refreshUserProfile,
    refreshIdentities,
    updateProfile: handleUpdateProfile,
    linkPhone: handleLinkPhone,
    changePhone: handleChangePhone,
    linkEmail: handleLinkEmail,
    reauthenticate,
    removeLoginMethod: handleRemoveLoginMethod,
    resendEmailVerification: handleResendEmailVerification,
  }), [
    user, userProfile, identities, loading, profileLoading, profileError, profileMissing,
    handleSignup, handleLogin, handleLoginWithPhone, handleCompleteProfile, handleLogout,
    refreshUserProfile, refreshIdentities, handleUpdateProfile, handleLinkPhone, handleChangePhone,
    handleLinkEmail, handleRemoveLoginMethod, handleResendEmailVerification,
  ]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
