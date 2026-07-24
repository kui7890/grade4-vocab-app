import type { QuizQuestion, QuizType, VocabWord } from "../types";

// 배열을 무작위로 섞어 새 배열로 돌려준다 (Fisher–Yates)
export function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// 특정 어휘 하나로 문항을 만든다 (오답 3개는 pool에서 무작위).
// 오답 후보가 3개 미만이면 만들 수 없으므로 null.
export function buildQuestionFor(answer: VocabWord, pool: VocabWord[]): QuizQuestion | null {
  const distractors = shuffle(pool.filter((w) => w.id !== answer.id)).slice(0, 3);
  if (distractors.length < 3) return null;
  const options = shuffle([answer, ...distractors]);
  const type: QuizType = Math.random() < 0.5 ? "meaning" : "fill";
  return { type, answer, options };
}

// 어휘 목록으로 퀴즈 문항들을 만든다.
// - count: 만들 문항 수 (어휘가 부족하면 가능한 만큼)
// - 보기: 정답 1개 + 오답 3개 (같은 후보 풀에서 무작위)
export function buildQuiz(words: VocabWord[], count: number): QuizQuestion[] {
  // 보기를 4개 만들려면 최소 4개의 어휘가 필요하다.
  if (words.length < 4) return [];

  const picked = shuffle(words).slice(0, Math.min(count, words.length));

  return picked
    .map((answer) => buildQuestionFor(answer, words))
    .filter((q): q is QuizQuestion => q !== null);
}

// 예문에서 어휘를 빈칸(________)으로 바꾼 문장을 만든다.
export function makeBlankSentence(word: VocabWord): string {
  if (word.example_sentence.includes(word.word)) {
    return word.example_sentence.split(word.word).join("________");
  }
  // 예문에 어휘가 없으면(데이터 실수 대비) 문장 끝에 빈칸을 둔다.
  return word.example_sentence + " (________)";
}
