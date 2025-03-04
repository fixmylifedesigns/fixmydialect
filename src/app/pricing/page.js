"use client";

import React, { useState } from "react";
import { AuthModal } from "@/packages/firebase-auth";
import { useAuth } from "@/context/AuthContext";
import { Check, Star, Zap, Shield } from "lucide-react";
import { initFirebase } from "@/packages/firebase";
import { getCheckoutUrl } from "@/packages/firebase/stripe-payment";
import Navbar from "@/components/Navbar";
import pricingData from "@/data/pricing.json";

const getIconComponent = (iconType) => {
  switch (iconType) {
    case "star":
      return <Star className="w-6 h-6" />;
    case "zap":
      return <Zap className="w-6 h-6" />;
    case "shield":
      return <Shield className="w-6 h-6" />;
    default:
      return <Star className="w-6 h-6" />;
  }
};

const PricingPage = () => {
  const app = initFirebase();
  const { user } = useAuth();
  const [billingCycle, setBillingCycle] = useState("monthly"); // "monthly" or "yearly"
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalView, setAuthModalView] = useState("signup");
  const [loadingTier, setLoadingTier] = useState(null); // Track which tier is loading
  const [error, setError] = useState(null);

  const yearlyDiscount = 0.1; // 10% discount for yearly

  const pricingTiers = pricingData.tiers.map((tier) => ({
    ...tier,
    icon: getIconComponent(tier.iconType),
  }));

  const openAuthModal = (view = "signup") => {
    setAuthModalView(view);
    setShowAuthModal(true);
  };

  // Updated to track which tier is loading
  const handleSubscription = async (tier, index) => {
    // If user is not authenticated, show auth modal
    if (!user) {
      openAuthModal("signup");
      return;
    }

    setError(null);
    setLoadingTier(index); // Set loading for this specific tier

    try {
      const priceId = tier.priceId[billingCycle];

      console.log(`Starting checkout for price ID: ${priceId}`);

      // Get the checkout URL using the Firebase Stripe extension
      const checkoutUrl = await getCheckoutUrl(app, priceId);

      console.log(`Redirecting to checkout: ${checkoutUrl}`);

      // Redirect to the Stripe Checkout page
      window.location.assign(checkoutUrl);
    } catch (err) {
      console.error("Checkout error:", err);
      setError(
        `Failed to start checkout: ${err.message || "Unknown error occurred"}`
      );
    } finally {
      setLoadingTier(null); // Reset loading state
    }
  };

  return (
    <div className="min-h-screen bg-background bg-gradient-to-b from-blue-50 to-white">
      <Navbar />
      <div className="max-w-6xl mx-auto py-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Simple, Transparent <span className="text-blue-600">Pricing</span>
          </h1>
          <p className="text-xl text-foreground/70 max-w-3xl mx-auto">
            Choose the plan that fits your needs. All plans include our core
            translation features.
          </p>
        </div>

        {/* Error Message if any */}
        {error && (
          <div className="max-w-3xl mx-auto mb-8 p-4 bg-red-50 text-red-700 rounded-md">
            {error}
          </div>
        )}

        {/* Billing Cycle Toggle */}
        <div className="flex justify-center mb-12">
          <div className="inline-flex p-1 bg-foreground/5 rounded-lg">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                billingCycle === "monthly"
                  ? "bg-background shadow-sm text-blue-600"
                  : "text-foreground/70 hover:text-foreground"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle("yearly")}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                billingCycle === "yearly"
                  ? "bg-background shadow-sm text-blue-600"
                  : "text-foreground/70 hover:text-foreground"
              }`}
            >
              Yearly
              <span className="ml-1 text-xs font-normal text-green-600">
                Save 10%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8">
          {pricingTiers.map((tier, index) => {
            // Calculate the display price based on billing cycle
            let displayPrice;
            let billingLabel;

            if (tier.oneTime) {
              displayPrice = tier.yearlyPrice;
              billingLabel = "one-time payment";
            } else {
              if (billingCycle === "yearly") {
                displayPrice = tier.monthlyPrice * 12 * (1 - yearlyDiscount);
                billingLabel = "per year";
              } else {
                displayPrice = tier.monthlyPrice;
                billingLabel = "per month";
              }
            }

            return (
              <div
                key={index}
                className={`rounded-xl overflow-hidden border flex flex-col ${
                  tier.highlighted
                    ? "border-blue-500 shadow-lg ring-2 ring-blue-500/50"
                    : "border-black/10 shadow"
                }`}
              >
                {/* Card Header */}
                <div
                  className={`p-6 ${
                    tier.highlighted ? "bg-blue-600" : "bg-background"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3
                        className={`text-xl font-bold ${
                          tier.highlighted ? "text-white" : "text-foreground"
                        }`}
                      >
                        {tier.name}
                      </h3>
                      <p
                        className={`mt-1 ${
                          tier.highlighted
                            ? "text-blue-100"
                            : "text-foreground/70"
                        }`}
                      >
                        {tier.description}
                      </p>
                    </div>
                    <div
                      className={`p-2 rounded-full ${
                        tier.highlighted ? "bg-blue-500" : "bg-blue-100"
                      }`}
                    >
                      <div
                        className={
                          tier.highlighted ? "text-white" : "text-blue-500"
                        }
                      >
                        {tier.icon}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Body */}
                <div className="bg-background p-6 flex-1 flex flex-col">
                  {/* Price */}
                  <div className="mb-6">
                    <div className="flex items-baseline">
                      <span className="text-5xl font-bold text-foreground">
                        ${displayPrice.toFixed(0)}
                      </span>
                      <span className="ml-2 text-foreground/70">
                        {billingLabel}
                      </span>
                    </div>

                    {tier.limitedSpots && (
                      <div className="mt-2">
                        <span className="inline-block px-2 py-1 text-xs font-medium bg-red-100 text-red-600 rounded-full">
                          {tier.limitedSpots}
                        </span>
                      </div>
                    )}

                    {tier.badge && (
                      <div className="mt-2">
                        <span className="inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-600 rounded-full">
                          {tier.badge}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Features */}
                  <ul className="space-y-3 mb-6 flex-1">
                    {tier.features.map((feature, i) => (
                      <li key={i} className="flex items-start">
                        <div className="flex-shrink-0 text-green-500">
                          <Check className="w-5 h-5" />
                        </div>
                        <span className="ml-3 text-foreground/70">
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA Button */}
                  <button
                    onClick={() =>
                      tier.active && handleSubscription(tier, index)
                    }
                    disabled={!tier.active || loadingTier === index}
                    className={`w-full py-3 rounded-md font-medium transition-colors mt-auto cursor-not-allowed ${
                      !tier.active
                        ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                        : loadingTier === index
                        ? "text-gray-500/70 cursor-not-allowed"
                        : tier.highlighted
                        ? "bg-blue-600 text-white hover:bg-blue-700"
                        : "bg-foreground/10 text-foreground hover:bg-foreground/20"
                    }`}
                  >
                    {!tier.active
                      ? "Coming Soon"
                      : loadingTier === index
                      ? "Processing..."
                      : tier.ctaText}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* FAQ Section */}
        <div className="mt-24 max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8 text-foreground">
            Frequently Asked Questions
          </h2>

          <div className="space-y-6">
            <FaqItem
              question="What's included in the Beta Access plan?"
              answer="Beta Access includes all our core features plus early access to new features as they're developed. You'll also have the opportunity to provide feedback and shape the future of the app. Your price is locked in as long as your subscription remains active."
            />
            <FaqItem
              question="How does the price lock guarantee work?"
              answer="For Beta Access subscribers, your monthly price of $5 will never increase as long as your subscription remains active. If you cancel and rejoin later, you'll be subject to the current pricing."
            />
            <FaqItem
              question="What happens after the limited Beta spots are filled?"
              answer="Once all 100 Beta spots are taken, new users will only be able to sign up for the Standard plan or Lifetime access. We won't be adding more Beta spots in the future."
            />
            <FaqItem
              question="Is the Lifetime access really one-time payment?"
              answer="Yes! The Lifetime access is a one-time payment of $200 that gives you permanent access to the translation app and all future updates. There are no recurring charges or hidden fees."
            />
            <FaqItem
              question="Can I switch between plans?"
              answer="Yes, you can upgrade or downgrade your plan at any time. If you upgrade to a higher tier, you'll be charged the prorated difference. If you downgrade, your new rate will apply on the next billing cycle."
            />
          </div>
        </div>
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialView={authModalView}
      />
    </div>
  );
};

const FaqItem = ({ question, answer }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-foreground/10 pb-4">
      <button
        className="flex justify-between items-center w-full text-left focus:outline-none"
        onClick={() => setIsOpen(!isOpen)}
      >
        <h3 className="text-lg font-medium text-foreground">{question}</h3>
        <span className="ml-6 flex-shrink-0">
          <svg
            className={`w-6 h-6 transform ${
              isOpen ? "rotate-180" : "rotate-0"
            }`}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </span>
      </button>
      {isOpen && (
        <div className="mt-3">
          <p className="text-foreground/70">{answer}</p>
        </div>
      )}
    </div>
  );
};

export default PricingPage;
