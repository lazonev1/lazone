import React, { createContext, useState, useContext, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';

interface AuthContextType {
  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;
  signup: (userData: SignupUserData) => Promise<SignupResponse>;
}
type User = {
  name: String;
  phoneNumber: String;
  email: String;
}
interface SignupUserData {
  email: string;
  password: string;
  [key: string]: any;
}

interface SignupResponse {
  token: string;
  user: User;
  [key: string]: any;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  // TODO: Replace with actual authentication logic with persistent state storage
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  const login = () => setIsAuthenticated(true);
  const logout = () => setIsAuthenticated(false);
  const signup = async (userData: SignupUserData): Promise<SignupResponse> => {
    try {
      
      const response: Response = await fetch('api/endpoint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });
      
      if (!response.ok) {
        const errorData: { message?: string } = await response.json();
        throw new Error(errorData.message || 'Signup failed');
      }
      
      const data: SignupResponse = await response.json();
      
      await SecureStore.setItemAsync('authToken', data.token);
      
      setIsAuthenticated(true);
      setUser(data.user);
      
      return data;
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  };
  return (
    <AuthContext.Provider value={{ 
      isAuthenticated, 
      login, 
      logout,
      signup
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}