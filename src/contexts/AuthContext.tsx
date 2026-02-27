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
  user: User | null;
  profile: Profile | null;
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
const AUTH_INIT_TIMEOUT_MS = 10000;
const PROFILE_LOAD_TIMEOUT_MS = 8000;
const LOADING_FAILSAFE_MS = 12000;

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
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
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

    const syncFromSession = async (session: Session | null) => {
      if (!mounted) return;
      setUser(session?.user ?? null);

      if (session?.user?.id) {
        try {
          await withTimeout(
            loadProfile(session.user.id),
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
      setIsLoading(true);
      try {
        const { data, error } = await withTimeout(
          authService.getSession(),
          AUTH_INIT_TIMEOUT_MS,
          "Auth session init"
        );
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
        setUser(null);
        setProfile(null);
        setProfileLoadError(false);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    void init();

    const {
      data: { subscription },
    } = authService.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      setIsLoading(true);
      try {
        await syncFromSession(session);
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error("[AuthContext] Erro no onAuthStateChange:", error);
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  useEffect(() => {
    if (!isLoading) return;
    const timeoutId = setTimeout(() => {
      if (import.meta.env.DEV) {
        console.warn("[AuthContext] Fail-safe: finalizando loading de autenticação.");
      }
      setIsLoading(false);
    }, LOADING_FAILSAFE_MS);

    return () => clearTimeout(timeoutId);
  }, [isLoading]);

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
    setUser(null);
    setProfile(null);
    setProfileLoadError(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isLoading,
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
