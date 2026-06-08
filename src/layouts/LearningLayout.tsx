import { useMemo, useState } from "react";
import { Outlet } from "react-router-dom";
import type { SubjectFilterValue, VocabWord } from "../types";
import { VOCAB_DB } from "../data/vocab";
import { useAuth } from "../auth/AuthContext";
import { useWrongWords } from "../hooks/useWrongWords";
import { useStats } from "../hooks/useStats";
import Header from "../components/Header";
import SubjectFilter from "../components/SubjectFilter";
import ModeTabs from "../components/ModeTabs";
import StatusBar from "../components/StatusBar";

// 학습 화면(카드/퀴즈/오답)이 공유하는 데이터.
// Outlet context로 하위 라우트에 전달한다.
export interface LearningContext {
  filteredWords: VocabWord[];
  wrongWords: VocabWord[];
  addWrong: (id: string) => void;
  removeWrong: (id: string) => void;
  recordAnswer: (isCorrect: boolean) => void;
}

// 로그인한 학생의 공통 학습 화면 골격 (헤더 + 과목필터 + 모드탭 + 상태바 + 하위 라우트)
export default function LearningLayout() {
  const { student, logout } = useAuth();
  const [subject, setSubject] = useState<SubjectFilterValue>("전체");

  const studentId = student?.id ?? null;
  const { wrongIds, addWrong, removeWrong } = useWrongWords(studentId);
  const { recordAnswer, accuracy, stats } = useStats(studentId);

  // 선택된 과목에 맞는 어휘 목록
  const filteredWords = useMemo(
    () => (subject === "전체" ? VOCAB_DB : VOCAB_DB.filter((w) => w.subject === subject)),
    [subject]
  );

  // 오답으로 저장된 어휘 목록 (VOCAB_DB에서 id로 조회)
  const wrongWords = useMemo(
    () =>
      wrongIds
        .map((id) => VOCAB_DB.find((w) => w.id === id))
        .filter((w): w is NonNullable<typeof w> => Boolean(w)),
    [wrongIds]
  );

  const context: LearningContext = { filteredWords, wrongWords, addWrong, removeWrong, recordAnswer };

  return (
    <div className="app">
      <Header studentName={student?.username ?? ""} onLogout={logout} />
      <SubjectFilter value={subject} onChange={setSubject} />
      <ModeTabs />
      <StatusBar
        subject={subject}
        wordCount={filteredWords.length}
        wrongCount={wrongWords.length}
        accuracy={accuracy}
        attempts={stats.attempts}
      />
      <Outlet context={context} />
    </div>
  );
}
