import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { loginStudent, registerStudent, type Student } from "../lib/api";

// 로그인 세션을 보관하는 localStorage 키
const SESSION_KEY = "grade4_student_v1";

interface AuthValue {
  student: Student | null;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

function readSession(): Student | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.id === "string" && typeof parsed.username === "string") {
      return { id: parsed.id, username: parsed.username };
    }
    return null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [student, setStudent] = useState<Student | null>(() => readSession());

  // 세션이 바뀌면 localStorage에 반영 (새로고침해도 로그인 유지)
  useEffect(() => {
    try {
      if (student) localStorage.setItem(SESSION_KEY, JSON.stringify(student));
      else localStorage.removeItem(SESSION_KEY);
    } catch {
      // 저장 실패는 무시
    }
  }, [student]);

  const login = useCallback(async (username: string, password: string) => {
    const s = await loginStudent(username, password);
    setStudent(s);
  }, []);

  const register = useCallback(async (username: string, password: string) => {
    const s = await registerStudent(username, password);
    setStudent(s); // 가입 후 바로 로그인 상태로
  }, []);

  const logout = useCallback(() => setStudent(null), []);

  const value = useMemo<AuthValue>(() => ({ student, login, register, logout }), [student, login, register, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
