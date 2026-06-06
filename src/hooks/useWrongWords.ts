import { useCallback, useEffect, useState } from "react";
import { addWrongWord, fetchWrongWords, removeWrongWord } from "../lib/api";

// 학생별 오답 어휘 id 목록을 Supabase에 저장/관리하는 훅.
// studentId가 null이면(미로그인) 아무 동작도 하지 않습니다.
export function useWrongWords(studentId: string | null) {
  const [wrongIds, setWrongIds] = useState<string[]>([]);

  // 로그인 학생이 바뀌면 서버에서 오답 목록을 불러옵니다.
  useEffect(() => {
    if (!studentId) {
      setWrongIds([]);
      return;
    }
    let active = true;
    fetchWrongWords(studentId)
      .then((ids) => {
        if (active) setWrongIds(ids);
      })
      .catch(() => {
        /* 네트워크 오류 시 빈 목록 유지 */
      });
    return () => {
      active = false;
    };
  }, [studentId]);

  // 오답 추가 (화면 즉시 반영 후 서버 저장 — 중복은 서버에서 무시)
  const addWrong = useCallback(
    (id: string) => {
      if (!studentId) return;
      setWrongIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
      addWrongWord(studentId, id).catch(() => {});
    },
    [studentId]
  );

  // 오답 제거 (정답을 맞히거나 복습 완료 시)
  const removeWrong = useCallback(
    (id: string) => {
      if (!studentId) return;
      setWrongIds((prev) => prev.filter((x) => x !== id));
      removeWrongWord(studentId, id).catch(() => {});
    },
    [studentId]
  );

  return { wrongIds, addWrong, removeWrong };
}
