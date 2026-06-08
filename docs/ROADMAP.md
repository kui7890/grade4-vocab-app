# 대시보드 중심 교과 어휘 학습 웹앱 — 개발 로드맵

> 목표: 기존 학습 기능(카드·퀴즈·오답·로그인·통계)을 유지하면서, 학생 진입점을
> **학생용 대시보드**로 바꾸고, 관리자 패널을 **교사용 대시보드**로 확장한다.
> 학생은 "오늘 무엇을 학습할지" 즉시 알 수 있고, 교사는 어휘 이해도·오답 양상을
> 수업 지도 및 **논문 분석 자료**로 활용한다.

---

## 0. 현재 상태 (기준선)

- **프론트엔드**: React + Vite + TypeScript. `App.tsx`가 `mode`("card"|"quiz"|"review")로 화면 전환.
- **인증**: 커스텀(아이디+비밀번호). `AuthProvider`가 `{id, username}` 세션을 localStorage에 저장. 비밀번호는 bcrypt 해시, 검증은 Supabase SECURITY DEFINER 함수.
- **DB(Supabase)**: `students`, `student_wrong_words`, `student_stats` + RPC(`register_student`, `login_student`, `record_answer`, `admin_list_students`, `admin_delete_student`). PIN(`20260606`)은 서버 함수에서 검증.
- **어휘 데이터**: `src/data/vocab.ts`의 정적 `VOCAB_DB`(국어/사회/과학 각 9개, 총 27개). 각 단어 `id, word, subject, unit, easy_meaning, example_sentence, image_url`.
- **관리자**: `AdminPanel`(PIN 게이트 → 학생 목록/삭제) 모달.
- **배포**: GitHub(kui7890/grade4-vocab-app) → Vercel 자동 배포. 접속 키는 Vercel 환경변수로 관리.

핵심 제약: 어휘는 코드(`VOCAB_DB`)에 유지하되, 학생별 상태/응답은 `word_id`(text) 기준으로 DB에 기록한다. (어휘를 DB로 이전하지 않아도 분석 가능)

---

## 1. 아키텍처 변경 개요

### 1.1 화면 전환(라우팅) — **`react-router-dom` 도입 확정**
- 학생 로그인 후 **기본 진입점 = 학생 대시보드**(`/`). 상단 내비게이션으로 `대시보드 / 어휘 카드 / 퀴즈 / 오답 복습` 이동.
- 라우트 예시: `/`(대시보드), `/cards`, `/quiz`, `/review`, `/learn`(개별화 세션), `/teacher`(교사 대시보드, PIN 게이트), `/teacher/student/:id`(상세).
- 교사 대시보드는 PIN 게이트 후 **탭 구조**(`전체 현황 / 학생별 현황 / 오답 분석 / 학습 배정 / 자료 내보내기`).
- Vercel SPA 라우팅: 기존 `vercel.json`의 rewrite로 새로고침/딥링크 정상 동작(추가 설정 불필요).

### 1.2 데이터 흐름 원칙
- 학생 행동(퀴즈 응답·세션)은 **단일 RPC**로 기록하여 여러 테이블을 한 트랜잭션에서 갱신(정합성 보장).
- 교사 분석/내보내기는 **PIN 게이트 RPC**로만 접근(공개 anon 키로 전체 데이터가 노출되지 않도록 민감 테이블은 직접 select 차단).

---

## 2. Supabase 스키마 확장 (`supabase/schema_v2.sql`, 추가형 마이그레이션)

기존 테이블은 유지하고 아래를 추가한다.

| 테이블 | 목적 | 핵심 컬럼 |
|---|---|---|
| `quiz_responses` | 문항 단위 응답 로그(분석 핵심) | id, student_id, word_id, subject, unit, quiz_type('meaning'\|'fill'), is_correct, chosen_word_id, session_id, created_at |
| `word_mastery` | 학생×단어 숙달 상태 | student_id, word_id, subject, status('new'\|'learning'\|'mastered'), correct_count, wrong_count, last_result, last_seen_at, **PK(student_id, word_id)** |
| `learning_sessions` | 학습 세션(연속일·횟수·마지막 학습일) | id, student_id, type('today'\|'personalized'\|'review'\|'quiz'\|'assignment'), words_count, correct_count, started_at, ended_at |
| `assignments` | 교사 배정 학습 세트 | id, created_by, target_student_id(null=전체), subject(null=무관), set_type('subject'\|'review'), word_ids(jsonb), title, due_date, created_at |
| `assignment_progress` | 배정 수행 상태 | assignment_id, student_id, completed_at, score |

