import { useMemo, useState } from "react";
import type { VocabWord } from "../types";
import { buildQuiz, makeBlankSentence } from "../utils/shuffle";
import QuizResult from "./QuizResult";

// 한 회 퀴즈에 출제할 최대 문항 수
const MAX_QUESTIONS = 5;

interface Props {
  words: VocabWord[]; // 현재 과목 필터가 적용된 어휘
  addWrong: (id: string) => void;
  removeWrong: (id: string) => void;
  recordAnswer: (isCorrect: boolean) => void;
}

export default function Quiz({ words, addWrong, removeWrong, recordAnswer }: Props) {
  // 퀴즈 문항은 한 번 만들고, "다시 풀기" 할 때만 새로 만든다.
  const [round, setRound] = useState(0);
  const questions = useMemo(() => buildQuiz(words, MAX_QUESTIONS), [words, round]);

  const [current, setCurrent] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [notice, setNotice] = useState("");

  // 어휘가 4개 미만이면 보기를 만들 수 없다.
  if (questions.length === 0) {
    return (
      <div className="empty panel">
        <div className="emoji">🧩</div>
        <p>
          이 교과는 퀴즈를 만들기에 어휘가 부족해요.
          <br />
          (보기를 만들려면 어휘가 4개 이상 필요해요)
          <br />
          다른 교과를 선택하거나 ‘전체’로 풀어 보세요.
        </p>
      </div>
    );
  }

  if (finished) {
    return (
      <QuizResult
        score={score}
        total={questions.length}
        onRestart={() => {
          setRound((r) => r + 1);
          setCurrent(0);
          setSelectedId(null);
          setAnswered(false);
          setScore(0);
          setFinished(false);
          setNotice("");
        }}
      />
    );
  }

  const question = questions[current];
  const isLast = current === questions.length - 1;

  // 보기를 선택했을 때
  const handleSelect = (option: VocabWord) => {
    if (answered) return; // 이미 답을 확인한 문항은 다시 못 고른다.
    setSelectedId(option.id);
    setAnswered(true);
    setNotice("");

    const isCorrect = option.id === question.answer.id;
    recordAnswer(isCorrect);
    if (isCorrect) {
      setScore((s) => s + 1);
      removeWrong(question.answer.id); // 맞히면 오답 목록에서 제거
    } else {
      addWrong(question.answer.id); // 틀리면 오답 목록에 추가
    }
  };

  // 다음 문항으로
  const handleNext = () => {
    if (!answered) {
      setNotice("먼저 보기 중 하나를 골라 주세요.");
      return;
    }
    if (isLast) {
      setFinished(true);
      return;
    }
    setCurrent((c) => c + 1);
    setSelectedId(null);
    setAnswered(false);
    setNotice("");
  };

  // 보기 버튼에 줄 css 클래스 (정답/오답 표시)
  const optionClass = (option: VocabWord) => {
    if (!answered) return `option ${selectedId === option.id ? "selected" : ""}`;
    if (option.id === question.answer.id) return "option correct";
    if (option.id === selectedId) return "option wrong";
    return "option";
  };

  return (
    <div className="panel">
      <div className="progress-text">
        문제 {current + 1} / {questions.length}
      </div>

      {/* 문제 영역: 유형에 따라 다르게 표시 */}
      {question.type === "meaning" ? (
        <p className="quiz-question">
          다음 뜻에 알맞은 어휘를 고르세요.
          <br />“{question.answer.easy_meaning}”
        </p>
      ) : (
        <p className="quiz-question">
          빈칸에 알맞은 어휘를 고르세요.
          <br />
          <span
            // 드래그 앤 드롭 보조: 보기를 빈칸 위로 끌어다 놓아도 선택된다.
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const id = e.dataTransfer.getData("text/plain");
              const opt = question.options.find((o) => o.id === id);
              if (opt) handleSelect(opt);
            }}
          >
            {renderBlank(question.answer, answered)}
          </span>
        </p>
      )}

      <div className="options">
        {question.options.map((option) => (
          <button
            key={option.id}
            className={optionClass(option)}
            disabled={answered}
            draggable={!answered}
            onDragStart={(e) => e.dataTransfer.setData("text/plain", option.id)}
            onClick={() => handleSelect(option)}
          >
            {option.word}
          </button>
        ))}
      </div>

      {/* 정답/오답 피드백 (색 + 문장) */}
      {answered && (
        <div className={`feedback ${selectedId === question.answer.id ? "correct" : "wrong"}`}>
          {selectedId === question.answer.id ? "🎉 정답이에요!" : "❌ 아쉬워요, 다시 기억해요."}
          <span className="detail">
            정답: <b>{question.answer.word}</b> — {question.answer.easy_meaning}
          </span>
        </div>
      )}

      {notice && <p className="notice">{notice}</p>}

      <div className="actions">
        <button className="btn" onClick={handleNext}>
          {isLast ? "결과 보기" : "다음 문제 ▶"}
        </button>
      </div>
    </div>
  );
}

// 빈칸 채우기 문장 렌더링: 답을 확인하기 전에는 ________, 확인 후엔 정답 표시
function renderBlank(answer: VocabWord, answered: boolean) {
  const sentence = makeBlankSentence(answer);
  const parts = sentence.split("________");
  return parts.map((part, i) => (
    <span key={i}>
      {part}
      {i < parts.length - 1 && (
        <b className="blank">{answered ? answer.word : "________"}</b>
      )}
    </span>
  ));
}
