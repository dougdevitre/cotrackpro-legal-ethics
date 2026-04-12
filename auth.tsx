// @cotrackpro/auth v1.0.0
// Shared federated auth module for CoTrackPro sub-apps.
// Provides Clerk auth + user data from the main CoTrackPro API.
// Do not edit directly — updates are rolled out via scripts/rollout-auth.sh.

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import {
  ClerkProvider,
  useAuth,
  useUser,
  SignedIn,
  SignedOut,
} from "@clerk/clerk-react";

// ─── Config ──────────────────────────────────────────────────────────────────

/* eslint-disable @typescript-eslint/no-explicit-any */
const env = (import.meta as any).env ?? {};
/* eslint-enable @typescript-eslint/no-explicit-any */

const CLERK_KEY: string = env.VITE_CLERK_PUBLISHABLE_KEY ?? "";
const API_URL: string = env.VITE_COTRACKPRO_API_URL ?? "https://cotrackpro.com";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CoTrackProUser {
  userId: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  plan: string | null;
  tier: string | null;
  billing: string | null;
  access: Record<string, boolean>;
  subscriptionStatus: string;
  createdAt: string | null;
  updatedAt: string | null;
}

interface CoTrackProUserContext {
  isSignedIn: boolean;
  isLoading: boolean;
  user: CoTrackProUser | null;
  tier: string | null;
  access: Record<string, boolean>;
  clerkUser: ReturnType<typeof useUser>["user"];
  refresh: () => void;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const Ctx = createContext<CoTrackProUserContext>({
  isSignedIn: false,
  isLoading: true,
  user: null,
  tier: null,
  access: {},
  clerkUser: null,
  refresh: () => {},
});

// ─── Internal provider (runs inside ClerkProvider) ───────────────────────────

function UserDataProvider({ children }: { children: ReactNode }) {
  const { isSignedIn, isLoaded, getToken } = useAuth();
  const { user: clerkUser } = useUser();
  const [user, setUser] = useState<CoTrackProUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    if (!isSignedIn) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/user/me`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      if (res.ok) {
        setUser(await res.json());
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [isSignedIn, getToken]);

  useEffect(() => {
    if (isLoaded) fetchUser();
  }, [isLoaded, isSignedIn, fetchUser]);

  return (
    <Ctx.Provider
      value={{
        isSignedIn: !!isSignedIn,
        isLoading: !isLoaded || loading,
        user,
        tier: user?.tier ?? null,
        access: user?.access ?? {},
        clerkUser: clerkUser ?? null,
        refresh: fetchUser,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Wrap your app's root in this provider.
 * Auth is optional — the app renders immediately for all visitors.
 */
export function CoTrackProAuth({ children }: { children: ReactNode }) {
  if (!CLERK_KEY) {
    // No Clerk key configured — render without auth (dev/CI)
    return <>{children}</>;
  }

  return (
    <ClerkProvider publishableKey={CLERK_KEY}>
      <UserDataProvider>{children}</UserDataProvider>
    </ClerkProvider>
  );
}

/**
 * Access the authenticated user's CoTrackPro profile.
 * Returns { isSignedIn: false } when not logged in.
 */
export function useCoTrackProUser(): CoTrackProUserContext {
  return useContext(Ctx);
}

/**
 * Gate UI behind authentication.
 * Shows a sign-in prompt when the user is not logged in.
 */
export function RequireAuth({
  children,
  message = "Sign in to access this feature",
}: {
  children: ReactNode;
  message?: string;
}) {
  if (!CLERK_KEY) return <>{children}</>;

  return (
    <>
      <SignedIn>{children}</SignedIn>
      <SignedOut>
        <div style={{ textAlign: "center", padding: "2rem" }}>
          <p style={{ marginBottom: "1rem", color: "#94a3b8" }}>{message}</p>
          <a
            href={`${API_URL}/sign-in`}
            style={{
              display: "inline-block",
              padding: "0.625rem 1.5rem",
              backgroundColor: "#0ea5e9",
              color: "white",
              borderRadius: "0.75rem",
              textDecoration: "none",
              fontWeight: 500,
            }}
          >
            Sign In
          </a>
        </div>
      </SignedOut>
    </>
  );
}

/**
 * Gate UI behind a subscription tier or module access key.
 * Composes with RequireAuth — checks sign-in first.
 */
export function RequireTier({
  children,
  tier,
  access,
  fallback,
}: {
  children: ReactNode;
  tier?: "parent" | "professional";
  access?: string;
  fallback?: ReactNode;
}) {
  const { isSignedIn, isLoading, tier: userTier, access: userAccess } =
    useCoTrackProUser();

  if (!CLERK_KEY) return <>{children}</>;

  if (isLoading) {
    return (
      <div style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}>
        Loading…
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <RequireAuth>
        {children}
      </RequireAuth>
    );
  }

  // Check tier: professional is a superset of parent
  const tierOk =
    !tier ||
    userTier === tier ||
    (tier === "parent" && userTier === "professional");

  // Check specific module access
  const accessOk = !access || !!userAccess[access];

  if (tierOk && accessOk) {
    return <>{children}</>;
  }

  // Not authorized — show upgrade prompt
  if (fallback) return <>{fallback}</>;

  const upgradeTier = tier ?? "parent";
  return (
    <div style={{ textAlign: "center", padding: "2rem" }}>
      <p style={{ marginBottom: "0.5rem", color: "#94a3b8" }}>
        This feature requires a{" "}
        <strong style={{ textTransform: "capitalize" }}>{upgradeTier}</strong>{" "}
        plan.
      </p>
      <a
        href={`${API_URL}/billing?upgrade=${upgradeTier}`}
        style={{
          display: "inline-block",
          padding: "0.625rem 1.5rem",
          backgroundColor: "#0ea5e9",
          color: "white",
          borderRadius: "0.75rem",
          textDecoration: "none",
          fontWeight: 500,
        }}
      >
        Upgrade Now
      </a>
    </div>
  );
}
