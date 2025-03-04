"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { hasActiveSubscription } from "@/packages/firebase/stripe";
import {
  Volume2,
  ChevronDown,
  Copy,
  RefreshCw,
  X,
  Search,
  Settings,
  Globe,
  Star,
  Zap,
  Shield,
  ArrowRight,
  MessageSquare,
} from "lucide-react";
import Link from "next/link";

import Navbar from "@/components/Navbar";

import languagesData from "@/data/available-languages.json";
import dialectsData from "@/data/dialects.json";
import pricingData from "@/data/pricing.json";

const adjustTextForSpeech = (text) => {
  return text
    .replace(/([.!?])(\S)/g, "$1 $2") // Ensure proper spacing after punctuation
    .trim();
};

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

// Simple AccountSubscription banner component
const AccountSubscription = ({ hasSubscription, onSubscribeClick }) => {
  if (hasSubscription) {
    return null; // Don't show anything for subscribed users
  }

  return (
    <div className="bg-yellow-50 border-b border-yellow-100 p-3">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center">
        <p className="text-yellow-800 text-sm">
          You&apos;re using a limited version. Upgrade to access all features.
        </p>
        <button
          onClick={onSubscribeClick}
          className="mt-2 sm:mt-0 px-4 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Subscribe Now
        </button>
      </div>
    </div>
  );
};

