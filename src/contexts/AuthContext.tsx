import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { authService } from "@/services/auth.service";
import type { Session, User } from "@supabase/supabase-js";
import type { Profile } from "@/types/database.types";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  initialized: boolean;
  /** Compatibilidade: equivalente a !initialized */
  isLoading: boolean;
  isAuthenticated: boolean;
  /** Indica falha ao carregar perfil (ex: RLS, rede). Permite UI de retry/erro. */
  profileLoadError: boolean;
  signIn: (email: string, password: string) => Promise<{ error: unknown }>;
  signUp: (params: {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
  }) => Promise<{ error: unknown }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);
const PROFILE_LOAD_TIMEOUT_MS = 8000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`${label} timed out`)), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeoutId) clearTimeout(timeoutId);
  }) as Promise<T>;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [profileLoadError, setProfileLoadError] = useState(false);

  const loadProfile = useCallback(async (userId: string) => {
    setProfileLoadError(false);
    const { data, error } = await authService.getProfile(userId);
    if (error) {
      if (import.meta.env.DEV) {
        console.error("[AuthContext] Erro ao carregar perfil:", error);
      }
      setProfile(null);
      setProfileLoadError(true);
      return;
    }
    if (!data) {
      if (import.meta.env.DEV) {
        console.warn("[AuthContext] Perfil não encontrado para userId:", userId);
      }
      setProfile(null);
      setProfileLoadError(true);
      return;
    }
    // Owner não exige company_id; outros roles podem ter
    setProfile(data);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      await loadProfile(user.id);
    }
  }, [user?.id, loadProfile]);

  useEffect(() => {
    let mounted = true;

    const syncFromSession = async (nextSession: Session | null) => {
      if (!mounted) return;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (nextSession?.user?.id) {
        try {
          await withTimeout(
            loadProfile(nextSession.user.id),
            PROFILE_LOAD_TIMEOUT_MS,
            "Auth profile load"
          );
        } catch (error) {
          if (import.meta.env.DEV) {
            console.error("[AuthContext] Timeout/erro ao carregar perfil:", error);
          }
          if (!mounted) return;
          setProfile(null);
          setProfileLoadError(true);
        }
      } else {
        setProfile(null);
        setProfileLoadError(false);
      }
    };

    const init = async () => {
      try {
        const { data, error } = await authService.getSession();
        if (error && import.meta.env.DEV) {
          console.error("[AuthContext] Erro ao obter sessão:", error);
        }
        if (!mounted) return;
        await syncFromSession(data.session ?? null);
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error("[AuthContext] Falha na inicialização da sessão:", error);
        }
        if (!mounted) return;
        setSession(null);
        setUser(null);
        setProfile(null);
        setProfileLoadError(false);
      } finally {
        if (mounted) setInitialized(true);
      }
    };

    void init();

    const {
      data: { subscription },
    } = authService.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      try {
        await syncFromSession(session);
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error("[AuthContext] Erro no onAuthStateChange:", error);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signIn = async (email: string, password: string) => {
    const { error } = await authService.signIn({ email, password });
    return { error };
  };

  const signUp = async (params: {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
  }) => {
    const { error } = await authService.signUp({
      ...params,
      role: "client",
    });
    return { error };
  };

  const signOut = async () => {
    await authService.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
    setProfileLoadError(false);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        initialized,
        isLoading: !initialized,
        isAuthenticated: !!user,
        profileLoadError,
        signIn,
        signUp,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
