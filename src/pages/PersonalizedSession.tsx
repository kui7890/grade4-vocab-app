import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { getPersonalizedSet, type PersonalizedReason } from "../lib/api";
import { useLearningData } from "../hooks/useLearningData";
import { VOCAB_DB } from "../data/vocab";
import type { VocabWord } from "../types";
import Flashcard from "../components/Flashcard";
import Quiz from "../components/Quiz";

// 한 세션에 담을 단어 수 (5~10분 분량)
const SET_SIZE = 8;

// 선정 이유 → 학생에게 보여줄 말
const REASON_LABEL: Record<PersonalizedReason, string> = {
  wrong: "다시 볼 단어",
  learning: "연습 중",
  new: "새 단어",
  mastered: "복습",
};

type Step = "loading" | "intro" | "cards" | "quiz" | "done";

export default function PersonalizedSession() {
  const { student } = useAuth();
  const studentId = student?.id ?? null;
  const { addWrong, removeWrong, recordAnswer, logResponse } = useLearningData(studentId);

  const [step, setStep] = useState<Step>("loading");
  const [items, setItems] = useState<{ word: VocabWord; reason: PersonalizedReason }[]>([]);
  const [error, setError] = useState("");

  // 학생 상태에 맞춘 단어 세트를 불러온다.
  useEffect(() => {
    if (!studentId) return;
    let active = true;
    const allIds = VOCAB_DB.map((w) => w.id);
    getPersonalizedSet(studentId, allIds, SET_SIZE)
      .then((rows) => {
        if (!active) return;
        const mapped = rows
          .map((r) => {
            const word = VOCAB_DB.find((w) => w.id === r.word_id);
            return word ? { word, reason: r.reason } : null;
          })
          .filter((x): x is { word: VocabWord; reason: PersonalizedReason } => x !== null);
        setItems(mapped);
        setStep("intro");
      })
      .catch(() => {
        if (!active) return;
        setError("학습 세트를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.");
        setStep("intro");
      });
    return () => {
      active = false;
    };
  }, [studentId]);

  const words = useMemo(() => items.map((i) => i.word), [items]);

  // 구성 요약 (다시 볼 단어 N개 · 새 단어 N개 …)
  const summary = useMemo(() => {
    const counts: Partial<Record<PersonalizedReason, number>> = {};
    items.forEach((i) => {
      counts[i.reason] = (counts[i.reason] ?? 0) + 1;
    });
    return counts;
  }, [items]);

  if (step === "loading") {
    return <div className="empty panel"><p>학습 세트를 준비하고 있어요…</p></div>;
  }

  if (error) {
    return (
      <div className="empty panel">
        <div className="emoji">😅</div>
        <p>{error}</p>
        <div className="dash-actions" style={{ justifyContent: "center", marginTop: 14 }}>
          <Link className="btn secondary" to="/">대시보드로 돌아가기</Link>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="empty panel">
        <div className="emoji">🎉</div>
        <p>지금은 학습할 단어가 없어요. 잠시 후 다시 와 주세요!</p>
        <div className="dash-actions" style={{ justifyContent: "center", marginTop: 14 }}>
          <Link className="btn secondary" to="/">대시보드로 돌아가기</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="session">
      {/* 진행 단계 표시 */}
      <div className="session-steps" aria-label="학습 단계">
        <span className={`step-chip ${step === "intro" ? "active" : ""}`}>1. 준비</span>
        <span className={`step-chip ${step === "cards" ? "active" : ""}`}>2. 카드로 익히기</span>
        <span className={`step-chip ${step === "quiz" ? "active" : ""}`}>3. 퀴즈로 확인</span>
      </div>

      {step === "intro" && (
        <section className="panel">
          <h2 className="dash-title">오늘의 개별화 학습</h2>
          <p className="dash-muted" style={{ marginBottom: 14 }}>
            내 학습 기록에 맞춰 <b>{items.length}개</b> 단어를 골랐어요. 카드로 익힌 뒤 퀴즈로 확인해요.
          </p>

          <div className="statusbar" style={{ justifyContent: "flex-start", margin: "0 0 16px" }}>
            {(Object.keys(summary) as PersonalizedReason[]).map((r) => (
              <span key={r} className="status-chip">
                {REASON_LABEL[r]} <b>{summary[r]}</b>개
              </span>
            ))}
          </div>

          <ul className="recent-wrong">
            {items.map(({ word, reason }) => (
              <li key={word.id}>
                <span className="rw-emoji">{word.image_url}</span>
                <span className="rw-word">{word.word}</span>
                <span className="rw-meaning">{REASON_LABEL[reason]}</span>
              </li>
            ))}
          </ul>

          <div className="dash-actions" style={{ marginTop: 18, marginBottom: 0 }}>
            <button className="btn" type="button" onClick={() => setStep("cards")}>
              카드로 익히기 시작 ▶
            </button>
            <Link className="btn secondary" to="/">나중에 하기</Link>
          </div>
        </section>
      )}

      {step === "cards" && (
        <>
          <Flashcard words={words} />
          <div className="dash-actions" style={{ marginTop: 18, justifyContent: "center" }}>
            <button className="btn success" type="button" onClick={() => setStep("quiz")}>
              퀴즈로 확인하기 ▶
            </button>
          </div>
        </>
      )}

      {step === "quiz" && (
        <Quiz
          words={words}
          addWrong={addWrong}
          removeWrong={removeWrong}
          recordAnswer={recordAnswer}
          logResponse={logResponse}
        />
      )}

      {step === "quiz" && (
        <div className="dash-actions" style={{ marginTop: 18, justifyContent: "center" }}>
          <Link className="btn secondary" to="/">대시보드로 돌아가기</Link>
        </div>
      )}
    </div>
  );
}
