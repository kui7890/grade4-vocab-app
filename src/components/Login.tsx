import { useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { friendlyError } from "../lib/api";
import { isSupabaseConfigured } from "../lib/supabase";
import AdminPanel from "./AdminPanel";

// 로그인 / 회원가입 화면 (로그인 전에 표시)
export default function Login() {
  const { login, register } = useAuth();
  const [tab, setTab] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!username.trim() || !password) {
      setError("아이디와 비밀번호를 모두 입력하세요.");
      return;
    }

    setBusy(true);
    try {
      if (tab === "login") await login(username, password);
      else await register(username, password);
      // 성공하면 App이 자동으로 학습 화면으로 전환됩니다.
    } catch (err) {
      setError(friendlyError(err instanceof Error ? err.message : ""));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-wrap">
      <header className="header">
        <h1>4학년 교과 어휘 학습 앱</h1>
        <p>국어 · 사회 · 과학 핵심 어휘를 카드와 퀴즈로 익혀요</p>
      </header>

      {!isSupabaseConfigured && (
        <div className="notice" style={{ marginBottom: 12 }}>
          서버 접속 정보가 설정되지 않았습니다. 선생님께 문의하세요.
        </div>
      )}

      <div className="panel auth-card">
        <div className="button-row" role="tablist" style={{ margin: "0 0 20px" }}>
          <button
            className={`pill ${tab === "login" ? "active" : ""}`}
            onClick={() => {
              setTab("login");
              setError("");
            }}
            type="button"
          >
            로그인
          </button>
          <button
            className={`pill ${tab === "register" ? "active" : ""}`}
            onClick={() => {
              setTab("register");
              setError("");
            }}
            type="button"
          >
            회원가입
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <label className="field-label" htmlFor="username">
            아이디
          </label>
          <input
            id="username"
            className="text-input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="예: 김하늘"
            autoComplete="username"
          />

          <label className="field-label" htmlFor="password">
            비밀번호
          </label>
          <input
            id="password"
            className="text-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="4글자 이상"
            autoComplete={tab === "login" ? "current-password" : "new-password"}
          />

          {tab === "register" && (
            <p className="field-hint">아이디 2글자 이상, 비밀번호 4글자 이상으로 만들어요.</p>
          )}

          {error && <div className="notice">{error}</div>}

          <button className="btn" type="submit" disabled={busy} style={{ width: "100%", marginTop: 16 }}>
            {busy ? "잠시만요…" : tab === "login" ? "로그인" : "회원가입하고 시작하기"}
          </button>
        </form>
      </div>

      <div style={{ textAlign: "center", marginTop: 18 }}>
        <button className="link-btn" type="button" onClick={() => setAdminOpen(true)}>
          관리자 (선생님용)
        </button>
      </div>

      {adminOpen && <AdminPanel onClose={() => setAdminOpen(false)} />}
    </div>
  );
}
