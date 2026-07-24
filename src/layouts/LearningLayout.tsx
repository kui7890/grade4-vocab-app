import { useMemo, useState } from "react";
import { Outlet } from "react-router-dom";
import type { SubjectFilterValue, VocabWord } from "../types";
import { VOCAB_DB } from "../data/vocab";
import { useAuth } from "../auth/AuthContext";
import { useLearningData, type LogResponseInput } from "../hooks/useLearningData";
import SubjectFilter from "../components/SubjectFilter";
import StatusBar from "../components/StatusBar";

// 카드/퀴즈/오답 화면이 공유하는 데이터 (Outlet context).
export interface LearningContext {
  filteredWords: VocabWord[];
  wrongWords: VocabWord[];
  addWrong: (id: string) => void;
  removeWrong: (id: string) => void;
  completeReview: (id: string) => void;
  studentId: string | null;
  recordAnswer: (isCorrect: boolean) => void;
  // 퀴즈 응답 세분화 로그 (분석/숙달용, fire-and-forget)
  logResponse: (r: LogResponseInput) => void;
}

// 학습 화면 전용 골격 (과목 필터 + 상태바 + 하위 라우트)
export default function LearningLayout() {
  const { student } = useAuth();
  const [subject, setSubject] = useState<SubjectFilterValue>("전체");

  const studentId = student?.id ?? null;
  const {
    wrongIds,
    addWrong,
    removeWrong,
    completeReview,
    recordAnswer,
    accuracy,
    stats,
    logResponse,
  } = useLearningData(studentId);

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

  const context: LearningContext = {
    filteredWords,
    wrongWords,
    addWrong,
    removeWrong,
    completeReview,
    studentId,
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
