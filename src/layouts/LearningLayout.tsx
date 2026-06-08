import { useMemo, useState } from "react";
import { Outlet } from "react-router-dom";
import type { SubjectFilterValue, VocabWord } from "../types";
import { VOCAB_DB } from "../data/vocab";
import { useAuth } from "../auth/AuthContext";
import { useWrongWords } from "../hooks/useWrongWords";
import { useStats } from "../hooks/useStats";
import { recordQuizResponse } from "../lib/api";
import SubjectFilter from "../components/SubjectFilter";
import StatusBar from "../components/StatusBar";

// 카드/퀴즈/오답 화면이 공유하는 데이터 (Outlet context).
export interface LearningContext {
  filteredWords: VocabWord[];
  wrongWords: VocabWord[];
  addWrong: (id: string) => void;
  removeWrong: (id: string) => void;
  recordAnswer: (isCorrect: boolean) => void;
  // 퀴즈 응답 세분화 로그 (분석/숙달용, fire-and-forget)
  logResponse: (r: {
    word: VocabWord;
    quizType: "meaning" | "fill";
    isCorrect: boolean;
    chosenWordId: string | null;
  }) => void;
}

// 학습 화면 전용 골격 (과목 필터 + 상태바 + 하위 라우트)
export default function LearningLayout() {
  const { student } = useAuth();
  const [subject, setSubject] = useState<SubjectFilterValue>("전체");

  const studentId = student?.id ?? null;
  const { wrongIds, addWrong, removeWrong } = useWrongWords(studentId);
  const { recordAnswer, accuracy, stats } = useStats(studentId);

  const filteredWords = useMemo(
    () => (subject === "전체" ? VOCAB_DB : VOCAB_DB.filter((w) => w.subject === subject)),
    [subject]
  );

  const wrongWords = useMemo(
    () =>
      wrongIds
        .map((id) => VOCAB_DB.find((w) => w.id === id))
        .filter((w): w is NonNullable<typeof w> => Boolean(w)),
    [wrongIds]
  );

  const logResponse: LearningContext["logResponse"] = ({ word, quizType, isCorrect, chosenWordId }) => {
    if (!studentId) return;
    recordQuizResponse({
      studentId,
      wordId: word.id,
      subject: word.subject,
      unit: word.unit,
      quizType,
      isCorrect,
      chosenWordId,
    }).catch(() => {
      /* 로깅 실패는 학습 흐름을 막지 않는다 */
    });
  };

  const context: LearningContext = {
    filteredWords,
    wrongWords,
    addWrong,
    removeWrong,
    recordAnswer,
    logResponse,
  };

  return (
    <>
      <SubjectFilter value={subject} onChange={setSubject} />
      <StatusBar
        subject={subject}
        wordCount={filteredWords.length}
        wrongCount={wrongWords.length}
        accuracy={accuracy}
        attempts={stats.attempts}
      />
      <Outlet context={context} />
    </>
  );
}
