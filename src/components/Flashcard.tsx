import { useEffect, useState } from "react";
import type { VocabWord } from "../types";
import { useTTS } from "../hooks/useTTS";
import WordOfTheDay from "./WordOfTheDay";

// 플래시카드 학습 화면
interface Props {
  words: VocabWord[];
}

export default function Flashcard({ words }: Props) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const { supported, speak, message } = useTTS();

  // 어휘 목록(과목 필터)이 바뀌면 처음으로 되돌린다.
  useEffect(() => {
    setIndex(0);
    setFlipped(false);
  }, [words]);

  if (words.length === 0) {
    return (
      <div className="empty panel">
        <div className="emoji">📭</div>
        <p>이 교과에는 아직 학습할 어휘가 없어요.</p>
      </div>
    );
  }

  const word = words[index];

  const goPrev = () => {
    setFlipped(false);
    setIndex((i) => (i - 1 + words.length) % words.length);
  };
  const goNext = () => {
    setFlipped(false);
    setIndex((i) => (i + 1) % words.length);
  };

  return (
    <div>
      <WordOfTheDay />

      <div className="flashcard">
        <div
          className={`flashcard-inner ${flipped ? "flipped" : ""}`}
          onClick={() => setFlipped((f) => !f)}
          role="button"
          tabIndex={0}
          aria-label={`${word.word} 카드. 누르면 뜻과 예문을 볼 수 있어요.`}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setFlipped((f) => !f);
            }
          }}
        >
          {/* 앞면 */}
          <div className="flashcard-face flashcard-front">
            <div className="flashcard-emoji" aria-hidden="true">
              {word.image_url}
            </div>
            <div className="flashcard-word">{word.word}</div>
            <div className="flashcard-tags">
              {word.subject} · {word.unit}
            </div>
            <div className="flashcard-hint">👆 카드를 누르면 뜻이 나와요</div>
          </div>

          {/* 뒷면 */}
          <div className="flashcard-face flashcard-back">
            <div className="flashcard-word" style={{ fontSize: 26 }}>
              {word.word}
            </div>
            <div className="label">쉬운 뜻</div>
            <div className="meaning">{word.easy_meaning}</div>
            <div className="label">예문</div>
            <div className="example">{word.example_sentence}</div>
          </div>
        </div>
      </div>

      <div className="progress-text">
        {index + 1} / {words.length}
      </div>

      <div className="actions">
        <button className="btn secondary" onClick={goPrev}>
          ◀ 이전
        </button>
        <button className="btn" onClick={() => speak(word)}>
          🔊 소리로 듣기
        </button>
        <button className="btn secondary" onClick={goNext}>
          다음 ▶
        </button>
      </div>

      {!supported && <p className="tts-warning">{message || "이 브라우저는 음성 읽기 기능을 지원하지 않습니다."}</p>}
    </div>
  );
}
