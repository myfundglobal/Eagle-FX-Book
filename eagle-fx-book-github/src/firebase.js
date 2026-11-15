import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  setPersistence,
  browserLocalPersistence
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import appletConfig from "../firebase-applet-config.json";

export const ADMIN_EMAIL = "myfundglobal@gmail.com";

export const FIRESTORE_DATABASE_ID = appletConfig.firestoreDatabaseId;

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: appletConfig.authDomain,
  projectId: appletConfig.projectId,
  storageBucket: appletConfig.storageBucket,
  messagingSenderId: appletConfig.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || ""
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.appId &&
    !firebaseConfig.apiKey.includes("your_firebase")
);

let app = null;
let auth = null;
let db = null;
let googleProvider = null;

if (isFirebaseConfigured) {
  app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  auth = getAuth(app);
  setPersistence(auth, browserLocalPersistence).catch((err) => {
    console.warn("Persistence warning:", err);
  });
  db = getFirestore(app, FIRESTORE_DATABASE_ID);
  googleProvider = new GoogleAuthProvider();
  googleProvider.setCustomParameters({ prompt: "select_account" });
}

export { app, auth, db, googleProvider };

export function isAdminUser(user) {
  return Boolean(
    user?.email && user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()
  );
}

export function mapFirebaseError(error) {
  const code = error?.code || "";
  switch (code) {
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Incorrect email or password. Please check and try again.";
    case "auth/user-not-found":
      return "No Eagle FX Book account found with this email.";
    case "auth/email-already-in-use":
      return "An account with this email already exists. Try logging in.";
    case "auth/weak-password":
      return "Password is too weak. Use at least 8 characters.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a few minutes and try again.";
    case "auth/network-request-failed":
      return "Network error. Check your internet connection.";
    case "auth/popup-closed-by-user":
      return "Google sign-in was cancelled.";
    case "auth/operation-not-allowed":
      return "This sign-in method is not enabled in Firebase Console.";
    default:
      return error?.message || "Something went wrong. Please try again.";
  }
}
