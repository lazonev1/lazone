import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from '../backend/main/src/config/firebase';
import { signupUser, loginUser, logoutUser, getUserProfile, updateUserProfile } from '../backend/main/src/services/authService';
import { User as AppUser } from '../backend/main/src/models/User';
import {
  cleanupPushNotificationsOnLogout,
  initializePushNotificationsForUser,
} from '@/services/notifications/pushNotifications';

interface AuthContextType {
  user: FirebaseUser | null;
  userProfile: AppUser | null;
  isAuthenticated: boolean;
  loading: boolean;
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

  // A function to manually refresh the profile, wrapped in useCallback for performance.
  const refreshUserProfile = useCallback(async () => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      setLoading(true);
      const profile = await getUserProfile(currentUser.uid);
      setUserProfile(profile);
      setLoading(false);
    }
  }, []);

  // This effect handles initial app load and session persistence.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // Always fetch the profile when a user is detected.
        const profile = await getUserProfile(firebaseUser.uid);
        setUserProfile(profile);

        initializePushNotificationsForUser(firebaseUser.uid).catch((error) => {
          console.warn('Push notification initialization failed:', error);
        });
      } else {
        // User is signed out, clear the profile.
        setUserProfile(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Wrapper for the login function to also set the profile state.
  const handleLogin = async (email: string, password: string) => {
    const firebaseUser = await loginUser(email, password);
    const profile = await getUserProfile(firebaseUser.uid);
    setUser(firebaseUser);
    setUserProfile(profile);
  };

  // Wrapper for the signup function to set state from the returned data.
  const handleSignup = async (fullName: string, email: string, password: string, phone: string) => {
    const { firebaseUser, profile } = await signupUser(fullName, email, password, phone);
    setUser(firebaseUser);
    setUserProfile(profile);
  };

  // Wrapper for the logout function to clear all state.
  const handleLogout = async () => {
    const currentUserId = auth.currentUser?.uid ?? user?.uid ?? null;

    try {
      await cleanupPushNotificationsOnLogout(currentUserId);
    } catch (error) {
      console.warn('Push notification logout cleanup failed:', error);
    }

    try {
      await logoutUser();
    } finally {
      setUser(null);
      setUserProfile(null);
    }
  };

  // Wrapper for updating user profile fields in Firestore.
  const handleUpdateProfile = async (data: { firstName?: string; lastName?: string; phoneNumber?: string }) => {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('No authenticated user');
    await updateUserProfile(currentUser.uid, data);
    // Refresh the local profile state after update
    const profile = await getUserProfile(currentUser.uid);
    setUserProfile(profile);
  };

  const value = {
    user,
    userProfile,
    isAuthenticated: !!user,
    loading,
    signup: handleSignup,
    login: handleLogin,
    logout: handleLogout,
    refreshUserProfile,
    updateProfile: handleUpdateProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};