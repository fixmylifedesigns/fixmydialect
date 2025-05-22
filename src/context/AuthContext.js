// src/context/AuthContext.js
"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChange } from "../packages/firebase/auth";
import { setUserData } from "../packages/firebase/firestore";
import { syncUserWithDatabase } from "@/utils/db-helpers";

const AuthContext = createContext({
  user: null, // Firebase auth user
  dbUser: null, // Prisma database user with subscription info
  loading: true,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [dbUser, setDbUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChange(async (authUser) => {
      setLoading(true);

      if (authUser) {
        // Update Firebase user in state
        setUser(authUser);

        // 1. First maintain compatibility with existing Firestore data storage
        try {
          await setUserData(authUser.uid, {
            email: authUser.email,
            displayName: authUser.displayName,
            photoURL: authUser.photoURL,
            lastLogin: new Date(),
          });
        } catch (error) {
          // Just log the error but continue - don't break the auth flow
          console.error("Error updating user data in Firestore:", error);
        }

        // 2. Now sync with Prisma database and store the returned database user
        try {
          const databaseUser = await syncUserWithDatabase(authUser);
          setDbUser(databaseUser);
        } catch (error) {
          console.error("Error syncing user with Prisma database:", error);
          // Don't prevent app from loading if DB sync fails
        }
      } else {
        setUser(null);
        setDbUser(null);
      }

      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  // Return both Firebase user and database user
  return (
    <AuthContext.Provider value={{ user, dbUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
