import { useCallback, useEffect, useMemo, useState } from "react";
import { adminGetWrongAnalysis, friendlyError, type WrongAnalysis } from "../../lib/api";
import { wordLabel } from "../../utils/wordLookup";

// 오답률(%) 표시
function rate(wrong: number, total: number): string {
  if (!total) return "-";
  return `${Math.round((wrong / total) * 100)}%`;
}

// 교사 대시보드 - 오답 분석
interface Props {
  pin: string;
}

export default function WrongAnalysisTab({ pin }: Props) {
  const [data, setData] = useState<WrongAnalysis | null>(null);
  const [subject, setSubject] = useState<string>("");
  const [unit, setUnit] = useState<string>("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    adminGetWrongAnalysis(pin, subject || null, unit || null)
      .then(setData)
      .catch((err) => setError(friendlyError(err instanceof Error ? err.message : "")))
      .finally(() => setLoading(false));
  }, [pin, subject, unit]);

  useEffect(load, [load]);

  // 필터 선택지 (교과 목록 · 선택된 교과의 단원 목록)
  const subjectOptions = useMemo(
    () => Array.from(new Set((data?.filters ?? []).map((f) => f.subject))),
    [data]
  );
  const unitOptions = useMemo(
    () =>
      Array.from(
        new Set(
          (data?.filters ?? [])
            .filter((f) => !subject || f.subject === subject)
            .map((f) => f.unit)
        )
      ),
    [data, subject]
  );

  if (error) return <div className="notice">{error}</div>;

  return (
    <div>
      {/* 필터 */}
      <section className="panel dash-section">
        <h3 className="dash-title">필터</h3>
        <div className="filter-row">
          <label className="filter-field">
            <span className="field-label">교과</span>
            <select
              className="text-input"
              value={subject}
              onChange={(e) => {
                setSubject(e.target.value);
                setUnit("");
              }}
            >
              <option value="">전체</option>
              {subjectOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="filter-field">
            <span className="field-label">단원</span>
            <select className="text-input" value={unit} onChange={(e) => setUnit(e.target.value)}>
              <option value="">전체</option>
              {unitOptions.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {loading || !data ? (
        <p className="dash-muted">불러오는 중…</p>
      ) : (
        <>
          {/* 교과별 오답률 */}
          <section className="panel dash-section">
            <h3 className="dash-title">교과별 오답률</h3>
            {data.subjects.length === 0 ? (
              <p className="dash-muted">해당 조건의 학습 기록이 없습니다.</p>
            ) : (
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>교과</th>
                      <th className="num">출제</th>
                      <th className="num">틀림</th>
                      <th className="num">오답률</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.subjects.map((s) => (
                      <tr key={s.subject}>
                        <td className="strong">{s.subject}</td>
                        <td className="num">{s.total}</td>
                        <td className="num danger">{s.wrong_count}</td>
                        <td className="num">{rate(s.wrong_count, s.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* 단원별 오답 */}
          <section className="panel dash-section">
            <h3 className="dash-title">단원별 오답이 많은 영역</h3>
            {data.units.length === 0 ? (
              <p className="dash-muted">틀린 문항이 없습니다.</p>
            ) : (
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>교과</th>
                      <th>단원</th>
                      <th className="num">출제</th>
                      <th className="num">틀림</th>
                      <th className="num">오답률</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.units.map((u, i) => (
                      <tr key={`${u.subject}-${u.unit}-${i}`}>
                        <td>{u.subject}</td>
                        <td className="strong">{u.unit}</td>
                        <td className="num">{u.total}</td>
                        <td className="num danger">{u.wrong_count}</td>
                        <td className="num">{rate(u.wrong_count, u.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* 어휘별 오답 */}
          <section className="panel dash-section">
            <h3 className="dash-title">많이 틀린 어휘</h3>
            {data.words.length === 0 ? (
              <p className="dash-muted">틀린 어휘가 없습니다.</p>
            ) : (
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>어휘</th>
                      <th>교과 · 단원</th>
                      <th className="num">틀림</th>
                      <th className="num">출제</th>
                      <th className="num">오답률</th>
                      <th className="num">학생 수</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.words.map((w) => (
                      <tr key={`${w.word_id}-${w.unit}`}>
                        <td className="strong">{wordLabel(w.word_id)}</td>
                        <td className="muted">
                          {w.subject} · {w.unit}
                        </td>
                        <td className="num danger">{w.wrong_count}</td>
                        <td className="num">{w.total}</td>
                        <td className="num">{rate(w.wrong_count, w.total)}</td>
                        <td className="num">{w.student_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* 학생별 반복 오답 */}
          <section className="panel dash-section">
            <h3 className="dash-title">학생별 반복 오답 (2회 이상)</h3>
            {data.students.length === 0 ? (
              <p className="dash-muted">반복해서 틀린 기록이 없습니다.</p>
            ) : (
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>학생</th>
                      <th>익명 ID</th>
                      <th>어휘</th>
                      <th>교과</th>
                      <th className="num">틀린 횟수</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.students.map((s, i) => (
                      <tr key={`${s.student_id}-${s.word_id}-${i}`}>
                        <td className="strong">{s.username}</td>
                        <td className="muted">{s.anon_code ?? "-"}</td>
                        <td>{wordLabel(s.word_id)}</td>
                        <td>{s.subject}</td>
                        <td className="num danger">{s.wrong_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
