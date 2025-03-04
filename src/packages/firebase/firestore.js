// packages/firebase/firestore.js
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import initFirebase from "./index";

// Initialize Firestore
export const db = getFirestore(initFirebase());

// Get user data
export const getUserData = async (userId) => {
  try {
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      return userSnap.data();
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error getting user data:", error);
    return null;
  }
};

// Create or update user data
export const setUserData = async (userId, data) => {
  try {
    const userRef = doc(db, "users", userId);
    await setDoc(
      userRef,
      {
        ...data,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    console.error("Error setting user data:", error);
    throw error;
  }
};
