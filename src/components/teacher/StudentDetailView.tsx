import { useEffect, useState } from "react";
import { adminGetStudentDetail, friendlyError, type StudentDetail } from "../../lib/api";
import { accuracyText, formatDate, wordLabel } from "../../utils/wordLookup";

// 교사 대시보드 - 개별 학생 상세
interface Props {
  pin: string;
  studentId: string;
  onBack: () => void;
}

export default function StudentDetailView({ pin, studentId, onBack }: Props) {
  const [data, setData] = useState<StudentDetail | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    adminGetStudentDetail(pin, studentId)
      .then((d) => {
        if (active) setData(d);
      })
      .catch((err) => {
        if (active) setError(friendlyError(err instanceof Error ? err.message : ""));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [pin, studentId]);

  if (loading) return <p className="dash-muted">불러오는 중…</p>;
  if (error) return <div className="notice">{error}</div>;
  if (!data) return null;

  const p = data.profile;

  return (
    <div>
      <button className="link-btn" type="button" onClick={onBack} style={{ paddingLeft: 0 }}>
        ← 학생 목록으로
      </button>

      <h3 className="dash-title" style={{ marginTop: 10 }}>
        {p.username} <span className="muted">({p.anon_code ?? "-"})</span>
      </h3>

      {/* 요약 */}
      <div className="dash-stats">
        <div className="stat-card">
          <div className="stat-value">{accuracyText(p.correct, p.attempts)}</div>
          <div className="stat-label">정답률</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{p.attempts}</div>
          <div className="stat-label">푼 문제</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{p.wrong_count}</div>
          <div className="stat-label">저장된 오답</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{p.reviewed_count}</div>
          <div className="stat-label">복습 완료</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{p.mastered_words}</div>
          <div className="stat-label">숙달 어휘</div>
        </div>
      </div>

      <p className="dash-muted" style={{ marginBottom: 18 }}>
        가입일 {formatDate(p.created_at)} · 마지막 학습 {formatDate(p.last_active)}
      </p>

      {/* 교과별 성취 */}
      <section className="panel dash-section">
        <h3 className="dash-title">교과별 성취</h3>
        {data.subjects.length === 0 ? (
          <p className="dash-muted">아직 학습 기록이 없습니다.</p>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>교과</th>
                  <th className="num">정답률</th>
                  <th className="num">푼 문제</th>
                  <th className="num">학습 어휘</th>
                  <th className="num">숙달 어휘</th>
                </tr>
              </thead>
              <tbody>
                {data.subjects.map((s) => (
                  <tr key={s.subject}>
                    <td className="strong">{s.subject}</td>
                    <td className="num">{accuracyText(s.correct, s.attempts)}</td>
                    <td className="num">{s.attempts}</td>
                    <td className="num">{s.attempted_words}</td>
                    <td className="num">{s.mastered_words}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 단원별 취약 어휘 */}
      <section className="panel dash-section">
        <h3 className="dash-title">단원별 취약 영역</h3>
        {data.weak_units.length === 0 ? (
          <p className="dash-muted">틀린 문항이 없습니다.</p>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>교과</th>
                  <th>단원</th>
                  <th className="num">틀린 횟수</th>
                  <th className="num">출제</th>
                </tr>
              </thead>
              <tbody>
                {data.weak_units.map((u, i) => (
                  <tr key={`${u.subject}-${u.unit}-${i}`}>
                    <td>{u.subject}</td>
                    <td className="strong">{u.unit}</td>
                    <td className="num danger">{u.wrong_count}</td>
                    <td className="num">{u.attempts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 반복 오답 단어 */}
      <section className="panel dash-section">
        <h3 className="dash-title">반복 오답 어휘 (2회 이상)</h3>
        {data.repeat_words.length === 0 ? (
          <p className="dash-muted">반복해서 틀린 어휘가 없습니다.</p>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>어휘</th>
                  <th>교과</th>
                  <th className="num">틀림</th>
                  <th className="num">맞힘</th>
                  <th>상태</th>
                </tr>
              </thead>
              <tbody>
                {data.repeat_words.map((w) => (
                  <tr key={w.word_id}>
                    <td className="strong">{wordLabel(w.word_id)}</td>
                    <td>{w.subject}</td>
                    <td className="num danger">{w.wrong_count}</td>
                    <td className="num">{w.correct_count}</td>
                    <td>{w.status === "mastered" ? "숙달" : "연습 중"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 최근 학습 이력 */}
      <section className="panel dash-section">
        <h3 className="dash-title">최근 학습 이력</h3>
        {data.recent.length === 0 ? (
          <p className="dash-muted">아직 학습 기록이 없습니다.</p>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>어휘</th>
                  <th>교과 · 단원</th>
                  <th>유형</th>
                  <th>결과</th>
                  <th>일시</th>
                </tr>
              </thead>
              <tbody>
                {data.recent.map((r, i) => (
                  <tr key={`${r.word_id}-${r.created_at}-${i}`}>
                    <td className="strong">{wordLabel(r.word_id)}</td>
                    <td className="muted">
                      {r.subject}
                      {r.unit ? ` · ${r.unit}` : ""}
                    </td>
                    <td>{r.quiz_type === "meaning" ? "뜻 맞히기" : "빈칸 채우기"}</td>
                    <td className={r.is_correct ? "ok" : "danger"}>
                      {r.is_correct ? "정답" : "오답"}
                    </td>
                    <td className="muted">{formatDate(r.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
