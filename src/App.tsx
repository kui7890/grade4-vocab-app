import { Routes, Route, Navigate, useOutletContext } from "react-router-dom";
import { useAuth } from "./auth/AuthContext";
import Login from "./components/Login";
import AppLayout from "./layouts/AppLayout";
import LearningLayout, { type LearningContext } from "./layouts/LearningLayout";
import StudentDashboard from "./pages/StudentDashboard";
import TeacherPage from "./pages/TeacherPage";
import Flashcard from "./components/Flashcard";
import Quiz from "./components/Quiz";
import ReviewNotes from "./components/ReviewNotes";

// 하위 학습 라우트들은 LearningLayout이 내려주는 Outlet context를 사용한다.
function CardsRoute() {
  const { filteredWords } = useOutletContext<LearningContext>();
  return <Flashcard words={filteredWords} />;
}

function QuizRoute() {
  const { filteredWords, addWrong, removeWrong, recordAnswer, logResponse } =
    useOutletContext<LearningContext>();
  return (
    <Quiz
      words={filteredWords}
      addWrong={addWrong}
      removeWrong={removeWrong}
      recordAnswer={recordAnswer}
      logResponse={logResponse}
    />
  );
}

function ReviewRoute() {
  const { wrongWords, removeWrong } = useOutletContext<LearningContext>();
  return <ReviewNotes words={wrongWords} removeWrong={removeWrong} />;
}

export default function App() {
  const { student } = useAuth();

  return (
    <Routes>
      {/* 교사 화면은 로그인 여부와 무관하게 접근 가능 (PIN으로 보호) */}
      <Route path="/teacher" element={<TeacherPage />} />

      {student ? (
        // 로그인 상태: 최상위 레이아웃(헤더+메인내비) 아래 대시보드/학습 화면
        <Route element={<AppLayout />}>
          <Route index element={<StudentDashboard />} />
          <Route element={<LearningLayout />}>
            <Route path="cards" element={<CardsRoute />} />
            <Route path="quiz" element={<QuizRoute />} />
            <Route path="review" element={<ReviewRoute />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      ) : (
        // 비로그인 상태: 어떤 경로든 로그인/회원가입 화면
        <Route path="*" element={<div className="app"><Login /></div>} />
      )}
    </Routes>
  );
}
