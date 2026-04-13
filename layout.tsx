// @cotrackpro/layout v1.0.0
// Shared branding layout for CoTrackPro sub-apps.
// Provides consistent nav bar, footer, and dark theme.
// Do not edit directly — updates are rolled out via scripts/rollout-auth.sh.

import React, { useState, type ReactNode } from "react";
import { useCoTrackProUser } from "./auth";

/* eslint-disable @typescript-eslint/no-explicit-any */
const env = (import.meta as any).env ?? {};
/* eslint-enable @typescript-eslint/no-explicit-any */

const API_URL: string = env.VITE_COTRACKPRO_API_URL ?? "https://cotrackpro.com";

// ─── Logo ───────────────────────────────────────────────────────────────────

function CoTrackProLogo() {
  return (
    <a
      href={API_URL}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        textDecoration: "none",
        color: "white",
      }}
    >
      <img
        src={`${API_URL}/logo.jpg`}
        alt="CoTrackPro"
        width={32}
        height={32}
        style={{ borderRadius: "0.5rem", objectFit: "cover" }}
      />
      <span style={{ fontWeight: 700, fontSize: "1.125rem", letterSpacing: "-0.01em" }}>
        CoTrackPro
      </span>
    </a>
  );
}

// ─── Nav Bar ────────────────────────────────────────────────────────────────

function NavBar() {
  const { isSignedIn, tier, clerkUser } = useCoTrackProUser();
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinks = [
    { href: `${API_URL}/dashboard`, label: "Dashboard" },
    { href: `${API_URL}/library`, label: "Library" },
    { href: `${API_URL}/billing`, label: "Billing" },
  ];

  return (
    <nav
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0.75rem 1.5rem",
        backgroundColor: "rgba(15, 23, 42, 0.95)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <CoTrackProLogo />

      {/* Desktop nav */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "1.5rem",
        }}
      >
        {navLinks.map((link) => (
          <a
            key={link.href}
            href={link.href}
            style={{
              fontSize: "0.875rem",
              fontWeight: 500,
              color: "#94a3b8",
              textDecoration: "none",
              transition: "color 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#38bdf8")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#94a3b8")}
          >
            {link.label}
          </a>
        ))}

        {isSignedIn ? (
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.375rem 0.75rem",
                borderRadius: "0.75rem",
                border: "1px solid rgba(255,255,255,0.1)",
                backgroundColor: "rgba(255,255,255,0.03)",
                color: "white",
                fontSize: "0.75rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <span
                style={{
                  width: "1.5rem",
                  height: "1.5rem",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #0284c7, #0ea5e9)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.625rem",
                  fontWeight: 700,
                  color: "white",
                }}
              >
                {clerkUser?.firstName?.[0] ?? "U"}
              </span>
              {clerkUser?.firstName ?? "Account"}
            </button>
            {menuOpen && (
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: "calc(100% + 0.5rem)",
                  minWidth: "12rem",
                  backgroundColor: "#1e293b",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "0.75rem",
                  padding: "0.5rem",
                  boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
                }}
              >
                {tier && (
                  <div
                    style={{
                      padding: "0.5rem 0.75rem",
                      fontSize: "0.6875rem",
                      color: "#64748b",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      fontWeight: 700,
                    }}
                  >
                    {tier} plan
                  </div>
                )}
                <a
                  href={`${API_URL}/dashboard`}
                  style={{
                    display: "block",
                    padding: "0.5rem 0.75rem",
                    fontSize: "0.8125rem",
                    color: "#e2e8f0",
                    textDecoration: "none",
                    borderRadius: "0.5rem",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.05)")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                >
                  Dashboard
                </a>
                <a
                  href={`${API_URL}/billing`}
                  style={{
                    display: "block",
                    padding: "0.5rem 0.75rem",
                    fontSize: "0.8125rem",
                    color: "#e2e8f0",
                    textDecoration: "none",
                    borderRadius: "0.5rem",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.05)")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                >
                  Manage Subscription
                </a>
              </div>
            )}
          </div>
        ) : (
          <a
            href={`${API_URL}/sign-in`}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "0.75rem",
              background: "linear-gradient(135deg, #0284c7, #0ea5e9)",
              color: "white",
              fontSize: "0.8125rem",
              fontWeight: 600,
              textDecoration: "none",
              transition: "box-shadow 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 0 20px rgba(14,165,233,0.35)")}
            onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
          >
            Sign In
          </a>
        )}
      </div>
    </nav>
  );
}

// ─── Footer ─────────────────────────────────────────────────────────────────

function Footer() {
  const footerLinks = [
    { href: `${API_URL}/dashboard`, label: "Dashboard" },
    { href: `${API_URL}/library`, label: "Library" },
    { href: `${API_URL}/billing`, label: "Billing" },
    { href: `${API_URL}/privacy`, label: "Privacy" },
    { href: `${API_URL}/contact`, label: "Contact" },
  ];

  return (
    <footer
      style={{
        borderTop: "1px solid rgba(255,255,255,0.06)",
        padding: "2rem 1.5rem",
        marginTop: "auto",
      }}
    >
      <div
        style={{
          maxWidth: "64rem",
          margin: "0 auto",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
        }}
      >
        <CoTrackProLogo />

        <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
          {footerLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              style={{
                fontSize: "0.75rem",
                color: "#64748b",
                textDecoration: "none",
                transition: "color 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#94a3b8")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#64748b")}
            >
              {link.label}
            </a>
          ))}
        </div>

        <p style={{ fontSize: "0.6875rem", color: "#334155" }}>
          &copy; {new Date().getFullYear()} CoTrackPro. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

// ─── Layout wrapper ─────────────────────────────────────────────────────────

/**
 * Wraps any sub-app content with the shared CoTrackPro nav bar, footer,
 * and dark theme background. Use alongside <CoTrackProAuth>.
 *
 * Usage:
 *   <CoTrackProAuth>
 *     <CoTrackProLayout>
 *       <App />
 *     </CoTrackProLayout>
 *   </CoTrackProAuth>
 */
export function CoTrackProLayout({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#0a0f1e",
        color: "#e2e8f0",
        fontFamily:
          "'Geist Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      <NavBar />
      <main style={{ flex: 1, padding: "1.5rem", maxWidth: "72rem", width: "100%", margin: "0 auto" }}>
        {children}
      </main>
      <Footer />
    </div>
  );
}
