import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getAssignments, type Assignment } from "../lib/api";
import { formatDate } from "../utils/wordLookup";

// 학생 대시보드 - 선생님이 배정한 학습 목록
interface Props {
  studentId: string;
}

export default function AssignmentList({ studentId }: Props) {
  const [rows, setRows] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getAssignments(studentId)
      .then((list) => {
        if (active) setRows(list);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [studentId]);

  // 배정이 없으면 영역 자체를 숨긴다 (화면을 단순하게 유지).
  if (loading || rows.length === 0) return null;

  const todo = rows.filter((r) => !r.completed);
  const done = rows.filter((r) => r.completed);

  return (
    <section className="panel dash-section">
      <h2 className="dash-title">선생님이 내준 학습</h2>

      {todo.length === 0 ? (
        <p className="dash-muted">내준 학습을 모두 마쳤어요. 정말 잘했어요! 🎉</p>
      ) : (
        <ul className="assignment-list">
          {todo.map((a) => (
            <li key={a.id} className="assignment-row">
              <div>
                <div className="assignment-title">{a.title}</div>
                <div className="assignment-meta">
                  어휘 {a.word_count}개
                  {a.subject ? ` · ${a.subject}` : ""}
                  {a.due_date ? ` · ${formatDate(a.due_date)}까지` : ""}
                </div>
              </div>
              <Link className="btn" to={`/learn?assignment=${a.id}`}>
                시작하기
              </Link>
            </li>
          ))}
        </ul>
      )}

      {done.length > 0 && (
        <p className="dash-muted" style={{ marginTop: 12 }}>
          ✅ 마친 학습 {done.length}개
          {done[0].total ? ` · 최근 점수 ${done[0].score}/${done[0].total}` : ""}
        </p>
      )}
    </section>
  );
}
