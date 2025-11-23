'use client';

import React, { DependencyList, createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore } from 'firebase/firestore';
import { Auth, User, onAuthStateChanged } from 'firebase/auth';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener'

// Props for the FirebaseProvider component.
interface FirebaseProviderProps {
  children: ReactNode;
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
}

// Shape of the user authentication state.
interface UserAuthState {
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
}

// Shape of the data stored in the FirebaseContext.
export interface FirebaseContextState {
  areServicesAvailable: boolean;
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null;
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
}

// Shape of the return value from the useFirebase() hook.
export interface FirebaseServicesAndUser {
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
}

// Shape of the return value from the useUser() hook.
export interface UserHookResult {
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
}

// Create the React Context for Firebase.
export const FirebaseContext = createContext<FirebaseContextState | undefined>(undefined);

/**
 * The main Firebase provider component. It manages the Firebase services and
 * authentication state, making them available to all child components via context.
 * It also subscribes to auth state changes to keep the user object up-to-date.
 * @param {FirebaseProviderProps} props - The component's props.
 * @returns {JSX.Element} The rendered Firebase provider.
 */
export const FirebaseProvider: React.FC<FirebaseProviderProps> = ({
  children,
  firebaseApp,
  firestore,
  auth,
}) => {
  const [userAuthState, setUserAuthState] = useState<UserAuthState>({
    user: null,
    isUserLoading: true, // Assume loading until the first auth check completes.
    userError: null,
  });

  // Effect to subscribe to Firebase auth state changes.
  useEffect(() => {
    if (!auth) {
      setUserAuthState({ user: null, isUserLoading: false, userError: new Error("Auth service not provided.") });
      return;
    }

    setUserAuthState({ user: null, isUserLoading: true, userError: null });

    const unsubscribe = onAuthStateChanged(
      auth,
      (firebaseUser) => {
        // User is signed in or out.
        setUserAuthState({ user: firebaseUser, isUserLoading: false, userError: null });
      },
      (error) => {
        // An error occurred in the auth listener.
        console.error("FirebaseProvider: onAuthStateChanged error:", error);
        setUserAuthState({ user: null, isUserLoading: false, userError: error });
      }
    );
    // Cleanup subscription on unmount.
    return () => unsubscribe();
  }, [auth]);

  // Memoize the context value to prevent unnecessary re-renders of consumers.
  const contextValue = useMemo((): FirebaseContextState => {
    const servicesAvailable = !!(firebaseApp && firestore && auth);
    return {
      areServicesAvailable: servicesAvailable,
      firebaseApp: servicesAvailable ? firebaseApp : null,
      firestore: servicesAvailable ? firestore : null,
      auth: servicesAvailable ? auth : null,
      user: userAuthState.user,
      isUserLoading: userAuthState.isUserLoading,
      userError: userAuthState.userError,
    };
  }, [firebaseApp, firestore, auth, userAuthState]);

  return (
    <FirebaseContext.Provider value={contextValue}>
      <FirebaseErrorListener />
      {children}
    </FirebaseContext.Provider>
  );
};

/**
 * Custom hook to access all core Firebase services (app, firestore, auth) and user state.
 * Throws an error if used outside of a `FirebaseProvider` or if services are not available.
 * @returns {FirebaseServicesAndUser} An object containing the Firebase services and user state.
 */
export const useFirebase = (): FirebaseServicesAndUser => {
  const context = useContext(FirebaseContext);

  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider.');
  }

  if (!context.areServicesAvailable || !context.firebaseApp || !context.firestore || !context.auth) {
    throw new Error('Firebase core services not available. Check FirebaseProvider props.');
  }

  return {
    firebaseApp: context.firebaseApp,
    firestore: context.firestore,
    auth: context.auth,
    user: context.user,
    isUserLoading: context.isUserLoading,
    userError: context.userError,
  };
};

/**
 * Custom hook to access only the Firebase Auth instance.
 * @returns {Auth} The Firebase Auth service instance.
 */
export const useAuth = (): Auth => {
  const { auth } = useFirebase();
  return auth;
};

/**
 * Custom hook to access only the Firestore instance.
 * @returns {Firestore} The Firestore service instance.
 */
export const useFirestore = (): Firestore => {
  const { firestore } = useFirebase();
  return firestore;
};

/**
 * Custom hook to access only the Firebase App instance.
 * @returns {FirebaseApp} The Firebase App instance.
 */
export const useFirebaseApp = (): FirebaseApp => {
  const { firebaseApp } = useFirebase();
  return firebaseApp;
};

// Internal type to mark objects that have been memoized.
type MemoFirebase <T> = T & {__memo?: boolean};

/**
 * A wrapper around React's `useMemo` that adds a marker property `__memo`.
 * This is used by other hooks like `useCollection` to enforce that the query/reference
 * passed to them has been properly memoized, preventing infinite loops.
 * @template T - The type of the value being memoized.
 * @param {() => T} factory - The function that creates the value.
 * @param {DependencyList} deps - The dependency array for `useMemo`.
 * @returns {T | MemoFirebase<T>} The memoized value.
 */
export function useMemoFirebase<T>(factory: () => T, deps: DependencyList): T | (MemoFirebase<T>) {
  const memoized = useMemo(factory, deps);
  
  // Tag the object to indicate it's memoized.
  if(typeof memoized === 'object' && memoized !== null) {
    (memoized as MemoFirebase<T>).__memo = true;
  }
  
  return memoized;
}

/**
 * Custom hook specifically for accessing the authenticated user's state.
 * @returns {UserHookResult} An object containing the user object, loading status, and any auth error.
 */
export const useUser = (): UserHookResult => {
  const { user, isUserLoading, userError } = useFirebase();
  return { user, isUserLoading, userError };
};
