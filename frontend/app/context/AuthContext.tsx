'use client';
 
import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
 
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const TOKEN_KEY = 'turpoint_token';
const MODE_KEY = 'turpoint_mode';
 
export interface AuthUser {
  id: number;
  name: string;
  email: string;
  id_number?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;            // E.164, e.g. +994501234567
  country?: string | null;          // ISO 3166-1 alpha-2
  preferred_language?: 'az' | 'en' | 'ru' | null;
  photo_url?: string | null;
  account_type: 'traveler' | 'operator';
  password_changed_at?: string | null;
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
  phone?: string | null;
  phone_verified?: number | null;
  instagram?: string | null;
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
  // Replace the cached user after an account-settings change that doesn't
  // issue a new token (e.g. a photo upload).
  updateUser: (user: AuthUser) => void;
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
      })
      .catch(() => setOperatorProfile(null));
  }, []);
 
  // On first load, validate the stored token and derive the view mode from
  // the saved account type. The local mode preference never grants operator
  // privileges to traveler accounts.
  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_KEY);
    const storedMode = localStorage.getItem(MODE_KEY);
 
    if (!stored) {
      // No session at all - can't be in operator mode with nothing to
      // back it.
      if (storedMode === 'operator') {
        localStorage.setItem(MODE_KEY, 'traveler');
      }
      setLoading(false);
      return;
    }
 
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
        const mode: Mode = data.user.account_type === 'operator' && storedMode !== 'traveler' ? 'operator' : 'traveler';
        localStorage.setItem(MODE_KEY, mode);
        setModeState(mode);
        await fetchOperatorProfile(stored);
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(MODE_KEY);
        setModeState('traveler');
      })
      .finally(() => setLoading(false));
  }, [fetchOperatorProfile]);
 
  const login = (newToken: string, newUser: AuthUser) => {
    localStorage.setItem(TOKEN_KEY, newToken);
    const initialMode: Mode = newUser.account_type === 'operator' ? 'operator' : 'traveler';
    localStorage.setItem(MODE_KEY, initialMode);
    setToken(newToken);
    setUser(newUser);
    setOperatorProfile(null);
    setModeState(initialMode);
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
 
  // Only an operator account can enter operator mode. Its initial profile
  // setup is also part of that mode, before an operator profile exists.
  const setMode = (newMode: Mode) => {
    if (newMode === 'operator' && user?.account_type !== 'operator') return;
    localStorage.setItem(MODE_KEY, newMode);
    setModeState(newMode);
  };
 
  const refreshOperatorProfile = async () => {
    if (token) await fetchOperatorProfile(token);
  };
 
  return (
    <AuthContext.Provider
      value={{ user, token, operatorProfile, mode, loading, login, logout, updateUser: setUser, setMode, refreshOperatorProfile }}
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
// Carries the page the traveler was actually trying to reach as ?next=,
// so /login can send them back to (say) the booking they were mid-flow on
// instead of dumping them on the homepage after signing in - see
// login/page.tsx's read of that param.
export function useRequireAuth() {
  const { user, loading } = useAuth();
  useEffect(() => {
    if (!loading && !user && typeof window !== 'undefined') {
      const next = window.location.pathname + window.location.search;
      window.location.href = `/login?next=${encodeURIComponent(next)}`;
    }
  }, [loading, user]);
  return { user, loading };
}
