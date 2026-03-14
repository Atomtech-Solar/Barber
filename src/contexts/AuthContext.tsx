import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
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
    company_name?: string;
    company_slug?: string;
  }) => Promise<{ error: unknown }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);
const PROFILE_LOAD_TIMEOUT_MS = 8000;
const LOCK_RETRY_DELAY_MS = 600;
const MAX_LOCK_RETRIES = 2;

function isLockError(err: unknown): boolean {
  if (!err) return false;
  const msg =
    err instanceof Error
      ? err.message
      : (err as { message?: string })?.message ?? String(err);
  return msg.includes("Lock broken") || msg.includes("AbortError");
}

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
  const lastSessionId = useRef<string | null>(null);

  const loadProfile = useCallback(
    async (userId: string, retryCount = 0): Promise<void> => {
      setProfileLoadError(false);
      const { data, error } = await authService.getProfile(userId);
      if (error && isLockError(error) && retryCount < MAX_LOCK_RETRIES) {
        await new Promise((r) => setTimeout(r, LOCK_RETRY_DELAY_MS));
        return loadProfile(userId, retryCount + 1);
      }
      if (error) {
        if (import.meta.env.DEV && !isLockError(error)) {
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
      setProfile(data);
    },
    []
  );

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
      lastSessionId.current = nextSession?.access_token ?? null;

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

    const init = async (retryCount = 0) => {
      try {
        const { data, error } = await authService.getSession();
        if (error && isLockError(error) && retryCount < MAX_LOCK_RETRIES) {
          await new Promise((r) => setTimeout(r, LOCK_RETRY_DELAY_MS));
          return init(retryCount + 1);
        }
        if (error && import.meta.env.DEV && !isLockError(error)) {
          console.error("[AuthContext] Erro ao obter sessão:", error);
        }
        if (!mounted) return;
        await syncFromSession(data.session ?? null);
      } catch (error) {
        if (isLockError(error) && retryCount < MAX_LOCK_RETRIES) {
          await new Promise((r) => setTimeout(r, LOCK_RETRY_DELAY_MS));
          return init(retryCount + 1);
        }
        if (import.meta.env.DEV && !isLockError(error)) {
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
    } = authService.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      // Evita re-render global em renovações automáticas de token
      if (event === "TOKEN_REFRESHED") return;
      // Ignora INITIAL_SESSION quando já temos sessão válida hidratada
      if (event === "INITIAL_SESSION" && lastSessionId.current) return;

      const currentSessionId = session?.access_token ?? null;
      // Evita updates duplicados com a mesma sessão
      if (lastSessionId.current === currentSessionId) return;

      // Só reage a mudanças reais de autenticação
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "INITIAL_SESSION") return;
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
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await authService.signIn({ email, password });
    return { error };
  };

  const signUp = async (params: {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
    company_name?: string;
    company_slug?: string;
  }) => {
    const { error } = await authService.signUp({
      ...params,
      role: "client",
    });
    return { error };
  };

  const signOut = async () => {
    await authService.signOut();
    lastSessionId.current = null;
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
