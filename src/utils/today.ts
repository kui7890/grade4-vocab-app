import { VOCAB_DB } from "../data/vocab";
import type { VocabWord } from "../types";

// 오늘 날짜를 시드로 어휘 1개를 고른다 (하루 동안 고정).
// 대시보드와 어휘 카드 화면이 같은 단어를 보여주도록 한 곳에서 계산한다.
export function getWordOfTheDay(date: Date = new Date()): VocabWord {
  const seed = date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
  return VOCAB_DB[seed % VOCAB_DB.length];
}
