"use client";

import React, { useState, useEffect, use } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  getFirestore,
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import Navbar from "@/components/Navbar";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { initFirebase } from "@/packages/firebase/index";
import Link from "next/link";
import {
  UserCircleIcon,
  CreditCardIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";

// Create the customer portal function directly in this file
const createCustomerPortal = async () => {
  try {
    const functions = getFunctions(initFirebase());
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

// Simple ProtectedLayout component
const ProtectedLayout = ({ children }) => {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-foreground">Loading...</div>
      </div>
    );
  }

  return user ? <>{children}</> : null;
};

export default function AccountPage() {
  const [user, setUser] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loadingButton, setLoadingButton] = useState(false);

  const handleManageSubscription = async () => {
    setLoadingButton(true);
    try {
      const portalLink = await createCustomerPortal();
      if (portalLink.url) {
        window.location.href = portalLink.url;
      }
    } catch (error) {
      setLoadingButton(false);
      console.error("Error creating customer portal:", error);
      setError("Failed to access subscription management");
    }
  };

  useEffect(() => {
    const app = initFirebase();
    const auth = getAuth(app);
    const db = getFirestore(app);

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          setUser({
            uid: currentUser.uid,
            email: currentUser.email,
            displayName: currentUser.displayName,
          });

          // Set up subscription listener
          const subscriptionsRef = collection(
            db,
            "customers",
            currentUser.uid,
            "subscriptions"
          );
          const q = query(
            subscriptionsRef,
            where("status", "in", ["active", "trialing"])
          );

          const unsubscribeSubscription = onSnapshot(
            q,
            async (snapshot) => {
              console.log("Subscription snapshot", snapshot.docs.length);

              if (snapshot.docs.length > 0) {
                const subscriptionDoc = snapshot.docs[0];
                const subscriptionData = subscriptionDoc.data();
                console.log("Subscription data:", subscriptionData);

                // Try to fetch product details
                let productName = "Unknown Product";
                let productDescription = "";
                let billingInterval = "monthly";

                // Use the subscription items to extract product details
                if (
                  subscriptionData.items &&
                  subscriptionData.items.length > 0
                ) {
                  const firstItem = subscriptionData.items[0];

                  // Extract product details from price.product object
                  if (firstItem.price?.product) {
                    productName =
                      firstItem.price.product.name || "Unknown Product";
                    productDescription =
                      firstItem.price.product.description || "";
                  }

                  // Determine billing interval
                  if (firstItem.price?.recurring?.interval) {
                    billingInterval = firstItem.price.recurring.interval;
                  }
                }

                setSubscription({
                  ...subscriptionData,
                  productName,
                  description: productDescription,
                  billingInterval,
                });
              } else {
                setSubscription(null);
              }

              setLoading(false);
            },
            (error) => {
              console.error("Subscription fetch error:", error);
              setError("Failed to load subscription details");
              setLoading(false);
            }
          );

          // Return cleanup function
          return () => {
            unsubscribeSubscription();
          };
        } catch (fetchError) {
          console.error("Error in auth state change:", fetchError);
          setError("Failed to load account details");
          setLoading(false);
        }
      } else {
        setUser(null);
        setSubscription(null);
        setLoading(false);
      }
    });

    // Return cleanup function
    return () => {
      unsubscribeAuth();
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-foreground">
          Loading Account Details...
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center bg-white shadow-md rounded-lg p-8">
          <InformationCircleIcon className="h-16 w-16 text-blue-500 mx-auto mb-4" />
          <p className="text-xl mb-4">Please log in to view your account</p>
          <Link
            href="/"
            className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition flex items-center justify-center"
          >
            <UserCircleIcon className="h-5 w-5 mr-2" />
            Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <ProtectedLayout>
      <Navbar />
      <div className="max-w-2xl mx-auto bg-white shadow-md rounded-lg p-8 mt-8">
        {error && (
          <div
            className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded relative mb-4"
            role="alert"
          >
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        <h1 className="text-3xl font-bold mb-6 flex items-center">
          <UserCircleIcon className="h-10 w-10 mr-3 text-blue-600" />
          My Account
        </h1>

        {/* User Profile Section */}
        <section className="mb-6 bg-gray-50 p-4 rounded-md">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <InformationCircleIcon className="h-6 w-6 mr-2 text-blue-500" />
            Profile Information
          </h2>
          <div className="space-y-2">
            <p>
              <strong>Email:</strong> {user.email}
            </p>
            <p>
              <strong>User ID:</strong> {user.uid}
            </p>
            {user.displayName && (
              <p>
                <strong>Display Name:</strong> {user.displayName}
              </p>
            )}
          </div>
        </section>

        {/* Subscription Section */}
        <section className="mb-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <CreditCardIcon className="h-6 w-6 mr-2 text-blue-500" />
            Subscription Details
          </h2>
          {subscription ? (
            <div className="bg-gray-50 p-4 rounded-md">
              <div className="mb-2">
                <strong>Status:</strong>{" "}
                <span
                  className={`
                  ${
                    subscription.status === "active"
                      ? "text-green-600"
                      : subscription.status === "trialing"
                      ? "text-blue-600"
                      : "text-red-600"
                  }
                `}
                >
                  {subscription.status.charAt(0).toUpperCase() +
                    subscription.status.slice(1)}
                </span>
              </div>
              {subscription.productName && (
                <div className="mb-2">
                  <strong>Plan:</strong> {subscription.productName}
                </div>
              )}
              {subscription.description && (
                <div className="mb-2 text-gray-600 italic">
                  {subscription.description}
                </div>
              )}
              {subscription.billingInterval &&
                !subscription.cancel_at_period_end && (
                  <div className="mb-2">
                    <strong>Billing:</strong>{" "}
                    {subscription.billingInterval.charAt(0).toUpperCase() +
                      subscription.billingInterval.slice(1)}
                  </div>
                )}
              {subscription.current_period_start && (
                <div className="mb-2">
                  <strong>Billing Cycle Started:</strong>{" "}
                  {new Date(
                    subscription.current_period_start.seconds * 1000
                  ).toLocaleDateString()}
                </div>
              )}
              {subscription.cancel_at_period_end && (
                <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-md mb-4 flex items-center">
                  <InformationCircleIcon className="h-6 w-6 text-yellow-600 mr-3" />
                  <p className="text-yellow-800">
                    Your subscription will remain active until the end of the
                    current billing period:{" "}
                    {subscription.current_period_end &&
                      new Date(
                        subscription.current_period_end.seconds * 1000
                      ).toLocaleDateString()}
                  </p>
                </div>
              )}
              {subscription.current_period_end &&
                !subscription.cancel_at_period_end && (
                  <div className="mb-2">
                    <strong>Next Billing Date:</strong>{" "}
                    {new Date(
                      subscription.current_period_end.seconds * 1000
                    ).toLocaleDateString()}
                  </div>
                )}
              <button
                onClick={handleManageSubscription}
                disabled={loadingButton}
                className={`mt-4 px-4 py-2 bg-blue-600 text-white rounded transition flex items-center ${
                  loadingButton
                    ? "opacity-70 cursor-not-allowed"
                    : "hover:bg-blue-700 cursor-pointer"
                }`}
              >
                {loadingButton ? (
                  <>
                    <CreditCardIcon className="h-5 w-5 mr-2" />
                    Loading...
                  </>
                ) : (
                  <>
                    <CreditCardIcon className="h-5 w-5 mr-2" />
                    Manage Subscription
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="bg-yellow-50 p-4 rounded-md flex items-center justify-between">
              <div>
                <p className="text-yellow-700 mb-2">
                  No active subscription found.
                </p>
                <p className="text-yellow-600 text-sm">
                  Explore our subscription plans to get started.
                </p>
              </div>
              <Link
                href="/pricing"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition flex items-center"
              >
                View Plans
                <CreditCardIcon className="h-5 w-5 ml-2" />
              </Link>
            </div>
          )}
        </section>
      </div>
    </ProtectedLayout>
  );
}
