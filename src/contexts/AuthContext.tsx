import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { authService } from "@/services/auth.service";
import type { User } from "@supabase/supabase-js";
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

    const init = async () => {
      // getUser() valida a sessão no servidor (getSession só usa cache local)
      const { data: { user: authUser } } = await authService.getUser();
      if (!mounted) return;
      setUser(authUser ?? null);
      if (authUser?.id) {
        await loadProfile(authUser.id);
      }
      if (mounted) setIsLoading(false);
    };

    init();

    const {
      data: { subscription },
    } = authService.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      setIsLoading(true);
      setUser(session?.user ?? null);
      if (session?.user?.id) {
        await loadProfile(session.user.id);
      } else {
        setProfile(null);
        setProfileLoadError(false);
      }
      if (mounted) setIsLoading(false);
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
