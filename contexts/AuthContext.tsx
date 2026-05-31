"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

export type UserRole = "admin" | "viewer" | null;

interface AuthContextType {
  user: User | null;
  role: UserRole;
  loading: boolean;
  isLoggingIn: boolean;
  loginError: string | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  loading: true,
  isLoggingIn: false,
  loginError: null,
  login: async () => {},
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        if (currentUser.email === "scoc2911@gmail.com") {
          setRole("admin");
        } else {
          try {
            const roleDoc = await getDoc(doc(db, "userRoles", currentUser.uid));
            if (roleDoc.exists()) {
              setRole(roleDoc.data().role as UserRole);
            } else {
              setRole("viewer");
            }
          } catch (error) {
            console.error("Failed to fetch user role", error);
            setRole("viewer");
          }
        }
      } else {
        setRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    setLoginError(null);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error("Login attempt failed:", error);
      const errorCode = error?.code;
      if (errorCode === "auth/popup-blocked") {
        setLoginError(
          "Your browser blocked the sign-in popup. Please click the blocked-popup icon in your browser address bar and choose 'Always allow popups', or click SCOC's 'Open App' button in the top right to open in a new tab."
        );
      } else if (errorCode === "auth/cancelled-popup-request") {
        setLoginError("The sign-in popup was closed before completion. Please keep the Google account window open until authentication finishes.");
      } else if (error?.message?.includes("Pending promise")) {
        setLoginError("An active login request was pending. Please refresh this page if SCOC is stuck, or open the app in a new browser tab.");
      } else {
        setLoginError(error?.message || String(error));
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const logout = async () => {
    setLoginError(null);
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, isLoggingIn, loginError, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
