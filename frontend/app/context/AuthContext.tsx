'use client';
 
import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
 
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const TOKEN_KEY = 'turpoint_token';
const MODE_KEY = 'turpoint_mode';
 
export interface AuthUser {
  id: number;
  name: string;
  email: string;
  created_at?: string;
}
 
export interface OperatorProfile {
  id: number;
  user_id: number;
  name: string;
  description?: string | null;
  languages?: string | null;
  photo_url?: string | null;
  vehicle_features?: string | null;
  rating?: number | null;
}
 
type Mode = 'traveler' | 'operator';
 
interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  operatorProfile: OperatorProfile | null;
  mode: Mode;
  loading: boolean;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
  setMode: (mode: Mode) => void;
  refreshOperatorProfile: () => Promise<void>;
}
 
const AuthContext = createContext<AuthContextValue | undefined>(undefined);
 
export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [operatorProfile, setOperatorProfile] = useState<OperatorProfile | null>(null);
  const [mode, setModeState] = useState<Mode>('traveler');
  const [loading, setLoading] = useState(true);
 
  const fetchOperatorProfile = useCallback((activeToken: string) => {
    return fetch(`${API_URL}/api/operators/me`, {
      headers: { Authorization: `Bearer ${activeToken}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((op) => {
        setOperatorProfile(op);
        // Fixed: a stored 'operator' mode from localStorage was being
        // applied before this fetch resolved, and never corrected if it
        // came back null - so a tampered/stale localStorage value could
        // leave the UI in operator mode with no real profile behind it.
        if (!op) {
          localStorage.setItem(MODE_KEY, 'traveler');
          setModeState('traveler');
        }
      })
      .catch(() => setOperatorProfile(null));
  }, []);
 
  // On first load: validate any stored token against the backend (never
  // trust it blindly), then separately check whether this account has an
  // operator profile at all — a 404 there just means "traveler only",
  // not an error.
  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_KEY);
    const storedMode = localStorage.getItem(MODE_KEY);
 
    if (!stored) {
      // No session at all - can't be in operator mode with nothing to
      // back it. Correct it here too, not just in fetchOperatorProfile.
      if (storedMode === 'operator') {
        localStorage.setItem(MODE_KEY, 'traveler');
      }
      setLoading(false);
      return;
    }
 
    if (storedMode === 'operator') setModeState('operator');
    fetch(`${API_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${stored}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error('invalid session');
        return r.json();
      })
      .then(async (data) => {
        setToken(stored);
        setUser(data.user);
        await fetchOperatorProfile(stored);
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
      })
      .finally(() => setLoading(false));
  }, [fetchOperatorProfile]);
 
  const login = (newToken: string, newUser: AuthUser) => {
    localStorage.setItem(TOKEN_KEY, newToken);
    setToken(newToken);
    setUser(newUser);
    fetchOperatorProfile(newToken);
  };
 
  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(MODE_KEY);
    setToken(null);
    setUser(null);
    setOperatorProfile(null);
    setModeState('traveler');
  };
 
  // Only meaningful when an operator profile exists — you can't switch
  // into operator mode without one, no matter what's in localStorage.
  const setMode = (newMode: Mode) => {
    if (newMode === 'operator' && !operatorProfile) return;
    localStorage.setItem(MODE_KEY, newMode);
    setModeState(newMode);
  };
 
  const refreshOperatorProfile = async () => {
    if (token) await fetchOperatorProfile(token);
  };
 
  return (
    <AuthContext.Provider
      value={{ user, token, operatorProfile, mode, loading, login, logout, setMode, refreshOperatorProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}
 
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
 
// Drop this into any page that should require login — e.g. the booking
// flow in Task 19. Redirects to /login if the session check finishes
// and there's no user; renders nothing while the check is in flight.
export function useRequireAuth() {
  const { user, loading } = useAuth();
  useEffect(() => {
    if (!loading && !user && typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }, [loading, user]);
  return { user, loading };
}