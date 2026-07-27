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

// ── 교사 대시보드 (P4) ─────────────────────────────────────
export interface TopWrongWord {
  word_id: string;
  subject: string;
  wrong_count: number;
  total: number;
  student_count: number;
}

export interface NeedHelpStudent {
  student_id: string;
  username: string;
  anon_code: string | null;
  attempts: number;
  correct: number;
  wrong_count: number;
}

export interface TeacherOverview {
  student_count: number;
  attempts: number;
  correct: number;
  active_7d: number;
  wrong_total: number;
  top_wrong_words: TopWrongWord[];
  need_help: NeedHelpStudent[];
}

export async function adminGetOverview(pin: string): Promise<TeacherOverview> {
  const sb = requireClient();
  const { data, error } = await sb.rpc("admin_get_overview", { p_pin: pin });
  if (error) throw new Error(error.message);
  const d = (data ?? {}) as Partial<TeacherOverview>;
  return {
    student_count: d.student_count ?? 0,
    attempts: d.attempts ?? 0,
    correct: d.correct ?? 0,
    active_7d: d.active_7d ?? 0,
    wrong_total: d.wrong_total ?? 0,
    top_wrong_words: d.top_wrong_words ?? [],
    need_help: d.need_help ?? [],
  };
}

export interface StudentRow {
  student_id: string;
  username: string;
  anon_code: string | null;
  attempts: number;
  correct: number;
  wrong_count: number;
  repeat_wrong: number;
  reviewed_count: number;
  last_active: string | null;
  created_at: string;
}

export async function adminListStudentsDetail(pin: string): Promise<StudentRow[]> {
  const sb = requireClient();
  const { data, error } = await sb.rpc("admin_list_students_detail", { p_pin: pin });
  if (error) throw new Error(error.message);
  return (data ?? []) as StudentRow[];
}

export interface StudentDetail {
  profile: {
    student_id: string;
    username: string;
    anon_code: string | null;
    created_at: string;
    attempts: number;
    correct: number;
    last_active: string | null;
    wrong_count: number;
    reviewed_count: number;
    mastered_words: number;
  };
  subjects: {
    subject: string;
    attempts: number;
    correct: number;
    attempted_words: number;
    mastered_words: number;
  }[];
  weak_units: { subject: string; unit: string; attempts: number; wrong_count: number }[];
  repeat_words: {
    word_id: string;
    subject: string;
    wrong_count: number;
    correct_count: number;
    status: string;
  }[];
  recent: {
    word_id: string;
    subject: string;
    unit: string | null;
    quiz_type: string;
    is_correct: boolean;
    created_at: string;
  }[];
  daily: { day: string; attempts: number; correct: number }[];
}

export async function adminGetStudentDetail(pin: string, studentId: string): Promise<StudentDetail> {
  const sb = requireClient();
  const { data, error } = await sb.rpc("admin_get_student_detail", {
    p_pin: pin,
    p_student_id: studentId,
  });
  if (error) throw new Error(error.message);
  return data as StudentDetail;
}

// ── 오답 분석 (P5) ─────────────────────────────────────────
export interface WrongWordRow {
  word_id: string;
  subject: string;
  unit: string;
  wrong_count: number;
  total: number;
  student_count: number;
}

export interface WrongAnalysis {
  words: WrongWordRow[];
  subjects: { subject: string; total: number; wrong_count: number }[];
  units: { subject: string; unit: string; total: number; wrong_count: number }[];
  students: {
    student_id: string;
    username: string;
    anon_code: string | null;
    word_id: string;
    subject: string;
    wrong_count: number;
  }[];
  filters: { subject: string; unit: string }[];
}

export async function adminGetWrongAnalysis(
  pin: string,
  subject?: string | null,
  unit?: string | null
): Promise<WrongAnalysis> {
  const sb = requireClient();
  const { data, error } = await sb.rpc("admin_get_wrong_analysis", {
    p_pin: pin,
    p_subject: subject ?? null,
    p_unit: unit ?? null,
  });
  if (error) throw new Error(error.message);
  const d = (data ?? {}) as Partial<WrongAnalysis>;
  return {
    words: d.words ?? [],
    subjects: d.subjects ?? [],
    units: d.units ?? [],
    students: d.students ?? [],
    filters: d.filters ?? [],
  };
}

// ── 학습 배정 (P5) ─────────────────────────────────────────
export interface Assignment {
  id: string;
  title: string;
  set_type: "subject" | "review";
  subject: string | null;
  word_ids: string[];
  word_count: number;
  due_date: string | null;
  created_at: string;
  target_student_id?: string | null;
  target_username?: string | null;
  target_count?: number;
  done_count?: number;
  // 학생용 필드
  completed?: boolean;
  score?: number | null;
  total?: number | null;
}