> ⛔ **범위 제외(결정)**: 사전-사후 평가(`assessments`)와 설문(`surveys`)은 이번 개발 범위에서 제외한다. (단어 숙달·오답·학습 기록 분석에 집중)

추가 사항:
- `students`에 `anon_code`(연구 익명 ID, 예: `S001`) 컬럼 추가 — 가입 시 자동 부여.
- **숙달 규칙(기본값, 조정 가능)**: 마지막 2회 연속 정답 → `mastered`; 한 번이라도 시도했으나 미숙달 → `learning`; 미시도 → `new`(= 미학습).
- **오답 소스 일원화**: 기존 `student_wrong_words`는 유지하되 `record_quiz_response` 안에서 함께 갱신(정답 시 제거). "반복 오답"은 `quiz_responses` 집계로 산출.

### RLS/보안
- `quiz_responses`, `word_mastery`, `learning_sessions`, `assessments` 등은 anon **직접 select 차단**.
- 학생 쓰기/자기 데이터 읽기는 `student_id`를 받는 SECURITY DEFINER RPC로 처리.
- 교사 읽기/집계/내보내기는 **PIN 게이트 RPC**로만.
- (한계) 현재 커스텀 인증상 학생이 타인 `student_id`를 추측해 자기 RPC를 호출할 여지가 있음 → 교실용으로 수용. 강화가 필요하면 로그인 시 발급 토큰 검증 추가(후속 과제).

---

## 3. RPC 설계

### 학생용
- `record_quiz_response(...)` — 응답 1건 기록 + `word_mastery`/`student_stats`/`student_wrong_words` 동시 갱신.
- `start_session(student_id, type)` / `end_session(session_id, words_count, correct_count)`.
- `get_student_dashboard(student_id)` — 이름·정답률·오답수·연속학습일·교과별 진행·최근 오답(3~5)·오늘의 단어·최근 결과를 한 번에 반환.
- `get_personalized_set(student_id, size)` — 우선순위(오답 > 낮은 정답률 > 미학습)로 5~10개 단어 id 반환.
- `get_assignments(student_id)` — 활성 배정 세트.

### 교사용(PIN 게이트)
- `admin_get_overview(pin)` — 전체 학생수·평균 정답률·총 학습횟수·최다 오답 단어·도움 필요 학생.
- `admin_list_students_detail(pin)` — 학생별 정답률·학습횟수·오답수·마지막 학습일.
- `admin_get_student_detail(pin, student_id)` — 교과별 성취·단원별 취약 어휘·반복 오답·학습 이력.
- `admin_get_wrong_analysis(pin, {subject?, unit?})` — 전체/교과/단원별 최다 오답, 학생별 반복 오답.
- `admin_create_assignment(pin, ...)` / `admin_list_assignments(pin)`.
- `admin_export_research(pin)` — 익명 ID 기준 퀴즈 응답·오답·학습 세션 통합 행 반환(CSV 생성용).

---

## 4. 프론트엔드 컴포넌트

### 학생
- `StudentDashboard`(로그인 후 기본): `TodayWord`, `PersonalizedStart`, `WrongNotePreview`, `SubjectProgress`, `RecentResults`, 성장 중심 피드백 문구.
- `PersonalizedSession`: `get_personalized_set` → 기존 `Flashcard`/`Quiz` 재사용해 5~10분 세트 진행.
- `Quiz`를 `record_quiz_response` 사용으로 전환(세션 id 포함).
- 디자인: 큰 버튼·짧은 문장·"다음 행동" 1개 강조(기초학력 미달 학생 기준).

### 교사
- `TeacherDashboard`(기존 `AdminPanel` 대체/확장): **단일 PIN(20260606)** 게이트 후 5개 탭.
  - `OverviewTab`, `StudentsTab`→`StudentDetail`, `WrongAnalysisTab`, `AssignmentsTab`, `ExportTab`.
  - 기존 학생 삭제 기능은 `StudentsTab`에 통합 유지.
