// packages/firebase/stripe-payment.js

import { getAuth } from "firebase/auth";
import {
  addDoc,
  collection,
  getFirestore,
  onSnapshot,
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";

export const getCheckoutUrl = async (app, priceId) => {
  const auth = getAuth(app);
  const userId = auth.currentUser?.uid;

  console.log("getCheckoutUrl - Starting with user ID:", userId);

  if (!userId) {
    console.error("getCheckoutUrl - No user ID found");
    throw new Error("User is not authenticated");
  }

  const db = getFirestore(app);
  const checkoutSessionRef = collection(
    db,
    "customers",
    userId,
    "checkout_sessions"
  );

  console.log("getCheckoutUrl - Creating checkout session document");

  try {
    const docRef = await addDoc(checkoutSessionRef, {
      price: priceId,
      success_url: window.location.origin + "/dashboard",
      cancel_url: window.location.origin + "/pricing?checkout=canceled",
    });

    console.log("getCheckoutUrl - Document created with ID:", docRef.id);

    return new Promise((resolve, reject) => {
      // Set a timeout to prevent hanging indefinitely
      const timeoutId = setTimeout(() => {
        unsubscribe();
        reject(new Error("Checkout URL generation timed out after 30 seconds"));
      }, 30000);

      console.log("getCheckoutUrl - Setting up snapshot listener");

      const unsubscribe = onSnapshot(
        docRef,
        (snap) => {
          console.log("getCheckoutUrl - Snapshot update received");

          if (!snap.exists()) {
            console.log("getCheckoutUrl - Document does not exist");
            return;
          }

          const data = snap.data();
          console.log("getCheckoutUrl - Snapshot data:", data);

          const error = data?.error;
          const url = data?.url;

          if (error) {
            console.error("getCheckoutUrl - Error in snapshot:", error);
            clearTimeout(timeoutId);
            unsubscribe();
            reject(new Error(`Stripe error: ${error.message}`));
          }

          if (url) {
            console.log("getCheckoutUrl - URL found:", url);
            clearTimeout(timeoutId);
            unsubscribe();
            resolve(url);
          } else {
            console.log("getCheckoutUrl - No URL in snapshot yet");
          }
        },
        (error) => {
          console.error("getCheckoutUrl - Snapshot listener error:", error);
          clearTimeout(timeoutId);
          unsubscribe();
          reject(error);
        }
      );
    });
  } catch (error) {
    console.error("getCheckoutUrl - Error creating document:", error);
    throw error;
  }
};

export const getPortalUrl = async (app) => {
  const auth = getAuth(app);
  const user = auth.currentUser;

  console.log("getPortalUrl - Starting with user:", user?.uid);

  if (!user) {
    console.error("getPortalUrl - No user found");
    throw new Error("User is not authenticated");
  }

  try {
    const functions = getFunctions(app, "us-central1");
    const functionRef = httpsCallable(
      functions,
      "ext-firestore-stripe-payments-createPortalLink"
    );

    console.log("getPortalUrl - Calling Cloud Function");

    const { data } = await functionRef({
      customerId: user.uid,
      returnUrl: window.location.origin,
    });

    console.log("getPortalUrl - Received response:", data);

    if (!data.url) {
      console.error("getPortalUrl - No URL in response");
      throw new Error("No portal URL returned from Stripe");
    }

    console.log("getPortalUrl - URL found:", data.url);
    return data.url;
  } catch (error) {
    console.error("getPortalUrl - Error:", error);
    throw error;
  }
};
