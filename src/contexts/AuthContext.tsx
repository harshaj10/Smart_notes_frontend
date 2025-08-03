import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from 'firebase/auth';
import { auth, signInWithGoogle, logOut } from '../firebase/config';
import { authAPI } from '../services/api';

// User profile interface
export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  createdAt?: string;
}

// Auth context interface
interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  error: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (data: { displayName: string; photoURL?: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Handle Firebase auth state changes
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setCurrentUser(user);
      
      if (user) {
        try {
          // Try to get user profile from API
          console.log('Firebase user authenticated, getting user profile from database...');
          const profile = await authAPI.getProfile();
          setUserProfile(profile);
          console.log('User profile retrieved:', profile);
        } catch (err) {
          console.log('User not registered in database yet, will register during signIn');
          // User authenticated with Firebase but not registered in our database
          // This is okay, we'll register during signIn flow
        }
      } else {
        setUserProfile(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Sign in with Google and register in our database
  const signIn = async (): Promise<void> => {
    try {
      setError(null);
      console.log('Starting Google sign in process...');
      const result = await signInWithGoogle();
      
      if (result.user) {
        try {
          console.log('User authenticated with Firebase, registering in database...');
          
          // First try to get profile (user might already exist)
          try {
            const existingProfile = await authAPI.getProfile();
            console.log('User already registered, profile retrieved:', existingProfile);
            setUserProfile(existingProfile);
            return;
          } catch (err) {
            console.log('User not found in database, will register now');
          }
          
          // Register user in our database
          const userData = {
            displayName: result.user.displayName || result.user.email?.split('@')[0] || 'User',
            photoURL: result.user.photoURL || undefined
          };
          
          console.log('Sending registration data:', userData);
          
          // Register the user
          const registerResponse = await authAPI.register(userData);
          console.log('Registration response:', registerResponse);
          
          // Get full profile after registration
          const profile = await authAPI.getProfile();
          setUserProfile(profile);
          
          console.log('User registered/updated in database:', profile);
        } catch (err: any) {
          console.error('Error during user registration:', err);
          
          // Try again to get the profile, even if registration failed
          // This handles the case where the user exists but the registration call failed
          try {
            const profile = await authAPI.getProfile();
            setUserProfile(profile);
            console.log('Retrieved user profile after registration error:', profile);
          } catch (profileErr) {
            console.error('Failed to get user profile after registration error:', profileErr);
            setError('Failed to complete registration. Please try again.');
            throw err;
          }
        }
      }
    } catch (err: any) {
      console.error('Sign in error:', err);
      setError(err.message || 'Failed to sign in');
      throw err;
    }
  };

  // Sign out
  const signOut = async (): Promise<void> => {
    try {
      await logOut();
      setUserProfile(null);
    } catch (err: any) {
      setError(err.message || 'Failed to sign out');
      throw err;
    }
  };

  // Update user profile
  const updateProfile = async (data: { displayName: string; photoURL?: string }): Promise<void> => {
    try {
      await authAPI.updateProfile(data);
      const updatedProfile = await authAPI.getProfile();
      setUserProfile(updatedProfile);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
      throw err;
    }
  };

  const value = {
    currentUser,
    userProfile,
    loading,
    error,
    signIn,
    signOut,
    updateProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};