// 앱 전체에서 공용으로 쓰는 타입 정의

// 교과명
export type Subject = "국어" | "사회" | "과학";

// 과목 필터 값 (전체 포함)
export type SubjectFilterValue = "전체" | Subject;

// 학습 모드
export type Mode = "card" | "quiz" | "review";

// 퀴즈 유형: 뜻 맞히기 / 문장 빈칸 채우기
export type QuizType = "meaning" | "fill";

// 교과 어휘 한 개의 구조
export interface VocabWord {
  id: string; // 고유 식별자 (오답 저장 시 키로 사용)
  word: string; // 학생이 배울 교과 어휘
  subject: Subject; // 교과명
  unit: string; // 관련 단원
  easy_meaning: string; // 4학년이 이해할 수 있는 쉬운 뜻
  example_sentence: string; // 어휘가 반드시 들어간 예문
  image_url: string; // 이해를 돕는 이모지
}

// 퀴즈 한 문항의 구조
export interface QuizQuestion {
  type: QuizType;
  answer: VocabWord; // 정답 어휘
  options: VocabWord[]; // 보기 4개 (정답 1 + 오답 3)
}
