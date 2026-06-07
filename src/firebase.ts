/// <reference types="vite/client" />

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "",
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || ""
};

// Check if Firebase configuration is fully supplied
export const isFirebaseSetup = !!firebaseConfig.apiKey && firebaseConfig.apiKey !== "";

let app: any = null;
export let db: any = null;
export let auth: any = null;

if (isFirebaseSetup) {
  try {
    app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    db = getFirestore(app, firebaseConfig.firestoreDatabaseId || undefined);
    auth = getAuth(app);
    console.log("Firebase initialized successfully in live cloud syncing mode.");
  } catch (err) {
    console.error("Firebase failed to initialize live cloud:", err);
  }
} else {
  console.log("Firebase API key missing. Running in local-offline sandboxed protocol.");
}

// Emulate simple authentication loops for offline mode
type AuthListener = (user: any) => void;
const offlineListeners = new Set<AuthListener>();
let offlineUser: any = null;

if (typeof window !== 'undefined') {
  const session = localStorage.getItem('rideflow_offline_session');
  if (session) {
    try {
      offlineUser = JSON.parse(session);
    } catch {
      offlineUser = null;
    }
  }
}

export function safeOnAuthStateChanged(authInstance: any, callback: (user: any) => void) {
  if (isFirebaseSetup && authInstance) {
    return onAuthStateChanged(authInstance, callback);
  } else {
    // Local offline state emitter
    callback(offlineUser);
    offlineListeners.add(callback);
    return () => {
      offlineListeners.delete(callback);
    };
  }
}

export async function safeSignInWithPopup(authInstance: any) {
  if (isFirebaseSetup && authInstance) {
    const provider = new GoogleAuthProvider();
    return signInWithPopup(authInstance, provider);
  } else {
    // Generate an authentic local session to bridge the access barrier cleanly
    const localUser = {
      uid: "offline_rider_intel",
      displayName: "Offline Rider",
      email: "local@rideflow.pro",
      photoURL: null
    };
    offlineUser = localUser;
    localStorage.setItem('rideflow_offline_session', JSON.stringify(localUser));
    offlineListeners.forEach(listener => listener(localUser));
    return { user: localUser };
  }
}

export async function safeSignOut(authInstance: any) {
  if (isFirebaseSetup && authInstance) {
    return signOut(authInstance);
  } else {
    offlineUser = null;
    localStorage.removeItem('rideflow_offline_session');
    offlineListeners.forEach(listener => listener(null));
  }
}
