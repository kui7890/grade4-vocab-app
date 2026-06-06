import { useState } from "react";
import { adminDeleteStudent, adminListStudents, friendlyError, type AdminStudent } from "../lib/api";

// 관리자 패널: PIN 입력 → 학생 목록 확인 → 학생 아이디 삭제
// PIN 번호는 서버(Supabase 함수)에서 20260606 으로 검증합니다.
export default function AdminPanel({ onClose }: { onClose: () => void }) {
  const [pin, setPin] = useState("");
  const [authed, setAuthed] = useState(false);
  const [students, setStudents] = useState<AdminStudent[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function loadStudents(currentPin: string) {
    setBusy(true);
    setError("");
    try {
      const list = await adminListStudents(currentPin);
      setStudents(list);
      setAuthed(true);
    } catch (err) {
      setError(friendlyError(err instanceof Error ? err.message : ""));
    } finally {
      setBusy(false);
    }
  }

  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    if (!pin.trim()) {
      setError("PIN 번호를 입력하세요.");
      return;
    }
    await loadStudents(pin);
  }

  async function handleDelete(student: AdminStudent) {
    const ok = window.confirm(`'${student.username}' 학생 계정을 삭제할까요?\n오답과 통계도 함께 삭제되며 되돌릴 수 없습니다.`);
    if (!ok) return;
    setBusy(true);
    setError("");
    try {
      await adminDeleteStudent(pin, student.id);
      setStudents((prev) => prev.filter((s) => s.id !== student.id));
    } catch (err) {
      setError(friendlyError(err instanceof Error ? err.message : ""));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="관리자 패널">
        <div className="modal-head">
          <h2>관리자 (선생님용)</h2>
          <button className="link-btn" type="button" onClick={onClose} aria-label="닫기">
            ✕ 닫기
          </button>
        </div>

        {!authed ? (
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
        ) : (
          <div>
            <p className="field-hint" style={{ marginTop: 0 }}>
              등록된 학생 <b>{students.length}</b>명
            </p>
            {error && <div className="notice">{error}</div>}

            {students.length === 0 ? (
              <div className="empty">
                <div className="emoji">🙂</div>
                <p>아직 등록된 학생이 없습니다.</p>
              </div>
            ) : (
              <ul className="student-list">
                {students.map((s) => (
                  <li key={s.id} className="student-row">
                    <div>
                      <div className="student-name">{s.username}</div>
                      <div className="student-date">
                        가입일 {new Date(s.created_at).toLocaleDateString("ko-KR")}
                      </div>
                    </div>
                    <button
                      className="btn danger"
                      type="button"
                      disabled={busy}
                      onClick={() => handleDelete(s)}
                    >
                      삭제
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
