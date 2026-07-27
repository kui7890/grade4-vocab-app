import { useCallback, useEffect, useState } from "react";
import {
  adminDeleteStudent,
  adminListStudentsDetail,
  friendlyError,
  type StudentRow,
} from "../../lib/api";
import { accuracyText, formatDate } from "../../utils/wordLookup";

// 교사 대시보드 - 학생별 현황 (목록 · 상세 이동 · 계정 삭제)
interface Props {
  pin: string;
  onSelectStudent: (studentId: string) => void;
}

export default function StudentsTab({ pin, onSelectStudent }: Props) {
  const [rows, setRows] = useState<StudentRow[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    adminListStudentsDetail(pin)
      .then(setRows)
      .catch((err) => setError(friendlyError(err instanceof Error ? err.message : "")))
      .finally(() => setLoading(false));
  }, [pin]);

  useEffect(load, [load]);

  async function handleDelete(row: StudentRow) {
    const ok = window.confirm(
      `'${row.username}' 학생 계정을 삭제할까요?\n학습 기록·오답·통계도 함께 삭제되며 되돌릴 수 없습니다.`
    );
    if (!ok) return;
    setBusy(true);
    setError("");
    try {
      await adminDeleteStudent(pin, row.student_id);
      setRows((prev) => prev.filter((r) => r.student_id !== row.student_id));
    } catch (err) {
      setError(friendlyError(err instanceof Error ? err.message : ""));
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="dash-muted">불러오는 중…</p>;

  return (
    <div>
      {error && <div className="notice">{error}</div>}

      <p className="dash-muted" style={{ marginBottom: 12 }}>
        등록된 학생 <b>{rows.length}</b>명 · 학생 이름을 누르면 상세 화면으로 이동합니다.
      </p>

      {rows.length === 0 ? (
        <div className="empty panel">
          <div className="emoji">🙂</div>
          <p>아직 등록된 학생이 없습니다.</p>
        </div>
      ) : (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>학생</th>
                <th>익명 ID</th>
                <th className="num">정답률</th>
                <th className="num">학습 횟수</th>
                <th className="num">오답</th>
                <th className="num">반복 오답</th>
                <th className="num">복습 완료</th>
                <th>마지막 학습</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.student_id}>
                  <td>
                    <button
                      className="link-btn"
                      type="button"
                      onClick={() => onSelectStudent(r.student_id)}
                    >
                      {r.username}
                    </button>
                  </td>
                  <td className="muted">{r.anon_code ?? "-"}</td>
                  <td className="num">{accuracyText(r.correct, r.attempts)}</td>
                  <td className="num">{r.attempts}</td>
                  <td className="num">{r.wrong_count}</td>
                  <td className={`num ${r.repeat_wrong > 0 ? "danger" : ""}`}>{r.repeat_wrong}</td>
                  <td className="num">{r.reviewed_count}</td>
                  <td className="muted">{formatDate(r.last_active)}</td>
                  <td>
                    <button
                      className="btn danger"
                      type="button"
                      disabled={busy}
                      onClick={() => handleDelete(r)}
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
