import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getWordOfTheDay } from "../utils/today";
import { useTTS } from "../hooks/useTTS";

// 대시보드 "오늘의 단어" 영역
// 단어 · 쉬운 뜻 · 예문 · 소리로 듣기 · 오늘의 단어 퀴즈 풀기
export default function TodayWordCard() {
  const word = useMemo(() => getWordOfTheDay(), []);
  const { supported, speak, message } = useTTS();
  const navigate = useNavigate();

  return (
    <section className="panel today-card" aria-label="오늘의 단어">
      <div className="today-head">
        <span className="today-emoji" aria-hidden="true">{word.image_url}</span>
        <div>
          <div className="today-label">⭐ 오늘의 단어</div>
          <div className="today-word">{word.word}</div>
          <div className="today-tags">
            {word.subject} · {word.unit}
          </div>
        </div>
      </div>

      <p className="today-meaning">{word.easy_meaning}</p>
      <p className="today-example">“{word.example_sentence}”</p>

      <div className="dash-actions" style={{ marginBottom: 0 }}>
        <button className="btn secondary" type="button" onClick={() => speak(word)}>
          🔊 소리로 듣기
        </button>
        <button className="btn" type="button" onClick={() => navigate(`/quiz?focus=${word.id}`)}>
          오늘의 단어 퀴즈 풀기
        </button>
      </div>

      {!supported && <p className="tts-warning">이 브라우저는 음성 읽기 기능을 지원하지 않습니다.</p>}
      {message && <p className="tts-warning">{message}</p>}
    </section>
  );
}
