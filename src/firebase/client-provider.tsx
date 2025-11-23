'use client';

import React, { useMemo, type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

/**
 * A client-side component that ensures Firebase is initialized only once
 * and provides the necessary Firebase services (app, auth, firestore)
 * to its children through the `FirebaseProvider`.
 * @param {FirebaseClientProviderProps} props - The component's props.
 * @returns {JSX.Element} The rendered Firebase provider with initialized services.
 */
export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  // useMemo ensures that Firebase is initialized only once per component lifecycle.
  const firebaseServices = useMemo(() => {
    return initializeFirebase();
  }, []);

  return (
    <FirebaseProvider
      firebaseApp={firebaseServices.firebaseApp}
      auth={firebaseServices.auth}
      firestore={firebaseServices.firestore}
    >
      {children}
    </FirebaseProvider>
  );
}
