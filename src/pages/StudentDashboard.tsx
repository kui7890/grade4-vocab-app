import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { getStudentDashboard, type DashboardData } from "../lib/api";
import { VOCAB_DB } from "../data/vocab";
import type { Subject } from "../types";

const SUBJECTS: Subject[] = ["국어", "사회", "과학"];

// 각 교과 전체 단어 수 (VOCAB_DB 기준)
const TOTAL_BY_SUBJECT: Record<Subject, number> = {
  국어: VOCAB_DB.filter((w) => w.subject === "국어").length,
  사회: VOCAB_DB.filter((w) => w.subject === "사회").length,
  과학: VOCAB_DB.filter((w) => w.subject === "과학").length,
};

export default function StudentDashboard() {
  const { student } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!student) return;
    let active = true;
    setLoading(true);
    getStudentDashboard(student.id)
      .then((d) => {
        if (active) setData(d);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [student]);

  const accuracy = data && data.attempts > 0 ? Math.round((data.correct / data.attempts) * 100) : 0;

  // 최근 오답 word_id → VOCAB_DB 어휘로 변환
  const recentWrong = useMemo(
    () =>
      (data?.recent_wrong ?? [])
        .map((id) => VOCAB_DB.find((w) => w.id === id))
        .filter((w): w is NonNullable<typeof w> => Boolean(w)),
    [data]
  );

  // 성장 중심 피드백 문구
  const feedback = useMemo(() => {
    if (!data || data.attempts === 0) return "오늘 첫 퀴즈를 풀어 볼까요? 카드부터 천천히 익혀도 좋아요. 🌱";
    if (data.wrong_count > 0) return `복습할 어휘가 ${data.wrong_count}개 있어요. 오답 복습으로 한 번 더 익혀 봐요! 💪`;
    if (accuracy >= 80) return "정답률이 아주 좋아요! 새로운 어휘에도 도전해 봐요. 🎉";
    return "조금씩 좋아지고 있어요. 오늘도 꾸준히 연습해 봐요! 🙂";
  }, [data, accuracy]);

  return (
    <div className="dashboard">
      <div className="dash-greeting">
        <b>{student?.username}</b>님, 오늘도 어휘 학습을 시작해요!
      </div>
      <p className="dash-feedback">{feedback}</p>

      {/* 요약 통계 */}
      <div className="dash-stats">
        <div className="stat-card">
          <div className="stat-value">{data && data.attempts > 0 ? `${accuracy}%` : "-"}</div>
          <div className="stat-label">정답률</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{data?.attempts ?? 0}</div>
          <div className="stat-label">푼 문제</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{data?.wrong_count ?? 0}</div>
          <div className="stat-label">저장된 오답</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">🔥 {data?.streak ?? 0}일</div>
          <div className="stat-label">연속 학습</div>
        </div>
      </div>

      {/* 바로가기 */}
      <div className="dash-actions">
        <Link className="btn" to="/cards">📇 어휘 카드 보기</Link>
        <Link className="btn" to="/quiz">📝 퀴즈 풀기</Link>
        <Link className="btn secondary" to="/review">🔁 오답 복습</Link>
      </div>

      {/* 교과별 진행 상황 */}
      <section className="panel dash-section">
        <h2 className="dash-title">교과별 진행 상황</h2>
        <div className="subject-progress">
          {SUBJECTS.map((subj) => {
            const total = TOTAL_BY_SUBJECT[subj];
            const row = data?.subjects.find((s) => s.subject === subj);
            const mastered = row?.mastered_words ?? 0;
            const learned = row?.attempted_words ?? 0;
            const subjAcc = row && row.attempts > 0 ? Math.round((row.correct / row.attempts) * 100) : null;
            const pct = total > 0 ? Math.round((mastered / total) * 100) : 0;
            return (
              <div key={subj} className="subject-row">
                <div className="subject-head">
                  <span className="subject-name">{subj}</span>
                  <span className="subject-meta">
                    숙달 {mastered}/{total} · 학습 {learned}개 · 정답률 {subjAcc === null ? "-" : `${subjAcc}%`}
                  </span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 오답 노트 미리보기 */}
      <section className="panel dash-section">
        <h2 className="dash-title">최근 오답 노트</h2>
        {loading ? (
          <p className="dash-muted">불러오는 중…</p>
        ) : recentWrong.length === 0 ? (
          <p className="dash-muted">
            아직 저장된 오답이 없어요. 퀴즈에서 틀린 어휘가 여기에 모여요. 🙂
          </p>
        ) : (
          <>
            <ul className="recent-wrong">
              {recentWrong.map((w) => (
                <li key={w.id}>
                  <span className="rw-emoji">{w.image_url}</span>
                  <span className="rw-word">{w.word}</span>
                  <span className="rw-meaning">{w.easy_meaning}</span>
                </li>
              ))}
            </ul>
            <div className="dash-actions" style={{ marginTop: 14 }}>
              <Link className="btn success" to="/review">오답 복습 시작</Link>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
