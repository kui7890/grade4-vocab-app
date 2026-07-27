import { VOCAB_DB } from "../data/vocab";
import type { VocabWord } from "../types";

// word_id → 어휘 정보 (DB는 id만 저장하므로 화면 표시용으로 변환한다)
export const WORD_BY_ID = new Map<string, VocabWord>(VOCAB_DB.map((w) => [w.id, w]));

// 어휘명 (없으면 id 그대로 — 데이터에서 삭제된 어휘 대비)
export function wordLabel(id: string): string {
  return WORD_BY_ID.get(id)?.word ?? id;
}

// 날짜를 짧게 표시 (2026. 7. 24.)
export function formatDate(value: string | null): string {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("ko-KR");
}

// 정답률(%) — 시도가 없으면 "-"
export function accuracyText(correct: number, attempts: number): string {
  if (!attempts) return "-";
  return `${Math.round((correct / attempts) * 100)}%`;
}
