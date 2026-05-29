import { useCallback, useState } from "react";
import type { VocabWord } from "../types";

// 한국어 음성 읽기(TTS) 훅. 브라우저의 speechSynthesis를 사용한다.
export function useTTS() {
  // 브라우저가 음성 기능을 지원하는지 확인
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;
  const [message, setMessage] = useState<string>("");

  const speak = useCallback(
    (word: VocabWord) => {
      if (!supported) {
        setMessage("이 브라우저는 음성 읽기 기능을 지원하지 않습니다.");
        return;
      }
      // 이전 음성이 남아 있으면 멈춘다.
      window.speechSynthesis.cancel();

      const text = `${word.word}. ${word.easy_meaning}. 예문. ${word.example_sentence}`;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "ko-KR";
      utterance.rate = 0.95; // 또박또박 읽기 위해 살짝 느리게
      window.speechSynthesis.speak(utterance);
      setMessage("");
    },
    [supported]
  );

  return { supported, speak, message };
}
