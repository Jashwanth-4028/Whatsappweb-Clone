import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { api } from "../api";
import type { User } from "../types";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: { name: string; email: string; phone?: string; password: string }) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const bootstrap = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await api.get<User>("/auth/me");
        setUserState(res.data);
      } catch (_e) {
        localStorage.removeItem("token");
      } finally {
        setLoading(false);
      }
    };
    bootstrap().catch(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.post<{ token: string; user: User }>("/auth/login", { email, password });
    localStorage.setItem("token", res.data.token);
    setUserState(res.data.user);
  };

  const register = async (payload: { name: string; email: string; phone?: string; password: string }) => {
    const res = await api.post<{ token: string; user: User }>("/auth/register", payload);
    localStorage.setItem("token", res.data.token);
    setUserState(res.data.user);
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUserState(null);
  };

  const setUser = (updatedUser: User) => setUserState(updatedUser);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};
