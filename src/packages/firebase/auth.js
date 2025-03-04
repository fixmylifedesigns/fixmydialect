// packages/firebase/auth.js
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import initFirebase from "./index";

// Initialize Firebase auth
export const auth = getAuth(initFirebase());

// Sign in with email and password
export const signInWithEmail = (email, password) => {
  return signInWithEmailAndPassword(auth, email, password);
};

// Create new user with email and password
export const signUpWithEmail = (email, password) => {
  return createUserWithEmailAndPassword(auth, email, password);
};

// Sign in with Google
export const signInWithGoogle = () => {
  const provider = new GoogleAuthProvider();
  return signInWithPopup(auth, provider);
};

// Sign out
export const logOut = () => {
  return signOut(auth);
};

// Auth state listener
export const onAuthStateChange = (callback) => {
  return onAuthStateChanged(auth, callback);
};
