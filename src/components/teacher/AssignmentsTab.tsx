import { useCallback, useEffect, useMemo, useState } from "react";
import {
  adminCreateAssignment,
  adminDeleteAssignment,
  adminGetWrongAnalysis,
  adminListAssignments,
  adminListStudentsDetail,
  friendlyError,
  type Assignment,
  type StudentRow,
} from "../../lib/api";
import { VOCAB_DB } from "../../data/vocab";
import { formatDate, wordLabel } from "../../utils/wordLookup";
import type { Subject } from "../../types";

const SUBJECTS: Subject[] = ["국어", "사회", "과학"];

// 교사 대시보드 - 학습 배정
interface Props {
  pin: string;
}

export default function AssignmentsTab({ pin }: Props) {
  const [rows, setRows] = useState<Assignment[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  // 배정 입력값
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState(""); // "" = 전체 학생
  const [setType, setSetType] = useState<"subject" | "review">("subject");
  const [subject, setSubject] = useState<string>("");
  const [dueDate, setDueDate] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  const load = useCallback(() => {
    Promise.all([adminListAssignments(pin), adminListStudentsDetail(pin)])
      .then(([a, s]) => {
        setRows(a);
        setStudents(s);
      })
      .catch((err) => setError(friendlyError(err instanceof Error ? err.message : "")));
  }, [pin]);

  useEffect(load, [load]);

  // 어휘 선택 목록 (교과 필터 적용)
  const candidateWords = useMemo(
    () => (subject ? VOCAB_DB.filter((w) => w.subject === subject) : VOCAB_DB),
    [subject]
  );

  function toggleWord(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  // 현재 보이는 어휘 전체 선택 / 해제
  function selectAllVisible() {
    setSelected((prev) => Array.from(new Set([...prev, ...candidateWords.map((w) => w.id)])));
  }

  // 많이 틀린 어휘 자동 선택 (오답 분석 결과 상위 8개)
  async function autoSelectWrong() {
    setBusy(true);
    setError("");
    try {
      const analysis = await adminGetWrongAnalysis(pin, subject || null, null);
      const top = analysis.words.slice(0, 8).map((w) => w.word_id);
      if (top.length === 0) {
        setNotice("아직 오답 기록이 없어 자동 선택할 어휘가 없습니다.");
      } else {
        setSelected(top);
        setSetType("review");
        setNotice(`많이 틀린 어휘 ${top.length}개를 선택했습니다.`);
      }
    } catch (err) {
      setError(friendlyError(err instanceof Error ? err.message : ""));
    } finally {
      setBusy(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setNotice("");

    if (!title.trim()) {
      setError("배정 제목을 입력하세요.");
      return;
    }
    if (selected.length === 0) {
      setError("배정할 어휘를 1개 이상 선택하세요.");
      return;
    }

    setBusy(true);
    try {
      await adminCreateAssignment({
        pin,
        title: title.trim(),
        studentId: target || null,
        setType,
        subject: subject || null,
        wordIds: selected,
        dueDate: dueDate || null,
      });
      setNotice("학습을 배정했습니다.");
      setTitle("");
      setSelected([]);
      setDueDate("");
      load();
    } catch (err) {
      setError(friendlyError(err instanceof Error ? err.message : ""));
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(row: Assignment) {
    const ok = window.confirm(`'${row.title}' 배정을 삭제할까요?`);
    if (!ok) return;
    setBusy(true);
    try {
      await adminDeleteAssignment(pin, row.id);
      setRows((prev) => prev.filter((r) => r.id !== row.id));
    } catch (err) {
      setError(friendlyError(err instanceof Error ? err.message : ""));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {/* 새 배정 만들기 */}
      <section className="panel dash-section">
        <h3 className="dash-title">새 학습 배정</h3>
        <form onSubmit={handleCreate}>
          <label className="field-label" htmlFor="asg-title">
            제목
          </label>
          <input
            id="asg-title"
            className="text-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예: 사회 지도 단원 복습"
          />

          <div className="filter-row" style={{ marginTop: 14 }}>
            <label className="filter-field">
              <span className="field-label">대상</span>
              <select className="text-input" value={target} onChange={(e) => setTarget(e.target.value)}>
                <option value="">전체 학생</option>
                {students.map((s) => (
                  <option key={s.student_id} value={s.student_id}>
                    {s.username}
                  </option>
                ))}
              </select>
            </label>

            <label className="filter-field">
              <span className="field-label">유형</span>
              <select
                className="text-input"
                value={setType}
                onChange={(e) => setSetType(e.target.value as "subject" | "review")}
              >
                <option value="subject">교과 어휘 세트</option>
                <option value="review">오답 복습 세트</option>
              </select>
            </label>

            <label className="filter-field">
              <span className="field-label">교과</span>
              <select className="text-input" value={subject} onChange={(e) => setSubject(e.target.value)}>
                <option value="">전체</option>
                {SUBJECTS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>

            <label className="filter-field">
              <span className="field-label">마감일 (선택)</span>
              <input
                className="text-input"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </label>
          </div>

          {/* 어휘 선택 */}
          <div className="field-label" style={{ marginTop: 16 }}>
            어휘 선택 <span className="muted">({selected.length}개 선택됨)</span>
          </div>
          <div className="dash-actions" style={{ marginBottom: 10 }}>
            <button className="btn secondary small" type="button" onClick={selectAllVisible}>
              보이는 어휘 전체 선택
            </button>
            <button className="btn secondary small" type="button" onClick={() => setSelected([])}>
              선택 해제
            </button>
            <button className="btn secondary small" type="button" disabled={busy} onClick={autoSelectWrong}>
              많이 틀린 어휘 자동 선택
            </button>
          </div>

          <div className="word-picker">
            {candidateWords.map((w) => (
              <label key={w.id} className={`word-chip ${selected.includes(w.id) ? "on" : ""}`}>
                <input
                  type="checkbox"
                  checked={selected.includes(w.id)}
                  onChange={() => toggleWord(w.id)}
                />
                <span>{w.word}</span>
              </label>
            ))}
          </div>

          {error && <div className="notice">{error}</div>}
          {notice && <p className="dash-muted" style={{ marginTop: 12 }}>{notice}</p>}

          <button className="btn" type="submit" disabled={busy} style={{ marginTop: 16 }}>
            {busy ? "처리 중…" : "학습 배정하기"}
          </button>
        </form>
      </section>

      {/* 배정 목록 */}
      <section className="panel dash-section">
        <h3 className="dash-title">배정한 학습</h3>
        {rows.length === 0 ? (
          <p className="dash-muted">아직 배정한 학습이 없습니다.</p>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>제목</th>
                  <th>대상</th>
                  <th>유형</th>
                  <th className="num">어휘</th>
                  <th className="num">수행</th>
                  <th>마감</th>
                  <th>배정일</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="strong" title={(r.word_ids ?? []).map(wordLabel).join(", ")}>
                      {r.title}
                    </td>
                    <td>{r.target_username ?? "전체 학생"}</td>
                    <td>{r.set_type === "review" ? "오답 복습" : "교과 어휘"}</td>
                    <td className="num">{r.word_count}</td>
                    <td className="num">
                      {r.done_count ?? 0} / {r.target_count ?? 0}
                    </td>
                    <td className="muted">{r.due_date ? formatDate(r.due_date) : "-"}</td>
                    <td className="muted">{formatDate(r.created_at)}</td>
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
      </section>
    </div>
  );
}
