import { useEffect, useState } from "react";
import { adminGetOverview, friendlyError, type TeacherOverview } from "../../lib/api";
import { accuracyText, wordLabel } from "../../utils/wordLookup";

// 교사 대시보드 - 전체 현황
interface Props {
  pin: string;
  onSelectStudent: (studentId: string) => void;
}

export default function OverviewTab({ pin, onSelectStudent }: Props) {
  const [data, setData] = useState<TeacherOverview | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    adminGetOverview(pin)
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
  }, [pin]);

  if (loading) return <p className="dash-muted">불러오는 중…</p>;
  if (error) return <div className="notice">{error}</div>;
  if (!data) return null;

  return (
    <div>
      {/* 요약 지표 */}
      <div className="dash-stats">
        <div className="stat-card">
          <div className="stat-value">{data.student_count}</div>
          <div className="stat-label">전체 학생</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{accuracyText(data.correct, data.attempts)}</div>
          <div className="stat-label">평균 정답률</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{data.attempts}</div>
          <div className="stat-label">총 학습 횟수</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{data.active_7d}</div>
          <div className="stat-label">최근 7일 학습</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{data.wrong_total}</div>
          <div className="stat-label">저장된 오답</div>
        </div>
      </div>

      {/* 많이 틀린 단어 */}
      <section className="panel dash-section">
        <h3 className="dash-title">많이 틀린 단어</h3>
        {data.top_wrong_words.length === 0 ? (
          <p className="dash-muted">아직 오답 기록이 없습니다.</p>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>어휘</th>
                  <th>교과</th>
                  <th className="num">틀린 횟수</th>
                  <th className="num">출제</th>
                  <th className="num">학생 수</th>
                </tr>
              </thead>
              <tbody>
                {data.top_wrong_words.map((w) => (
                  <tr key={w.word_id}>
                    <td className="strong">{wordLabel(w.word_id)}</td>
                    <td>{w.subject}</td>
                    <td className="num danger">{w.wrong_count}</td>
                    <td className="num">{w.total}</td>
                    <td className="num">{w.student_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 도움이 필요한 학생 */}
      <section className="panel dash-section">
        <h3 className="dash-title">도움이 필요한 학생</h3>
        {data.need_help.length === 0 ? (
          <p className="dash-muted">아직 학습 기록이 있는 학생이 없습니다.</p>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>학생</th>
                  <th className="num">정답률</th>
                  <th className="num">푼 문제</th>
                  <th className="num">오답</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data.need_help.map((s) => (
                  <tr key={s.student_id}>
                    <td className="strong">{s.username}</td>
                    <td className="num danger">{accuracyText(s.correct, s.attempts)}</td>
                    <td className="num">{s.attempts}</td>
                    <td className="num">{s.wrong_count}</td>
                    <td>
                      <button
                        className="link-btn"
                        type="button"
                        onClick={() => onSelectStudent(s.student_id)}
                      >
                        상세 보기
                      </button>
                    </td>
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
