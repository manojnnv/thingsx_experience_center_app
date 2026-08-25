"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { login, checkAuth, getAuthStatus } from "@/app/services/auth/auth";

// ===========================================
// Types
// ===========================================

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// ===========================================
// Context
// ===========================================

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  isLoading: true,
  error: null,
});

// ===========================================
// Provider
// ===========================================

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function initAuth() {
      try {
        // Check if already authenticated
        if (checkAuth()) {
          console.log("✅ Already authenticated");
          setIsAuthenticated(true);
          setIsLoading(false);
          return;
        }

        // Attempt auto-login
        console.log("🔐 Initiating auto-login...");
        const success = await login();
        
        if (success) {
          setIsAuthenticated(true);
          setError(null);
        } else {
          setError("Authentication failed");
        }
      } catch (err) {
        console.error("❌ Auth initialization error:", err);
        setError("Authentication error");
      } finally {
        setIsLoading(false);
      }
    }

    initAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, error }}>
      {isLoading ? (
        <div style={{
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0a0a0a",
          color: "#666",
        }}>
          <span>Initializing…</span>
        </div>
      ) : children}
    </AuthContext.Provider>
  );
}

// ===========================================
// Hook
// ===========================================

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export default AuthProvider;
