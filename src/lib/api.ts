import { requireClient } from "./supabase";

// 로그인한 학생 정보
export interface Student {
  id: string;
  username: string;
}

// 관리자 화면에서 보여줄 학생 정보
export interface AdminStudent {
  id: string;
  username: string;
  created_at: string;
}

// ── 인증(회원가입/로그인) ──────────────────────────────────

export async function registerStudent(username: string, password: string): Promise<Student> {
  const sb = requireClient();
  const { data, error } = await sb.rpc("register_student", {
    p_username: username,
    p_password: password,
  });
  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error("REGISTER_FAILED");
  return { id: row.id, username: row.username };
}

export async function loginStudent(username: string, password: string): Promise<Student> {
  const sb = requireClient();
  const { data, error } = await sb.rpc("login_student", {
    p_username: username,
    p_password: password,
  });
  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error("INVALID_LOGIN"); // 아이디/비번 불일치
  return { id: row.id, username: row.username };
}

// ── 관리자 ─────────────────────────────────────────────────

export async function adminListStudents(pin: string): Promise<AdminStudent[]> {
  const sb = requireClient();
  const { data, error } = await sb.rpc("admin_list_students", { p_pin: pin });
  if (error) throw new Error(error.message);
  return (data ?? []) as AdminStudent[];
}

export async function adminDeleteStudent(pin: string, studentId: string): Promise<void> {
  const sb = requireClient();
  const { error } = await sb.rpc("admin_delete_student", {
    p_pin: pin,
    p_student_id: studentId,
  });
  if (error) throw new Error(error.message);
}

// ── 학생별 오답 ────────────────────────────────────────────

export async function fetchWrongWords(studentId: string): Promise<string[]> {
  const sb = requireClient();
  const { data, error } = await sb
    .from("student_wrong_words")
    .select("word_id")
    .eq("student_id", studentId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: { word_id: string }) => r.word_id);
}

export async function addWrongWord(studentId: string, wordId: string): Promise<void> {
  const sb = requireClient();
  // 같은 어휘 중복 저장 방지 (PK 충돌은 무시)
  const { error } = await sb
    .from("student_wrong_words")
    .upsert({ student_id: studentId, word_id: wordId }, { onConflict: "student_id,word_id", ignoreDuplicates: true });
  if (error) throw new Error(error.message);
}

export async function removeWrongWord(studentId: string, wordId: string): Promise<void> {
  const sb = requireClient();
  const { error } = await sb
    .from("student_wrong_words")
    .delete()
    .eq("student_id", studentId)
    .eq("word_id", wordId);
  if (error) throw new Error(error.message);
}

// ── 학생별 통계 ────────────────────────────────────────────

export interface StatsRow {
  attempts: number;
  correct: number;
}

export async function fetchStats(studentId: string): Promise<StatsRow> {
  const sb = requireClient();
  const { data, error } = await sb
    .from("student_stats")
    .select("attempts, correct")
    .eq("student_id", studentId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return { attempts: data?.attempts ?? 0, correct: data?.correct ?? 0 };
}

export async function recordAnswerRemote(studentId: string, isCorrect: boolean): Promise<void> {
  const sb = requireClient();
  const { error } = await sb.rpc("record_answer", {
    p_student_id: studentId,
    p_correct: isCorrect,
  });
  if (error) throw new Error(error.message);
}

// ── 에러 코드 → 한국어 안내 메시지 ─────────────────────────
export function friendlyError(message: string): string {
  if (message.includes("SUPABASE_NOT_CONFIGURED"))
    return "서버 접속 정보가 설정되지 않았습니다. 선생님께 문의하세요.";
  if (message.includes("USERNAME_TAKEN")) return "이미 사용 중인 아이디예요. 다른 아이디를 입력하세요.";
  if (message.includes("USERNAME_TOO_SHORT")) return "아이디는 2글자 이상 입력하세요.";
  if (message.includes("PASSWORD_TOO_SHORT")) return "비밀번호는 4글자 이상 입력하세요.";
  if (message.includes("INVALID_LOGIN")) return "아이디 또는 비밀번호가 맞지 않아요.";
  if (message.includes("INVALID_PIN")) return "관리자 PIN 번호가 맞지 않습니다.";
  return "문제가 발생했어요. 잠시 후 다시 시도해 주세요.";
}
