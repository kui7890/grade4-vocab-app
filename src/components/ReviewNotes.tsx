import type { VocabWord } from "../types";
import { useTTS } from "../hooks/useTTS";

// 오답 복습 화면: 저장된 오답 어휘만 보여 준다.
interface Props {
  words: VocabWord[]; // 오답으로 저장된 어휘들
  removeWrong: (id: string) => void;
}

export default function ReviewNotes({ words, removeWrong }: Props) {
  const { supported, speak } = useTTS();

  if (words.length === 0) {
    return (
      <div className="empty panel">
        <div className="emoji">🎉</div>
        <p>
          저장된 오답이 없습니다.
          <br />
          퀴즈에서 틀린 어휘가 생기면 이곳에 자동으로 모입니다.
        </p>
      </div>
    );
  }

  return (
    <div>
      {!supported && (
        <p className="tts-warning">이 브라우저는 음성 읽기 기능을 지원하지 않습니다.</p>
      )}
      <div className="review-list">
        {words.map((word) => (
          <div className="review-card" key={word.id}>
            <div className="top">
              <span className="emoji" aria-hidden="true">
                {word.image_url}
              </span>
              <span className="word">{word.word}</span>
            </div>
            <div className="tags">
              {word.subject} · {word.unit}
            </div>
            <div className="meaning">{word.easy_meaning}</div>
            <div className="example">{word.example_sentence}</div>
            <div className="actions">
              <button className="btn secondary" onClick={() => speak(word)}>
                🔊 소리로 듣기
              </button>
              <button className="btn success" onClick={() => removeWrong(word.id)}>
                ✅ 복습 완료
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