export async function adminCreateAssignment(params: {
  pin: string;
  title: string;
  studentId: string | null;
  setType: "subject" | "review";
  subject: string | null;
  wordIds: string[];
  dueDate: string | null;
}): Promise<string> {
  const sb = requireClient();
  const { data, error } = await sb.rpc("admin_create_assignment", {
    p_pin: params.pin,
    p_title: params.title,
    p_student_id: params.studentId,
    p_set_type: params.setType,
    p_subject: params.subject,
    p_word_ids: params.wordIds,
    p_due_date: params.dueDate,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

export async function adminListAssignments(pin: string): Promise<Assignment[]> {
  const sb = requireClient();
  const { data, error } = await sb.rpc("admin_list_assignments", { p_pin: pin });
  if (error) throw new Error(error.message);
  return (data ?? []) as Assignment[];
}

export async function adminDeleteAssignment(pin: string, assignmentId: string): Promise<void> {
  const sb = requireClient();
  const { error } = await sb.rpc("admin_delete_assignment", {
    p_pin: pin,
    p_assignment_id: assignmentId,
  });
  if (error) throw new Error(error.message);
}

// 학생: 나에게 배정된 학습 목록
export async function getAssignments(studentId: string): Promise<Assignment[]> {
  const sb = requireClient();
  const { data, error } = await sb.rpc("get_assignments", { p_student_id: studentId });
  if (error) throw new Error(error.message);
  return (data ?? []) as Assignment[];
}

// 학생: 배정 학습 완료 처리
export async function completeAssignment(
  assignmentId: string,
  studentId: string,
  score: number,
  total: number
): Promise<void> {
  const sb = requireClient();
  const { error } = await sb.rpc("complete_assignment", {
    p_assignment_id: assignmentId,
    p_student_id: studentId,
    p_score: score,
    p_total: total,
  });
  if (error) throw new Error(error.message);
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

// ── 오답 노트 상세 / 복습 완료 (P3) ────────────────────────
export interface WrongNote {
  word_id: string;
  wrong_count: number;
  correct_count: number;
  added_at: string;
  last_seen_at: string | null;
}

// 반복해서 틀린 단어부터 정렬해서 돌려준다.
export async function getWrongNotes(studentId: string): Promise<WrongNote[]> {
  const sb = requireClient();
  const { data, error } = await sb.rpc("get_wrong_notes", { p_student_id: studentId });
  if (error) throw new Error(error.message);
  return (data ?? []) as WrongNote[];
}

// 복습 완료: 기록을 남기고 오답 목록에서 제거한다.
export async function completeReviewRemote(studentId: string, wordId: string): Promise<void> {
  const sb = requireClient();
  const { error } = await sb.rpc("complete_review", {
    p_student_id: studentId,
    p_word_id: wordId,
  });
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

// ── 퀴즈 응답 세분화 로그 + 단어 숙달 (P1) ─────────────────
export interface QuizResponseInput {
  studentId: string;
  wordId: string;
  subject: string;
  unit: string;
  quizType: "meaning" | "fill";
  isCorrect: boolean;
  chosenWordId: string | null;
}

export async function recordQuizResponse(r: QuizResponseInput): Promise<void> {
  const sb = requireClient();
  const { error } = await sb.rpc("record_quiz_response", {
    p_student_id: r.studentId,
    p_word_id: r.wordId,
    p_subject: r.subject,
    p_unit: r.unit,
    p_quiz_type: r.quizType,
    p_is_correct: r.isCorrect,
    p_chosen_word_id: r.chosenWordId,
  });
  if (error) throw new Error(error.message);
}

// ── 개별화 학습 세트 (P2) ──────────────────────────────────
export type PersonalizedReason = "wrong" | "learning" | "new" | "mastered";

export interface PersonalizedItem {
  word_id: string;
  reason: PersonalizedReason;
}

// 오답 > 낮은 정답률 > 미학습 순으로 학습할 단어를 골라 온다.
export async function getPersonalizedSet(
  studentId: string,
  wordIds: string[],
  size = 8
): Promise<PersonalizedItem[]> {
  const sb = requireClient();
  const { data, error } = await sb.rpc("get_personalized_set", {
    p_student_id: studentId,
    p_word_ids: wordIds,
    p_size: size,
  });
  if (error) throw new Error(error.message);
  return (data ?? []) as PersonalizedItem[];
}

// ── 학생 대시보드 (P1) ─────────────────────────────────────
export interface DashboardSubject {
  subject: string;
  attempts: number;
  correct: number;
  attempted_words: number;
  mastered_words: number;
}

export interface DashboardData {
  attempts: number;
  correct: number;
  wrong_count: number;
  repeat_wrong_count: number; // 2회 이상 틀린 반복 오답 수
  reviewed_count: number; // 복습 완료 누적 횟수
  streak: number;
  recent_wrong: string[]; // 최근 오답 word_id 목록
  subjects: DashboardSubject[];
}

export async function getStudentDashboard(studentId: string): Promise<DashboardData> {
  const sb = requireClient();
  const { data, error } = await sb.rpc("get_student_dashboard", { p_student_id: studentId });
  if (error) throw new Error(error.message);
  const d = (data ?? {}) as Partial<DashboardData>;
  return {
    attempts: d.attempts ?? 0,
    correct: d.correct ?? 0,
    wrong_count: d.wrong_count ?? 0,
    repeat_wrong_count: d.repeat_wrong_count ?? 0,
    reviewed_count: d.reviewed_count ?? 0,
    streak: d.streak ?? 0,
    recent_wrong: d.recent_wrong ?? [],
    subjects: d.subjects ?? [],
  };
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
