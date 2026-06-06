import { useMemo, useState } from "react";
import type { Mode, SubjectFilterValue } from "./types";
import { VOCAB_DB } from "./data/vocab";
import { useAuth } from "./auth/AuthContext";
import { useWrongWords } from "./hooks/useWrongWords";
import { useStats } from "./hooks/useStats";
import Login from "./components/Login";
import Header from "./components/Header";
import SubjectFilter from "./components/SubjectFilter";
import ModeTabs from "./components/ModeTabs";
import StatusBar from "./components/StatusBar";
import Flashcard from "./components/Flashcard";
import Quiz from "./components/Quiz";
import ReviewNotes from "./components/ReviewNotes";

export default function App() {
  const { student, logout } = useAuth();
  const [subject, setSubject] = useState<SubjectFilterValue>("전체");
  const [mode, setMode] = useState<Mode>("card");

  // 로그인한 학생 기준으로 오답/통계를 Supabase에서 불러옵니다.
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

  // 로그인 전에는 로그인/회원가입 화면을 보여줍니다.
  if (!student) {
    return (
      <div className="app">
        <Login />
      </div>
    );
  }

  return (
    <div className="app">
      <Header studentName={student.username} onLogout={logout} />
      <SubjectFilter value={subject} onChange={setSubject} />
      <ModeTabs value={mode} onChange={setMode} />
      <StatusBar
        subject={subject}
        wordCount={filteredWords.length}
        wrongCount={wrongWords.length}
        accuracy={accuracy}
        attempts={stats.attempts}
      />

      {mode === "card" && <Flashcard words={filteredWords} />}
      {mode === "quiz" && (
        <Quiz
          words={filteredWords}
          addWrong={addWrong}
          removeWrong={removeWrong}
          recordAnswer={recordAnswer}
        />
      )}
      {mode === "review" && <ReviewNotes words={wrongWords} removeWrong={removeWrong} />}
    </div>
  );
}
