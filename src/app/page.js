// src/app/page.js
"use client";

import React, { useState } from "react";
import { AuthModal } from "@/packages/firebase-auth";
import {
  Sparkles,
  Globe,
  MessageSquare,
  Volume2,
  Star,
  Zap,
  Shield,
  Check,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import pricingData from "@/data/pricing.json";

const LandingPage = () => {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalView, setAuthModalView] = useState("signin");
  const { user, loading } = useAuth();
  const router = useRouter();

  // Map icon types to actual components
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

  // Convert the JSON data back to a React-friendly format with actual icon components
  const pricingTiers = pricingData.tiers.map((tier) => ({
    ...tier,
    icon: getIconComponent(tier.iconType),
    // Format the price display for the landing page
    price: tier.oneTime
      ? `$${tier.yearlyPrice} one-time`
      : `$${tier.monthlyPrice}/month`,
  }));

  const openAuthModal = (view = "signin") => {
    // If user is already logged in, redirect to dashboard
    if (user && !loading) {
      router.push("/dashboard");
      return;
    }

    // Otherwise, show the auth modal
    setAuthModalView(view);
    setShowAuthModal(true);
  };

  return (
    <div className="bg-gradient-to-b from-blue-50 to-white min-h-screen">
      {/* Hero Section */}
      <section className="pt-20 pb-24 px-4 text-center">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
          Translate Anything, <span className="text-blue-600">Anywhere</span>
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-10">
          Professional-quality translations powered by AI. Support for over 100
          languages, dialects, and custom formality levels.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => openAuthModal("signup")}
            className="px-8 py-3 bg-blue-600 text-white rounded-md text-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Get Started for Free
          </button>
          <button
            onClick={() => openAuthModal("signin")}
            className="px-8 py-3 bg-white text-blue-600 border border-blue-600 rounded-md text-lg font-medium hover:bg-blue-50 transition-colors"
          >
            Sign In
          </button>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            Why Choose Our Translation App?
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <FeatureCard
              icon={<Globe className="w-10 h-10 text-blue-500" />}
              title="100+ Languages"
              description="Support for over 100 languages and regional dialects from around the world."
            />
            <FeatureCard
              icon={<MessageSquare className="w-10 h-10 text-blue-500" />}
              title="Contextual Translation"
              description="Our AI understands context and nuance for more accurate translations."
            />
            <FeatureCard
              icon={<Sparkles className="w-10 h-10 text-blue-500" />}
              title="Custom Formality"
              description="Choose between formal, casual, or honorific speech styles."
            />
            <FeatureCard
              icon={<Volume2 className="w-10 h-10 text-blue-500" />}
              title="Text-to-Speech"
              description="Hear your translations with natural-sounding voices in any language."
            />
          </div>
        </div>
      </section>

      {/* Pricing Cards Section */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-6">
            Simple, Transparent Pricing
          </h2>
          <p className="text-xl text-gray-600 text-center max-w-3xl mx-auto mb-12">
            Choose the plan that fits your needs. All plans include our core
            translation features.
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            {pricingTiers.map((tier, index) => (
              <div
                key={index}
                className={`bg-white rounded-xl overflow-hidden border shadow-sm flex flex-col ${
                  tier.highlighted
                    ? "border-blue-500 ring-2 ring-blue-500 ring-opacity-50"
                    : "border-gray-200"
                }`}
              >
                {/* Card Header */}
                <div
                  className={`p-5 ${
                    tier.highlighted ? "bg-blue-600" : "bg-white"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3
                        className={`text-lg font-semibold ${
                          tier.highlighted ? "text-white" : "text-gray-900"
                        }`}
                      >
                        {tier.name}
                      </h3>
                      <p
                        className={`text-sm mt-1 ${
                          tier.highlighted ? "text-blue-100" : "text-gray-600"
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
                <div className="p-5 flex-1 flex flex-col">
                  <div className="mb-4">
                    <div className="text-2xl font-bold text-gray-900">
                      {tier.price}
                    </div>
                  </div>

                  <ul className="space-y-2 mb-5 flex-1">
                    {/* Show just the first 3 features to keep it simple on the landing page */}
                    {tier.features.slice(0, 3).map((feature, i) => (
                      <li key={i} className="flex items-start text-sm">
                        <div className="flex-shrink-0 text-green-500">
                          <Check className="h-5 w-5" />
                        </div>
                        <span className="ml-2 text-gray-600">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    href="/pricing"
                    className={`w-full flex items-center justify-center py-2 px-4 rounded-md font-medium transition-colors mt-auto ${
                      tier.highlighted
                        ? "bg-blue-600 text-white hover:bg-blue-700"
                        : !tier.active
                        ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                        : "bg-gray-100 text-gray-900 hover:bg-gray-200"
                    }`}
                  >
                    {!tier.active ? "Coming Soon" : tier.ctaText}
                    {tier.active && <ArrowRight className="ml-2 h-4 w-4" />}
                  </Link>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <Link
              href="/pricing"
              className="inline-flex items-center text-blue-600 font-medium hover:text-blue-800"
            >
              View full pricing details
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-12">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <StepCard
              number="1"
              title="Enter Text"
              description="Type or paste the text you want to translate."
            />
            <StepCard
              number="2"
              title="Choose Options"
              description="Select language, dialect, and formality settings."
            />
            <StepCard
              number="3"
              title="Get Results"
              description="Receive accurate translations instantly with audio playback."
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-blue-600 text-white text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold mb-6">
            Ready to start translating?
          </h2>
          <p className="text-xl mb-10 text-blue-100">
            Join thousands of users who trust our translation service every day.
          </p>
          <button
            onClick={() => openAuthModal("signup")}
            className="px-8 py-3 bg-white text-blue-600 rounded-md text-lg font-medium hover:bg-gray-100 transition-colors"
          >
            Create Free Account
          </button>
        </div>
      </section>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialView={authModalView}
      />
    </div>
  );
};

const FeatureCard = ({ icon, title, description }) => (
  <div className="bg-gray-50 p-6 rounded-lg text-center">
    <div className="flex justify-center mb-4">{icon}</div>
    <h3 className="text-xl font-semibold mb-2">{title}</h3>
    <p className="text-gray-600">{description}</p>
  </div>
);

const StepCard = ({ number, title, description }) => (
  <div className="flex flex-col items-center">
    <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center text-xl font-bold mb-4">
      {number}
    </div>
    <h3 className="text-xl font-semibold mb-2">{title}</h3>
    <p className="text-gray-600">{description}</p>
  </div>
);

export default LandingPage;
