import { useState } from "react";
import { Link } from "react-router-dom";
import { adminGetOverview, friendlyError } from "../lib/api";
import { isSupabaseConfigured } from "../lib/supabase";
import OverviewTab from "../components/teacher/OverviewTab";
import StudentsTab from "../components/teacher/StudentsTab";
import StudentDetailView from "../components/teacher/StudentDetailView";
import WrongAnalysisTab from "../components/teacher/WrongAnalysisTab";
import AssignmentsTab from "../components/teacher/AssignmentsTab";
import ExportTab from "../components/teacher/ExportTab";

// 교사용 대시보드 (/teacher)
// PIN 확인 후 탭으로 전체 현황 / 학생별 현황을 본다.
// PIN은 화면 상태로만 들고 있고 저장하지 않는다 (새로고침하면 다시 입력).
type Tab = "overview" | "students" | "analysis" | "assignments" | "export";

const TABS: { value: Tab; label: string }[] = [
  { value: "overview", label: "📊 전체 현황" },
  { value: "students", label: "🧑‍🎓 학생별 현황" },
  { value: "analysis", label: "🔍 오답 분석" },
  { value: "assignments", label: "📋 학습 배정" },
  { value: "export", label: "📥 자료 내보내기" },
];

export default function TeacherDashboard() {
  const [pin, setPin] = useState("");
  const [authedPin, setAuthedPin] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // PIN 확인은 서버 함수를 한 번 호출해서 검증한다.
  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    if (!pin.trim()) {
      setError("PIN 번호를 입력하세요.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await adminGetOverview(pin);
      setAuthedPin(pin);
    } catch (err) {
      setError(friendlyError(err instanceof Error ? err.message : ""));
    } finally {
      setBusy(false);
    }
  }

  // ── PIN 입력 화면 ──
  if (!authedPin) {
    return (
      <div className="app">
        <div className="auth-wrap">
          <header className="header">
            <h1>교사용 대시보드</h1>
            <p>학생 학습 현황과 어휘 이해도를 확인해요</p>
          </header>

          {!isSupabaseConfigured && (
            <div className="notice" style={{ marginBottom: 12 }}>
              서버 접속 정보가 설정되지 않았습니다.
            </div>
          )}

          <div className="panel auth-card">
            <form onSubmit={handleUnlock}>
              <label className="field-label" htmlFor="pin">
                관리자 PIN 번호
              </label>
              <input
                id="pin"
                className="text-input"
                type="password"
                inputMode="numeric"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="PIN 번호 입력"
                autoComplete="off"
              />
              {error && <div className="notice">{error}</div>}
              <button className="btn" type="submit" disabled={busy} style={{ width: "100%", marginTop: 16 }}>
                {busy ? "확인 중…" : "확인"}
              </button>
            </form>
          </div>

          <div style={{ textAlign: "center", marginTop: 18 }}>
            <Link className="link-btn" to="/">
              ← 학생 화면으로
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── 대시보드 화면 ──
  return (
    <div className="app teacher">
      <header className="header">
        <div className="userbar">
          <span className="userbar-hi">교사용 대시보드</span>
          <Link className="btn secondary small" to="/">
            학생 화면으로
          </Link>
        </div>
        <h1>학습 현황 한눈에 보기</h1>
        <p>학생별 어휘 이해도와 오답 양상을 확인해요</p>
      </header>

      <nav className="button-row mode-tabs" aria-label="교사 메뉴">
        {TABS.map((t) => (
          <button
            key={t.value}
            className={`pill ${tab === t.value ? "active" : ""}`}
            type="button"
            onClick={() => {
              setTab(t.value);
              setSelectedStudent(null);
            }}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {selectedStudent ? (
        <StudentDetailView
          pin={authedPin}
          studentId={selectedStudent}
          onBack={() => setSelectedStudent(null)}
        />
      ) : tab === "overview" ? (
        <OverviewTab
          pin={authedPin}
          onSelectStudent={(id) => {
            setTab("students");
            setSelectedStudent(id);
          }}
        />
      ) : tab === "students" ? (
        <StudentsTab pin={authedPin} onSelectStudent={(id) => setSelectedStudent(id)} />
      ) : tab === "analysis" ? (
        <WrongAnalysisTab pin={authedPin} />
      ) : tab === "assignments" ? (
        <AssignmentsTab pin={authedPin} />
      ) : (
        <ExportTab pin={authedPin} />
      )}
    </div>
  );
}
