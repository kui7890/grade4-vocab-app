import { useEffect, useMemo, useState } from "react";
import type { VocabWord } from "../types";
import { useTTS } from "../hooks/useTTS";
import { getWrongNotes, type WrongNote } from "../lib/api";

// 2회 이상 틀리면 "반복 오답"으로 강조한다.
const REPEAT_THRESHOLD = 2;

interface Props {
  words: VocabWord[]; // 오답으로 저장된 어휘들 (즉시 반영용)
  studentId: string | null;
  completeReview: (id: string) => void;
}

type Filter = "all" | "repeat";

export default function ReviewNotes({ words, studentId, completeReview }: Props) {
  const { supported, speak } = useTTS();
  const [notes, setNotes] = useState<WrongNote[]>([]);
  const [filter, setFilter] = useState<Filter>("all");

  // 반복 횟수 등 상세 정보를 서버에서 가져온다.
  useEffect(() => {
    if (!studentId) return;
    let active = true;
    getWrongNotes(studentId)
      .then((rows) => {
        if (active) setNotes(rows);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [studentId, words.length]);

  // word_id → 상세 정보
  const noteMap = useMemo(() => {
    const m = new Map<string, WrongNote>();
    notes.forEach((n) => m.set(n.word_id, n));
    return m;
  }, [notes]);

  // 반복 오답 먼저, 그다음 최근 추가 순으로 정렬
  const sorted = useMemo(() => {
    const list = words.map((word) => ({
      word,
      note: noteMap.get(word.id) ?? null,
    }));
    return list.sort((a, b) => {
      const aw = a.note?.wrong_count ?? 0;
      const bw = b.note?.wrong_count ?? 0;
      if (bw !== aw) return bw - aw;
      const at = a.note?.added_at ?? "";
      const bt = b.note?.added_at ?? "";
      return bt.localeCompare(at);
    });
  }, [words, noteMap]);

  const repeatCount = sorted.filter((s) => (s.note?.wrong_count ?? 0) >= REPEAT_THRESHOLD).length;
  const visible = filter === "repeat"
    ? sorted.filter((s) => (s.note?.wrong_count ?? 0) >= REPEAT_THRESHOLD)
    : sorted;

  if (words.length === 0) {
    return (
      <div className="empty panel">
        <div className="emoji">🎉</div>
        <p>
          저장된 오답이 없습니다.
          <br />
          퀴즈에서 틀린 어휘가 생기면 이곳에 자동으로 모입니다.
        </p>
      </div>
    );
  }

  return (
    <div>
      {!supported && (
        <p className="tts-warning">이 브라우저는 음성 읽기 기능을 지원하지 않습니다.</p>
      )}

      {/* 요약 + 필터 */}
      <div className="statusbar" style={{ justifyContent: "center", marginTop: 0 }}>
        <span className="status-chip">
          오답 <b>{words.length}</b>개
        </span>
        <span className="status-chip">
          반복 오답 <b>{repeatCount}</b>개
        </span>
      </div>

      <div className="button-row" style={{ marginTop: 0 }}>
        <button
          className={`pill ${filter === "all" ? "active" : ""}`}
          type="button"
          onClick={() => setFilter("all")}
        >
          전체 보기
        </button>
        <button
          className={`pill ${filter === "repeat" ? "active" : ""}`}
          type="button"
          onClick={() => setFilter("repeat")}
        >
          반복 오답만
        </button>
      </div>

      {visible.length === 0 ? (
        <div className="empty panel">
          <div className="emoji">👍</div>
          <p>반복해서 틀린 어휘는 없어요. 잘하고 있어요!</p>
        </div>
      ) : (
        <div className="review-list">
          {visible.map(({ word, note }) => {
            const wrongCount = note?.wrong_count ?? 0;
            const isRepeat = wrongCount >= REPEAT_THRESHOLD;
            return (
              <div className={`review-card ${isRepeat ? "repeat" : ""}`} key={word.id}>
                <div className="top">
                  <span className="emoji" aria-hidden="true">
                    {word.image_url}
                  </span>
                  <span className="word">{word.word}</span>
                  {isRepeat && <span className="repeat-badge">반복 오답 {wrongCount}회</span>}
                </div>
                <div className="tags">
                  {word.subject} · {word.unit}
                  {wrongCount > 0 && !isRepeat && ` · 틀린 횟수 ${wrongCount}회`}
                </div>
                <div className="meaning">{word.easy_meaning}</div>
                <div className="example">{word.example_sentence}</div>
                <div className="actions">
                  <button className="btn secondary" onClick={() => speak(word)}>
                    🔊 소리로 듣기
                  </button>
                  <button className="btn success" onClick={() => completeReview(word.id)}>
                    ✅ 복습 완료
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