export default function Dashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const [hasSubscription, setHasSubscription] = useState(false);
  const [inputText, setInputText] = useState("");
  const [translation, setTranslation] = useState("");
  const [romaji, setRomaji] = useState("");
  const [audioUrl, setAudioUrl] = useState(null);
  const [charCount, setCharCount] = useState(0);
  const [translating, setTranslating] = useState(false);
  const [error, setError] = useState("");
  const [sourceLang, setSourceLang] = useState({ code: "en", name: "English" });
  const [targetLang, setTargetLang] = useState({
    code: "ja",
    name: "Japanese",
  });
  const [selectedDialect, setSelectedDialect] = useState({
    source: "",
    target: "",
  });
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showDialectDropdown, setShowDialectDropdown] = useState(false);
  const [showMobileDialectModal, setShowMobileDialectModal] = useState(false);
  const [modalTarget, setModalTarget] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [inputAudioUrl, setInputAudioUrl] = useState(null);
  const [isInputAudioLoading, setIsInputAudioLoading] = useState(false);
  const [isOutputAudioLoading, setIsOutputAudioLoading] = useState(false);
  const CHARACTER_LIMIT = 2000;
  // Keep advanced settings closed by default
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showAdvancedModal, setShowAdvancedModal] = useState(false);
  const [speakerPronouns, setSpeakerPronouns] = useState(null);
  const [listenerPronouns, setListenerPronouns] = useState(null);
  const [formalityLevel, setFormalityLevel] = useState("stranger");

  // Pricing tiers for non-subscribers
  const pricingTiers = pricingData.tiers.map((tier) => ({
    ...tier,
    icon: getIconComponent(tier.iconType),
  }));

  const FORMALITY_LEVELS = {
    stranger: "Use formal/polite speech.",
    friend: "Use casual/informal speech.",
    superior: "Use honorific/respectful language.",
    child: "Use simple, friendly language.",
  };

  const PRONOUN_OPTIONS = [
    { value: null, label: "Not specified" },
    { value: "he/him", label: "he/him" },
    { value: "she/her", label: "she/her" },
    { value: "they/them", label: "they/them" },
  ];

  // Load advanced settings from localStorage but don't automatically show panel
  useEffect(() => {
    const savedSettings = localStorage.getItem("translationAdvancedSettings");
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        setSpeakerPronouns(settings.speakerPronouns);
        setListenerPronouns(settings.listenerPronouns);
        setFormalityLevel(settings.formalityLevel);
      } catch (error) {
        console.error("Error parsing saved settings:", error);
      }
    }
  }, []);

  // Save settings when they change
  useEffect(() => {
    localStorage.setItem(
      "translationAdvancedSettings",
      JSON.stringify({
        speakerPronouns,
        listenerPronouns,
        formalityLevel,
      })
    );
  }, [speakerPronouns, listenerPronouns, formalityLevel]);

  // Load saved language preferences
  useEffect(() => {
    const savedPreferences = localStorage.getItem("translationPreferences");
    if (savedPreferences) {
      try {
        const { sourceLang: savedSource, targetLang: savedTarget } =
          JSON.parse(savedPreferences);
        setSourceLang(savedSource);
        setTargetLang(savedTarget);
        setSelectedDialect({
          source: "",
          target: "",
        });
      } catch (error) {
        console.error("Error parsing saved preferences:", error);
      }
    }
  }, []);

  // Save preferences when languages change
  useEffect(() => {
    localStorage.setItem(
      "translationPreferences",
      JSON.stringify({
        sourceLang,
        targetLang,
      })
    );
  }, [sourceLang, targetLang]);

  useEffect(() => {
    // Check subscription status
    if (user) {
      const checkSubscription = async () => {
        try {
          const hasActiveSubscriptionStatus = await hasActiveSubscription(
            user.uid
          );
          setHasSubscription(hasActiveSubscriptionStatus);
        } catch (error) {
          console.error("Error checking subscription:", error);
        } finally {
          setSubscriptionLoading(false);
        }
      };

      checkSubscription();
    }
  }, [user]);

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

  const handleInputChange = (e) => {
    const text = e.target.value;
    if (text.length <= CHARACTER_LIMIT) {
      setInputText(text);
      setCharCount(text.length);
      setInputAudioUrl(null);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const maxRetries = 3;
    let retryCount = 0;

    while (retryCount < maxRetries) {
      try {
        setTranslating(true);
        setError("");
        setRomaji("");
        setTranslation("");
        setRomaji("");
        setAudioUrl(null);
        const res = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: inputText,
            sourceLanguage: sourceLang.name,
            targetLanguage: targetLang.name,
            targetDialect: selectedDialect.target,
            speakerPronouns,
            listenerPronouns,
            formality: formalityLevel,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Translation failed");
        }

        const data = await res.json();
        setTranslation(data.translation || "");
        setRomaji(data.romaji || "");
        break; // Success, exit the loop
      } catch (err) {
        retryCount++;
        if (retryCount === maxRetries) {
          setError(
            `Translation failed after ${maxRetries} attempts: ${err.message}`
          );
        }
        // Wait a short time before retrying
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } finally {
        setTranslating(false);
      }
    }
  };

  const handleAudioClick = async (text, lang, isInput = false, romaji) => {
    const loadingStateSetter = isInput
      ? setIsInputAudioLoading
      : setIsOutputAudioLoading;
    const currentAudioUrl = isInput ? inputAudioUrl : audioUrl;
    const audioUrlSetter = isInput ? setInputAudioUrl : setAudioUrl;

    // If we already have the audio, just play it
    if (currentAudioUrl) {
      try {
        const audio = new Audio(currentAudioUrl);
        await audio.play();
        return;
      } catch (err) {
        console.error("Audio playback error:", err);
        // Clear invalid audio URL
        audioUrlSetter(null);
      }
    }

    // Generate new audio
    loadingStateSetter(true);
    try {
      const adjustedText = adjustTextForSpeech(text);
      const res = await fetch("/api/opentts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: adjustedText, language: lang }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "opentts request failed");
      }

      const blob = await res.blob();
      if (!blob.type.includes("audio/")) {
        throw new Error("Invalid audio format received");
      }

      const url = URL.createObjectURL(blob);
      audioUrlSetter(url);

      // Create new audio instance and play
      const audio = new Audio(url);
      await new Promise((resolve, reject) => {
        audio.onloadeddata = () => {
          audio.play().then(resolve).catch(reject);
        };
        audio.onerror = () => reject(new Error("Audio loading failed"));
      });
    } catch (err) {
      console.error("Error with audio:", err);
      audioUrlSetter(null);
    } finally {
      loadingStateSetter(false);
    }
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(translation);
    } catch (err) {
      console.error("Failed to copy text:", err);
    }
  };

  const switchLanguages = () => {
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
    setSelectedDialect({
      source: selectedDialect.target,
      target: selectedDialect.source,
    });
  };

  const openLanguageModal = (target) => {
    setModalTarget(target);
    setShowLanguageModal(true);
    setSearchQuery("");
  };

  const selectLanguage = (lang) => {
    if (modalTarget === "source") {
      // If selected language is same as target, switch languages
      if (lang.code === targetLang.code) {
        switchLanguages();
      } else {
        setSourceLang(lang);
      }
    } else {
      setTargetLang(lang);
    }
    setShowLanguageModal(false);
  };

  const filteredLanguages = languagesData.languages.filter((lang) =>
    lang.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const resetAdvancedSettings = () => {
    setSpeakerPronouns(null);
    setListenerPronouns(null);
    setFormalityLevel("stranger");
    localStorage.removeItem("translationAdvancedSettings");
  };

  const openMobileDialectModal = () => {
    setShowMobileDialectModal(true);
  };

  // Show loading state while checking auth and subscription
  if (loading || subscriptionLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-foreground">Loading...</div>
      </div>
    );
  }

  // If user has no subscription, show pricing options
  if (!hasSubscription) {
    return (
      <div className="min-h-screen bg-background">
        {/* Dashboard header */}
        <Navbar />

        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          {/* Subscription needed message */}
          <div className="text-center py-8">
            <Globe className="mx-auto h-16 w-16 text-blue-500" />
            <h2 className="mt-6 text-3xl font-bold text-foreground">
              Welcome to your translation dashboard
            </h2>
            <p className="mt-2 text-xl text-foreground/70 max-w-2xl mx-auto">
              To start translating, you&apos;ll need to choose a subscription
              plan
            </p>
          </div>

          {/* Subscription options for non-subscribers */}
          <div className="max-w-5xl mx-auto mt-8 mb-16">
            <h3 className="text-xl font-semibold text-foreground mb-6 text-center">
              Choose a plan to get started
            </h3>

            <div className="grid md:grid-cols-3 gap-6">
              {pricingTiers.map((tier, index) => (
                <div
                key={index}
                className={`bg-background rounded-xl overflow-hidden border shadow-sm flex flex-col ${
                  tier.highlighted
                    ? "border-blue-500 ring-2 ring-blue-500/50"
                    : "border-black/10"
                }`}
              >
                <div
                  className={`p-5 ${
                    tier.highlighted ? "bg-blue-600" : "bg-background"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3
                        className={`text-lg font-semibold ${
                          tier.highlighted ? "text-white" : "text-foreground"
                        }`}
                      >
                        {tier.name}
                      </h3>
                      <p
                        className={`text-sm mt-1 ${
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
              
                <div className="p-5 flex-1 flex flex-col">
                  <div className="mb-4">
                    <div className="text-2xl font-bold text-foreground">
                      {tier.price}
                    </div>
                  </div>
              
                  <ul className="space-y-2 mb-5 flex-1">
                    {tier.features.map((feature, i) => (
                      <li key={i} className="flex items-start text-sm">
                        <div className="flex-shrink-0 text-green-500">
                          <svg
                            className="h-5 w-5"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                        <span className="ml-2 text-foreground/70">
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>
              
                  <Link
                    href="/pricing"
                    className={`w-full flex items-center justify-center py-2 px-4 rounded-md font-medium transition-colors mt-auto ${
                      tier.highlighted
                        ? "bg-blue-600 text-white hover:bg-blue-700"
                        : "bg-foreground/10 text-foreground hover:bg-foreground/20"
                    }`}
                  >
                    {tier.ctaText}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </div>
              </div>
              ))}
            </div>
          </div>

          {/* Preview mode for non-subscribers */}
          <div className="bg-background border border-dashed border-foreground/20 rounded-lg p-6 mb-8">
            <div className="text-center">
              <MessageSquare className="mx-auto h-12 w-12 text-foreground/40" />
              <h3 className="mt-2 text-lg font-medium text-foreground">
                Translation Preview
              </h3>
              <p className="mt-1 text-foreground/70">
                Get a glimpse of our powerful translation features
              </p>
              <div className="mt-4 max-w-xl mx-auto">
                <textarea
                  disabled
                  rows={3}
                  className="w-full p-3 bg-foreground/5 border border-foreground/10 rounded-md text-foreground/60 cursor-not-allowed"
                  placeholder="Translation features are available with a subscription plan..."
                ></textarea>
              </div>
              <Link
                href="/pricing"
                className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Unlock Full Features
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If user has a subscription, show the translation interface
  return (
    <ProtectedLayout>
      <div className="w-full min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <AccountSubscription
          hasSubscription={hasSubscription}
          onSubscribeClick={() => router.push("/pricing")}
        />
        {/* Language Selection Modal */}
        {showLanguageModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-4 w-full max-w-md m-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">
                  Select {modalTarget === "source" ? "Source" : "Target"}{" "}
                  Language
                </h2>
                <button
                  onClick={() => setShowLanguageModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Search input */}
              <div className="relative mb-4">
                <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search languages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="max-h-96 overflow-y-auto">
                {filteredLanguages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => selectLanguage(lang)}
                    className={`w-full text-left p-3 hover:bg-gray-100 rounded ${
                      (modalTarget === "source"
                        ? sourceLang.code
                        : targetLang.code) === lang.code
                        ? "bg-blue-50"
                        : ""
                    }`}
                  >
                    {lang.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Mobile Dialect Modal */}
        {showMobileDialectModal && dialectsData[targetLang.code] && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-4 w-full max-w-md m-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">
                  Select {targetLang.name} Dialect
                </h2>
                <button
                  onClick={() => setShowMobileDialectModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="max-h-96 overflow-y-auto">
                {/* Reset dialect option */}
                <button
                  className={`w-full text-left p-3 hover:bg-gray-100 rounded ${
                    selectedDialect.target === "" ? "bg-blue-50" : ""
                  }`}
                  onClick={() => {
                    setSelectedDialect({
                      ...selectedDialect,
                      target: "",
                    });
                    setShowMobileDialectModal(false);
                  }}
                >
                  None (Reset dialect)
                </button>

                {dialectsData[targetLang.code].map((dialect, idx) => (
                  <button
                    key={idx}
                    className={`w-full text-left p-3 hover:bg-gray-100 rounded ${
                      selectedDialect.target === dialect ? "bg-blue-50" : ""
                    }`}
                    onClick={() => {
                      setSelectedDialect({
                        ...selectedDialect,
                        target: dialect,
                      });
                      setShowMobileDialectModal(false);
                    }}
                  >
                    {dialect}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Advanced Settings Modal */}
        {showAdvancedModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-4 w-full max-w-md m-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Advanced Settings</h2>
                <button
                  onClick={() => setShowAdvancedModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Speaker Pronouns */}
                <div className="flex flex-col gap-1">
                  <label className="text-sm text-gray-600">
                    Speaker Pronouns
                  </label>
                  <select
                    value={speakerPronouns || ""}
                    onChange={(e) => setSpeakerPronouns(e.target.value || null)}
                    className="p-2 border rounded-md w-full"
                  >
                    {PRONOUN_OPTIONS.map((option) => (
                      <option key={option.label} value={option.value || ""}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Listener Pronouns */}
                <div className="flex flex-col gap-1">
                  <label className="text-sm text-gray-600">
                    Listener Pronouns
                  </label>
                  <select
                    value={listenerPronouns || ""}
                    onChange={(e) =>
                      setListenerPronouns(e.target.value || null)
                    }
                    className="p-2 border rounded-md w-full"
                  >
                    {PRONOUN_OPTIONS.map((option) => (
                      <option key={option.label} value={option.value || ""}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Formality Level */}
                <div className="flex flex-col gap-1">
                  <label className="text-sm text-gray-600">
                    Formality Level
                  </label>
                  <select
                    value={formalityLevel}
                    onChange={(e) => setFormalityLevel(e.target.value)}
                    className="p-2 border rounded-md w-full"
                  >
                    {Object.entries(FORMALITY_LEVELS).map(([key, value]) => (
                      <option key={key} value={key}>
                        {value}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={resetAdvancedSettings}
                    className="flex-1 p-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
                  >
                    Reset Settings
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAdvancedModal(false)}
                    className="flex-1 p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Container */}
        <div className="w-full max-w-7xl mx-auto flex flex-col gap-4 p-4 md:p-8 flex-1">
          {/* Language Selection Bar - Mobile Only */}
          <div className="lg:hidden flex items-center justify-between bg-white p-3 rounded-lg shadow-sm">
            <div className="flex items-center">
              <button
                className="text-blue-500 font-medium"
                onClick={() => openLanguageModal("source")}
              >
                {sourceLang.name}
              </button>
              <button className="mx-2 text-gray-600" onClick={switchLanguages}>
                <RefreshCw className="w-5 h-5" />
              </button>
              <button
                className="text-blue-500 font-medium flex items-center"
                onClick={() => openLanguageModal("target")}
              >
                {targetLang.name}
                {selectedDialect.target && (
                  <span className="ml-1">({selectedDialect.target})</span>
                )}
              </button>
            </div>

            <div className="flex items-center gap-2">
              {/* Mobile Dialect Selection Button */}
              {dialectsData[targetLang.code] && (
                <button
                  className="p-2 hover:bg-gray-100 rounded-full text-gray-600"
                  onClick={openMobileDialectModal}
                  title="Select dialect"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              )}

              {/* Advanced Settings Button */}
              <button
                className="p-2 hover:bg-gray-100 rounded-full text-gray-600"
                onClick={() => setShowAdvancedModal(true)}
                title="Advanced settings"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Translation Area - Desktop Row Layout */}
          <div className="flex flex-col lg:flex-row gap-4 flex-1">
            {/* Input Side */}
            <div className="w-full lg:w-1/2 flex flex-col">
              {/* Desktop Language Selection */}
              <div className="hidden lg:flex items-center justify-between bg-white p-3 rounded-lg shadow-sm mb-4">
                <button
                  className="text-blue-500 font-medium"
                  onClick={() => openLanguageModal("source")}
                >
                  {sourceLang.name}
                </button>

                {/* Desktop Advanced Settings Button */}
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="text-gray-600 hover:text-gray-800 flex items-center gap-2"
                >
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${
                      showAdvanced ? "transform rotate-180" : ""
                    }`}
                  />
                  Advanced Settings
                </button>
              </div>

              {/* Input Form */}
              <div className="bg-white rounded-lg shadow-sm p-4 flex-1 flex flex-col">
                <textarea
                  value={inputText}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Enter text..."
                  className="w-full flex-1 p-3 border border-gray-300 rounded resize-none text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  maxLength={CHARACTER_LIMIT}
                />
                <div className="flex justify-between items-center mt-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className={
                        !inputText || isInputAudioLoading
                          ? "text-gray-300"
                          : "p-2 hover:bg-gray-100 rounded-full text-gray-600"
                      }
                      onClick={() =>
                        handleAudioClick(inputText, sourceLang.code, true)
                      }
                      disabled={!inputText || isInputAudioLoading}
                      title="Listen to input text"
                    >
                      {isInputAudioLoading ? (
                        <RefreshCw className="w-5 h-5 animate-spin" />
                      ) : (
                        <Volume2 className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  <div
                    className={`text-sm ${
                      charCount > CHARACTER_LIMIT * 0.9
                        ? "text-red-500"
                        : "text-gray-500"
                    }`}
                  >
                    {charCount}/{CHARACTER_LIMIT} characters
                  </div>
                </div>
              </div>

              {/* Desktop Advanced Settings Panel */}
              {showAdvanced && (
                <div className="hidden lg:block mt-2 p-4 bg-white rounded-lg border border-gray-200">
                  <div className="grid grid-cols-2 gap-4">
                    {/* Speaker Pronouns */}
                    <div className="flex flex-col gap-1">
                      <label className="text-sm text-gray-600">
                        Speaker Pronouns
                      </label>
                      <select
                        value={speakerPronouns || ""}
                        onChange={(e) =>
                          setSpeakerPronouns(e.target.value || null)
                        }
                        className="p-2 border rounded-md"
                      >
                        {PRONOUN_OPTIONS.map((option) => (
                          <option key={option.label} value={option.value || ""}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Listener Pronouns */}
                    <div className="flex flex-col gap-1">
                      <label className="text-sm text-gray-600">
                        Listener Pronouns
                      </label>
                      <select
                        value={listenerPronouns || ""}
                        onChange={(e) =>
                          setListenerPronouns(e.target.value || null)
                        }
                        className="p-2 border rounded-md"
                      >
                        {PRONOUN_OPTIONS.map((option) => (
                          <option key={option.label} value={option.value || ""}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Formality Level */}
                    <div className="flex flex-col gap-1">
                      <label className="text-sm text-gray-600">
                        Formality Level
                      </label>
                      <select
                        value={formalityLevel}
                        onChange={(e) => setFormalityLevel(e.target.value)}
                        className="p-2 border rounded-md"
                      >
                        {Object.entries(FORMALITY_LEVELS).map(
                          ([key, value]) => (
                            <option key={key} value={key}>
                              {value}
                            </option>
                          )
                        )}
                      </select>
                    </div>

                    {/* Reset Button */}
                    <div className="flex flex-col justify-end">
                      <button
                        type="button"
                        onClick={resetAdvancedSettings}
                        className="p-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
                      >
                        Reset Settings
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={handleSubmit}
                className="mt-4 w-full bg-blue-500 text-white p-2 rounded"
                disabled={
                  translating || charCount === 0 || charCount > CHARACTER_LIMIT
                }
              >
                {translating ? "Translating..." : "Translate"}
              </button>
            </div>

            {/* Switch Languages Button - Desktop Only */}
            <div className="hidden lg:flex items-center justify-center">
              <button
                className="p-2 hover:bg-gray-100 rounded-full text-gray-600"
                onClick={switchLanguages}
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>

            {/* Output Side */}
            <div className="w-full lg:w-1/2 flex flex-col">
              {/* Desktop Language Selection */}
              <div className="hidden lg:flex items-center justify-between bg-white p-3 rounded-lg shadow-sm mb-4">
                <button
                  className="text-blue-500 font-medium"
                  onClick={() => openLanguageModal("target")}
                >
                  {targetLang.name} {selectedDialect.target}
                </button>
                {dialectsData[targetLang.code] && (
                  <div className="relative">
                    <button
                      className="text-gray-600 text-sm flex items-center gap-1"
                      onClick={() =>
                        setShowDialectDropdown(!showDialectDropdown)
                      }
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>

                    {showDialectDropdown && (
                      <div className="absolute right-0 mt-1 w-48 bg-white border rounded shadow-lg z-10 max-h-60 overflow-y-auto">
                        {/* Added option to reset dialect */}
                        <button
                          className={`block w-full text-left p-2 hover:bg-gray-100 ${
                            selectedDialect.target === "" ? "bg-blue-100" : ""
                          }`}
                          onClick={() => {
                            setSelectedDialect({
                              ...selectedDialect,
                              target: "",
                            });
                            setShowDialectDropdown(false);
                          }}
                        >
                          None (Reset dialect)
                        </button>
                        {dialectsData[targetLang.code].map((dialect, idx) => (
                          <button
                            key={idx}
                            className={`block w-full text-left p-2 hover:bg-gray-100 ${
                              selectedDialect.target === dialect
                                ? "bg-blue-100"
                                : ""
                            }`}
                            onClick={() => {
                              setSelectedDialect({
                                ...selectedDialect,
                                target: dialect,
                              });
                              setShowDialectDropdown(false);
                            }}
                          >
                            {dialect}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Translation Output */}
              <div className="bg-white rounded-lg shadow-sm p-4 flex-1 flex flex-col">
                {error ? (
                  <p className="text-red-500">{error}</p>
                ) : translation ? (
                  <div className="flex flex-col flex-1">
                    <p className="text-gray-700 text-lg flex-1">
                      {translation}
                    </p>
                    {romaji && (
                      <p className="text-gray-500 text-sm mt-2">{romaji}</p>
                    )}
                    <div className="mt-4 flex items-center gap-2">
                      <button
                        className="p-2 hover:bg-gray-100 rounded-full text-gray-600"
                        onClick={() =>
                          handleAudioClick(
                            translation,
                            targetLang.code,
                            false,
                            romaji
                          )
                        }
                        disabled={isOutputAudioLoading}
                        title="Listen to translation"
                      >
                        {isOutputAudioLoading ? (
                          <RefreshCw className="w-5 h-5 animate-spin" />
                        ) : (
                          <Volume2 className="w-5 h-5" />
                        )}
                      </button>
                      <button
                        className="p-2 hover:bg-gray-100 rounded-full text-gray-600"
                        onClick={handleCopyText}
                        title="Copy translation"
                      >
                        <Copy className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-400 text-lg flex-1 flex items-center justify-center">
                    Translation will appear here
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedLayout>
  );
}