- CSV: 외부 라이브러리 없이 문자열 생성 + `Blob` 다운로드(엑셀 한글 깨짐 방지 위해 UTF-8 BOM 추가).
- 디자인: 표·필터·다운로드 중심, 수치 빠른 확인.

---

## 5. 단계별 실행 계획 (우선순위 반영)

| 단계 | 범위 | 산출물 |
|---|---|---|
| **P0. 라우팅 도입** | `react-router-dom` 설치, `App`을 라우트 구조로 재구성(학생/교사 분리, SPA rewrite 확인). | 기존 기능 유지한 채 URL 기반 화면 전환 |
| **P1. 데이터 기반 + 학생 대시보드** | `schema_v2.sql`(quiz_responses, word_mastery, learning_sessions, anon_code) + `record_quiz_response`/`get_student_dashboard` RPC. Quiz를 새 기록 방식으로 전환. `StudentDashboard` 기본 진입(`/`). | 로그인 → 대시보드 진입, 정답률/오답/연속일/교과진행 표시 |
| **P2. 오늘의 단어 + 개별화 학습** | `get_personalized_set` + `PersonalizedSession`. 오늘의 단어 영역에 듣기·퀴즈 연결. | "개별화 학습 시작" 버튼으로 맞춤 5~10개 세트 진행 |
| **P3. 오답 노트 고도화** | 최근 오답·반복 오답·복습 완료 상태. 대시보드 미리보기 ↔ 오답 복습 연결. | 반복 오답 강조, 복습 완료 반영 |
| **P4. 교사 대시보드: 전체+학생별** | `TeacherDashboard` 골격, `admin_get_overview`, `admin_list_students_detail`, `admin_get_student_detail`. | 전체 현황·학생 목록·학생 상세 |
| **P5. 오답 분석 + 학습 배정** | `admin_get_wrong_analysis`, `assignments`/`assignment_progress`, `admin_create_assignment`, 학생측 `get_assignments` 노출. | 오답 분석 화면, 배정→학생 수행 |
| **P6. 연구용 CSV 내보내기** | `admin_export_research` + CSV 다운로드(UTF-8 BOM). | 익명 ID·퀴즈 응답·오답·학습 세션 CSV |

각 단계는 **DB(RPC) → 프론트 → Preview/curl 검증 → 커밋·배포** 순으로 닫는다.

---

## 6. 테스트 계획

- 학생 로그인 시 대시보드가 먼저 보이고 오늘의 단어/개별화 학습을 즉시 시작 가능한지.
- 퀴즈 오답이 `quiz_responses`·`word_mastery`·오답 노트·대시보드에 반영되는지.
- 개별화 세트가 오답>저정답률>미학습 순으로 구성되는지.
- 교사 화면 3종(전체/학생별/오답분석)이 동일 데이터 흐름을 일관되게 보여주는지.
- CSV에 익명 ID·퀴즈 응답·학습기록·오답기록이 포함되고 엑셀에서 한글이 정상 표시되는지.
- 회귀: 기존 카드/퀴즈/오답/로그인/관리자 삭제가 계속 동작하는지.
- 검증 도구: Preview MCP(UI), curl로 RPC 직접 호출, Vercel 배포 후 운영 번들 확인.

---

## 7. 결정 사항 (확정)

| 항목 | 결정 |
|---|---|
| 사전-사후 평가 | ❌ **범위 제외** |
| 설문 기능 | ❌ **범위 제외** |
| 화면 전환 방식 | ✅ **`react-router-dom` 도입** |
| 교사 인증 | ✅ **단일 PIN(20260606) 유지** |

남은 소소한 기본값(변경 원하면 알려주세요):
- **숙달 기준**: 마지막 2회 연속 정답 = `mastered` (기본 적용).
- **익명 ID 규칙**: 가입 순번 기반 `S001…` (기본 적용).

---

## 8. 리스크 / 메모

- 공개 anon 키 환경에서 연구 데이터 보호 → 교사 데이터는 반드시 PIN RPC 경유.
- `record_answer`(기존)와 `record_quiz_response`(신규) 병행 기간 → 전환 완료 후 구함수 정리.
- `VOCAB_DB` 단어 추가/변경 시 `word_id` 안정성 유지 필수(분석 연속성).
- 데이터가 늘면 집계 RPC 성능 → 필요한 인덱스(student_id, word_id, created_at) 추가.
