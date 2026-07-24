import { useMemo } from "react";
import { getWordOfTheDay } from "../utils/today";

// 오늘의 어휘 띠 (어휘 카드 화면 상단)
export default function WordOfTheDay() {
  const word = useMemo(() => getWordOfTheDay(), []);

  return (
    <section className="word-of-day" aria-label="오늘의 어휘">
      <span className="emoji" aria-hidden="true">
        {word.image_url}
      </span>
      <div>
        <div className="label">⭐ 오늘의 어휘</div>
        <div className="word">{word.word}</div>
        <div className="meaning">{word.easy_meaning}</div>
      </div>
    </section>
  );
}
