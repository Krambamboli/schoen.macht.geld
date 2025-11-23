'use client';

import { useState, useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/**
 * An invisible component that listens for globally emitted 'permission-error' events.
 * It throws any received error to be caught by Next.js's global error boundary,
 * which then displays a helpful debug overlay during development. This is a key part
 * of the debugging architecture for Firestore security rules.
 * @returns {null} This component renders nothing.
 */
export function FirebaseErrorListener() {
  const [error, setError] = useState<FirestorePermissionError | null>(null);

  useEffect(() => {
    /**
     * Callback function to handle the emitted error.
     * @param {FirestorePermissionError} error - The custom error object.
     */
    const handleError = (error: FirestorePermissionError) => {
      // Set the error in state to trigger a re-render.
      setError(error);
    };

    // Subscribe to the 'permission-error' event.
    errorEmitter.on('permission-error', handleError);

    // Unsubscribe on unmount to prevent memory leaks.
    return () => {
      errorEmitter.off('permission-error', handleError);
    };
  }, []);

  // On re-render, if an error exists in the state, throw it so Next.js can catch it.
  if (error) {
    throw error;
  }

  // This component does not render any UI.
  return null;
}
