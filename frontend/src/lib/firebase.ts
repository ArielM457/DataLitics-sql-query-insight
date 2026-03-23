/**
 * Firebase client-side initialization.
 *
 * Initializes the Firebase app with environment variables and
 * exports the Auth instance for use throughout the application.
 */

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Firebase must only initialize on the client — never during SSR/prerender
const app: FirebaseApp =
  typeof window !== "undefined"
    ? getApps().length === 0
      ? initializeApp(firebaseConfig)
      : getApp()
    : ({} as FirebaseApp);

export const auth: Auth =
  typeof window !== "undefined" ? getAuth(app) : ({} as Auth);

export const db: Firestore =
  typeof window !== "undefined" ? getFirestore(app) : ({} as Firestore);

export default app;
