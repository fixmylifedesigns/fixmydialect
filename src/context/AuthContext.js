// src/context/AuthContext.js
"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChange } from "../packages/firebase/auth";
import { setUserData } from "../packages/firebase/firestore";

const AuthContext = createContext({
  user: null,
  loading: true,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // In src/context/AuthContext.js file
  // Update the useEffect that handles auth state changes

  useEffect(() => {
    const unsubscribe = onAuthStateChange(async (authUser) => {
      setLoading(true);

      if (authUser) {
        // Update user in state
        setUser(authUser);

        // Try to store user data in Firestore, but don't break if it fails
        try {
          await setUserData(authUser.uid, {
            email: authUser.email,
            displayName: authUser.displayName,
            photoURL: authUser.photoURL,
            lastLogin: new Date(),
          });
        } catch (error) {
          // Just log the error but continue - don't break the auth flow
          console.error("Error updating user data:", error);
          // This is optional - you can set a state flag if you want to show a warning somewhere
          // setFirestoreError(true);
        }
      } else {
        setUser(null);
      }

      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
