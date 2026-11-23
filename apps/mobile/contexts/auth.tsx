import React, { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from '../backend/main/src/config/firebase';
import { signupUser, loginUser, logoutUser, getUserProfile, updateUserProfile } from '../backend/main/src/services/authService';
import { User as AppUser } from '../backend/main/src/models/User';
import {
  cleanupPushNotificationsOnLogout,
  cancelPushNotificationSession,
  initializePushNotificationsForUser,
} from '@/services/notifications/pushNotifications';

interface AuthContextType {
  user: FirebaseUser | null;
  userProfile: AppUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  profileLoading: boolean;
  profileError: Error | null;
  signup: (fullName: string, email: string, password: string, phone: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUserProfile: () => Promise<void>;
  updateProfile: (data: { firstName?: string; lastName?: string; phoneNumber?: string }) => Promise<void>;
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
  const sessionVersionRef = useRef(0);
  const profileRequestRef = useRef(0);
  const invalidatePendingSessionWork = useCallback(() => {
    sessionVersionRef.current += 1;
    profileRequestRef.current += 1;
    cancelPushNotificationSession();
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
      if (!profile) throw new Error('Authenticated user profile was not found');
      setUserProfile(profile);
    } catch (error) {
      const profileLoadError = error instanceof Error ? error : new Error('Failed to load user profile');
      if (isCurrentRequest()) setProfileError(profileLoadError);
      if (throwOnError) throw profileLoadError;
    } finally {
      if (isCurrentRequest()) {
        setProfileLoading(false);
      }
    }
  }, []);

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
      cancelPushNotificationSession();
      setUser(firebaseUser);
      setProfileError(null);

      if (!firebaseUser) {
        setUserProfile(null);
        setProfileLoading(false);
        setLoading(false);
        return;
      }

      const userId = firebaseUser.uid;
      setUserProfile(null);
      setProfileLoading(true);

      void getUserProfile(userId)
        .then((profile) => {
          if (!mounted || sessionVersionRef.current !== sessionVersion || profileRequestRef.current !== profileRequestVersion || auth.currentUser?.uid !== userId) return;
          if (!profile) {
            setProfileError(new Error('Authenticated user profile was not found'));
            return;
          }

          setUserProfile(profile);
          initializePushNotificationsForUser(userId).catch((error) => {
            console.warn('Push notification initialization failed:', error);
          });
        })
        .catch((error) => {
          if (!mounted || sessionVersionRef.current !== sessionVersion || profileRequestRef.current !== profileRequestVersion || auth.currentUser?.uid !== userId) return;
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
  }, [invalidatePendingSessionWork]);

  const handleLogin = useCallback(async (email: string, password: string) => {
    await loginUser(email, password);
  }, []);

  const handleSignup = useCallback(async (fullName: string, email: string, password: string, phone: string) => {
    await signupUser(fullName, email, password, phone);
    await loadCurrentProfile(false);
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
  const handleUpdateProfile = useCallback(async (data: { firstName?: string; lastName?: string; phoneNumber?: string }) => {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('No authenticated user');
    await updateUserProfile(currentUser.uid, data);
    await loadCurrentProfile(true);
  }, [loadCurrentProfile]);

  const value = useMemo<AuthContextType>(() => ({
    user,
    userProfile,
    isAuthenticated: !!user,
    loading,
    profileLoading,
    profileError,
    signup: handleSignup,
    login: handleLogin,
    logout: handleLogout,
    refreshUserProfile,
    updateProfile: handleUpdateProfile,
  }), [user, userProfile, loading, profileLoading, profileError, handleLogin, handleSignup, handleLogout, refreshUserProfile, handleUpdateProfile]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
