"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

export type UserRole = "admin" | "viewer" | "guest" | null;

interface AuthContextType {
  user: User | null;
  role: UserRole;
  loading: boolean;
  isLoggingIn: boolean;
  loginError: string | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  isSandbox: boolean;
  loginSandbox: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  loading: true,
  isLoggingIn: false,
  loginError: null,
  login: async () => {},
  logout: async () => {},
  isSandbox: false,
  loginSandbox: () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>({
    uid: "sandbox_admin",
    email: "scoc2911@gmail.com",
    displayName: "SCOC Sandbox Admin",
    emailVerified: true,
    providerData: []
  } as any);
  const [role, setRole] = useState<UserRole>("admin");
  const [loading, setLoading] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isSandbox, setIsSandbox] = useState(true);

  useEffect(() => {
    // Force sandbox mode to be active by default in localStorage
    if (typeof window !== "undefined") {
      localStorage.setItem("scoc_sandbox", "true");
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setIsSandbox(false);
        if (currentUser.email === "scoc2911@gmail.com") {
          setRole("admin");
          try {
            const roleDocRef = doc(db, "userRoles", currentUser.uid);
            const roleDoc = await getDoc(roleDocRef);
            if (!roleDoc.exists()) {
              await setDoc(roleDocRef, {
                email: currentUser.email,
                role: "admin",
                displayName: currentUser.displayName || "SCOC Global Admin",
                createdAt: new Date().toISOString()
              });
            }
          } catch (error) {
            console.error("Failed to write primary admin roleDoc", error);
          }
        } else {
          try {
            const roleDocRef = doc(db, "userRoles", currentUser.uid);
            const roleDoc = await getDoc(roleDocRef);
            if (roleDoc.exists()) {
              const fetchedRole = roleDoc.data().role as UserRole;
              setRole(fetchedRole);
            } else {
              // Automatically assign the VIEWER (Read-Only) role by default for newly registered users
              await setDoc(roleDocRef, {
                email: currentUser.email,
                role: "viewer",
                displayName: currentUser.displayName || currentUser.email?.split("@")[0] || "New Worker",
                createdAt: new Date().toISOString()
              });
              setRole("viewer");
            }
          } catch (error) {
            console.error("Failed to fetch or assign user role", error);
            setRole("viewer");
          }
        }
      } else {
        // Fallback to local sandbox administrator
        if (typeof window !== "undefined") {
          localStorage.setItem("scoc_sandbox", "true");
        }
        setUser({
          uid: "sandbox_admin",
          email: "scoc2911@gmail.com",
          displayName: "SCOC Sandbox Admin",
          emailVerified: true,
          providerData: []
        } as any);
        setRole("admin");
        setIsSandbox(true);
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
      } else if (errorCode === "auth/unauthorized-domain" || error?.message?.includes("unauthorized-domain") || String(error).includes("unauthorized-domain")) {
        const currentDomain = typeof window !== "undefined" ? window.location.hostname : "";
        setLoginError(
          `Unauthorized Domain: Google Sign-In is blocked for this URL domain.\n\n` +
          `To fix this, please authorized this domain in your Firebase project:\n` +
          `1. Go to your Firebase Console: https://console.firebase.google.com/project/scoc-3a755/authentication/settings\n` +
          `2. Under the 'Authorized domains' section, click on 'Add domain'\n` +
          `3. Copy and add the following domains:\n` +
          `   • ais-dev-luphzcnetea7aedkn5z7nj-225614280164.asia-east1.run.app\n` +
          `   • ais-pre-luphzcnetea7aedkn5z7nj-225614280164.asia-east1.run.app\n` +
          `   • ${currentDomain || "the active URL domain"}\n` +
          `4. Click Save, return to this tab, and refresh/reload the page.`
        );
      } else if (error?.message?.includes("Pending promise")) {
        setLoginError("An active login request was pending. Please refresh this page if SCOC is stuck, or open the app in a new browser tab.");
      } else {
        setLoginError(error?.message || String(error));
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const loginSandbox = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("scoc_sandbox", "true");
    }
    setUser({
      uid: "sandbox_admin",
      email: "scoc2911@gmail.com",
      displayName: "SCOC Sandbox Admin",
      emailVerified: true,
      providerData: []
    } as any);
    setRole("admin");
    setIsSandbox(true);
    setLoginError(null);
    setLoading(false);
  };

  const logout = async () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("scoc_members");
      localStorage.removeItem("scoc_networks");
      localStorage.removeItem("scoc_ministries");
      localStorage.removeItem("scoc_events");
      localStorage.removeItem("scoc_attendance");
      localStorage.removeItem("scoc_auditLogs");
      localStorage.setItem("scoc_sandbox", "true");
    }
    setUser({
      uid: "sandbox_admin",
      email: "scoc2911@gmail.com",
      displayName: "SCOC Sandbox Admin",
      emailVerified: true,
      providerData: []
    } as any);
    setRole("admin");
    setIsSandbox(true);
    setLoginError(null);
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, isLoggingIn, loginError, login, logout, isSandbox, loginSandbox }}>
      {children}
    </AuthContext.Provider>
  );
}
