// packages/firebase/stripe.js
import { getFunctions, httpsCallable } from "firebase/functions";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import initFirebase from "./index";

// Create a checkout session
export const createCheckoutSession = async (priceId, mode = "subscription") => {
  try {
    const app = initFirebase();
    const functions = getFunctions(app, "us-central1");
    const createCheckoutSessionFn = httpsCallable(
      functions,
      "ext-firestore-stripe-payments-createCheckoutSession"
    );

    const checkoutOptions = {
      price: priceId,
      success_url: window.location.origin + "/dashboard?checkout=success",
      cancel_url: window.location.origin + "/pricing?checkout=canceled",
      mode: mode,
    };

    const { data } = await createCheckoutSessionFn(checkoutOptions);
    return data;
  } catch (error) {
    console.error("Error creating checkout session:", error);
    throw error;
  }
};

// Create customer portal session
export const createCustomerPortal = async () => {
  try {
    const app = initFirebase();
    const functions = getFunctions(app, "us-central1");
    const createPortalLinkFn = httpsCallable(
      functions,
      "ext-firestore-stripe-payments-createPortalLink"
    );

    const { data } = await createPortalLinkFn({
      returnUrl: window.location.origin + "/account",
    });

    return data;
  } catch (error) {
    console.error("Error creating customer portal:", error);
    throw error;
  }
};

// Check if user has active subscription
export const hasActiveSubscription = async (userId) => {
  if (!userId) return false;

  try {
    const app = initFirebase();
    const db = getFirestore(app);
    const subscriptionsRef = collection(
      db,
      "customers",
      userId,
      "subscriptions"
    );
    const q = query(
      subscriptionsRef,
      where("status", "in", ["active", "trialing"])
    );
    const snapshot = await getDocs(q);

    return !snapshot.empty;
  } catch (error) {
    console.error("Error checking subscription status:", error);
    return false;
  }
};





// import { getFunctions, httpsCallable } from "firebase/functions";
// import { initFirebase } from "./index";

// export const createCustomerPortal = async () => {
//   const functions = getFunctions(initFirebase());
//   const createPortalLinkFn = httpsCallable(
//     functions,
//     "ext-firestore-stripe-payments-createPortalLink"
//   );

//   const { data } = await createPortalLinkFn({
//     returnUrl: window.location.origin + "/account",
//   });

//   return data;
// };

// export const hasActiveSubscription = async (userId) => {
//   if (!userId) return false;

//   const app = initFirebase();
//   const db = getFirestore(app);
//   const subscriptionsRef = collection(db, "customers", userId, "subscriptions");
//   const q = query(
//     subscriptionsRef,
//     where("status", "in", ["active", "trialing"])
//   );
//   const snapshot = await getDocs(q);

//   return !snapshot.empty;
// };
