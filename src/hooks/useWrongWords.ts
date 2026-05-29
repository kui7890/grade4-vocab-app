import { useCallback, useEffect, useState } from "react";

// 오답 어휘 id 목록을 localStorage에 저장/관리하는 훅
const STORAGE_KEY = "grade4_vocab_wrong_words_v1";

function readFromStorage(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function useWrongWords() {
  const [wrongIds, setWrongIds] = useState<string[]>(() => readFromStorage());

  // 값이 바뀔 때마다 localStorage에 저장 (새로고침 후에도 유지)
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(wrongIds));
    } catch {
      // 저장 실패는 조용히 무시 (사생활 보호 모드 등)
    }
  }, [wrongIds]);

  // 오답 추가 (이미 있으면 중복 저장하지 않음)
  const addWrong = useCallback((id: string) => {
    setWrongIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, []);

  // 오답 제거 (정답을 맞히거나 복습 완료 시)
  const removeWrong = useCallback((id: string) => {
    setWrongIds((prev) => prev.filter((x) => x !== id));
  }, []);

  return { wrongIds, addWrong, removeWrong };
}
