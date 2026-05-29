import { useMemo } from "react";
import { VOCAB_DB } from "../data/vocab";

// 오늘 날짜를 시드로 어휘 1개를 골라 보여 준다 (하루 동안 고정)
export default function WordOfTheDay() {
  const word = useMemo(() => {
    const today = new Date();
    // 연/월/일을 숫자로 합쳐 시드로 사용
    const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
    const index = seed % VOCAB_DB.length;
    return VOCAB_DB[index];
  }, []);

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
