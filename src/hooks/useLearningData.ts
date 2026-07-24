import { useCallback } from "react";
import type { VocabWord } from "../types";
import { useWrongWords } from "./useWrongWords";
import { useStats } from "./useStats";
import { recordQuizResponse } from "../lib/api";

// 퀴즈 응답 로그 입력 형태 (컴포넌트에서 넘겨주는 값)
export interface LogResponseInput {
  word: VocabWord;
  quizType: "meaning" | "fill";
  isCorrect: boolean;
  chosenWordId: string | null;
}

// 학습 화면(일반 학습/개별화 학습)이 공통으로 쓰는 데이터와 기록 함수 모음.
export function useLearningData(studentId: string | null) {
  const { wrongIds, addWrong, removeWrong } = useWrongWords(studentId);
  const { recordAnswer, accuracy, stats } = useStats(studentId);

  // 문항 단위 로그 + 단어 숙달 갱신 (실패해도 학습 흐름을 막지 않음)
  const logResponse = useCallback(
    ({ word, quizType, isCorrect, chosenWordId }: LogResponseInput) => {
      if (!studentId) return;
      recordQuizResponse({
        studentId,
        wordId: word.id,
        subject: word.subject,
        unit: word.unit,
        quizType,
        isCorrect,
        chosenWordId,
      }).catch(() => {});
    },
    [studentId]
  );

  return { wrongIds, addWrong, removeWrong, recordAnswer, accuracy, stats, logResponse };
}
