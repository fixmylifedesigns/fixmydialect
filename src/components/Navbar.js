// src/components/Navbar.js
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { AuthModal } from "@/packages/firebase-auth";
import { logOut } from "@/packages/firebase/auth";
import { LogOut, Menu, X } from "lucide-react";
import { useState } from "react";

export default function Navbar() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalView, setAuthModalView] = useState("signin");
  const handleLogout = async () => {
    try {
      await logOut();
      router.push("/");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

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
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex-shrink-0">
            <Link href="/" className="text-xl font-bold text-blue-600">
              TranslationApp
            </Link>
          </div>

          {/* Desktop menu */}
          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              <>
                <Link
                  href="/dashboard"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Dashboard
                </Link>
                <Link
                  href="/account"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Account
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-gray-600 hover:text-gray-900 cursor-pointer flex items-center px-3 py-2 rounded-md text-sm font-medium"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    openAuthModal("signin");
                    setIsMenuOpen(false);
                  }}
                  className="text-foreground/70 hover:text-foreground px-3 py-2 rounded-md text-sm font-medium"
                >
                  Login
                </button>
                <button
                  onClick={() => {
                    openAuthModal("signup");
                    setIsMenuOpen(false);
                  }}
                  className="bg-blue-600 text-white hover:bg-blue-700 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Sign Up
                </button>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-600/70 hover:text-gray-800 cursor-pointer"
            >
              {isMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden border-t border-black/10 ">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {user ? (
              <>
                <Link
                  href="/dashboard"
                  className="text-gray-600 block px-3 py-2 rounded-md text-base font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Dashboard
                </Link>
                <Link
                  href="/account"
                  className="text-gray-600 block px-3 py-2 rounded-md text-base font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Account
                </Link>
                <button
                  onClick={() => {
                    handleLogout();
                    setIsMenuOpen(false);
                  }}
                  className="text-gray-600 flex items-center w-full text-left px-3 py-2 rounded-md text-base font-medium cursor-pointer"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    openAuthModal("signin");
                    setIsMenuOpen(false);
                  }}
                  className="text-foreground block px-3 py-2 rounded-md text-base font-medium"
                >
                  Login
                </button>
                <button
                  onClick={() => {
                    openAuthModal("signup");
                    setIsMenuOpen(false);
                  }}
                  className="text-foreground block px-3 py-2 rounded-md text-base font-medium"
                >
                  Sign Up
                </button>
              </>
            )}
          </div>
        </div>
      )}
      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialView={authModalView}
      />
    </nav>
  );
}
