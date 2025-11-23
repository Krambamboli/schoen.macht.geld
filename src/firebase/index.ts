'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore'

/**
 * Initializes and returns the Firebase app and SDK services.
 * It ensures that Firebase is initialized only once (singleton pattern).
 * Firebase App Hosting automatically provides environment variables for initialization.
 * If that fails, it falls back to the local `firebaseConfig` object.
 * @returns {{firebaseApp: FirebaseApp, auth: Auth, firestore: Firestore}} An object containing the initialized Firebase services.
 */
export function initializeFirebase() {
  if (!getApps().length) {
    let firebaseApp;
    try {
      // Firebase App Hosting integrates with initializeApp() to provide the config automatically.
      firebaseApp = initializeApp();
    } catch (e) {
      if (process.env.NODE_ENV === "production") {
        console.warn('Automatic Firebase initialization failed. Falling back to firebaseConfig object.', e);
      }
      // Fallback for local development or if auto-init fails.
      firebaseApp = initializeApp(firebaseConfig);
    }

    return getSdks(firebaseApp);
  }

  // If already initialized, just get the existing app and return the SDKs.
  return getSdks(getApp());
}

/**
 * A helper function to get the SDK instances from a FirebaseApp instance.
 * @param {FirebaseApp} firebaseApp - The initialized Firebase app instance.
 * @returns {{firebaseApp: FirebaseApp, auth: Auth, firestore: Firestore}} An object containing the SDK services.
 */
export function getSdks(firebaseApp: FirebaseApp) {
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp)
  };
}

// Re-export all other modules for easy and consistent imports.
export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
