-- ============================================================
-- P1 확장: 문항 단위 로그(quiz_responses) + 단어 숙달(word_mastery)
--          + 학생 익명 ID(anon_code) + 대시보드 RPC
-- ------------------------------------------------------------
-- 적용: Supabase SQL Editor → New query → 전체 붙여넣기 → Run
-- (기존 schema.sql 위에 추가로 실행. 안전하게 덮어쓰도록 작성됨)
-- ============================================================

-- ── 1) 학생 익명 ID(연구용) ────────────────────────────────
alter table public.students add column if not exists anon_code text;

create sequence if not exists public.student_anon_seq start 1;

-- 기존 학생 중 anon_code 없는 경우 가입 순서대로 S001… 부여
do $$
declare r record;
begin
  for r in select id from public.students where anon_code is null order by created_at loop
    update public.students
      set anon_code = 'S' || lpad(nextval('public.student_anon_seq')::text, 3, '0')
      where id = r.id;
  end loop;
end $$;

-- ── 2) 문항 단위 응답 로그 (분석 핵심) ─────────────────────
create table if not exists public.quiz_responses (
  id            bigint generated always as identity primary key,
  student_id    uuid not null references public.students(id) on delete cascade,
  word_id       text not null,
  subject       text not null,
  unit          text,
  quiz_type     text not null check (quiz_type in ('meaning','fill')),
  is_correct    boolean not null,
  chosen_word_id text,
  created_at    timestamptz not null default now()
);
create index if not exists idx_qr_student on public.quiz_responses(student_id, created_at);
create index if not exists idx_qr_word on public.quiz_responses(word_id);

-- ── 3) 학생×단어 숙달 상태 ─────────────────────────────────
create table if not exists public.word_mastery (
  student_id          uuid not null references public.students(id) on delete cascade,
  word_id             text not null,
  subject             text not null,
  status              text not null default 'learning' check (status in ('new','learning','mastered')),
  correct_count       int not null default 0,
  wrong_count         int not null default 0,
  consecutive_correct int not null default 0,   -- 연속 정답 (2회 연속이면 숙달)
  last_result         boolean,
  last_seen_at        timestamptz not null default now(),
  primary key (student_id, word_id)
);
create index if not exists idx_wm_student on public.word_mastery(student_id, subject);

-- ── 4) RLS: 직접 접근 차단, RPC(SECURITY DEFINER)로만 ──────
alter table public.quiz_responses enable row level security;
alter table public.word_mastery   enable row level security;

-- ============================================================
-- 5) 회원가입 함수: anon_code 자동 부여 포함 (덮어쓰기)
-- ============================================================
create or replace function public.register_student(p_username text, p_password text)
returns table(id uuid, username text)
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_username text := trim(p_username);
  v_id uuid;
begin
  if length(v_username) < 2 then raise exception 'USERNAME_TOO_SHORT'; end if;
  if length(p_password) < 4 then raise exception 'PASSWORD_TOO_SHORT'; end if;
  if exists (select 1 from students s where lower(s.username) = lower(v_username)) then
    raise exception 'USERNAME_TAKEN';
  end if;

  insert into students(username, password_hash, anon_code)
  values (v_username, extensions.crypt(p_password, extensions.gen_salt('bf')),
          'S' || lpad(nextval('student_anon_seq')::text, 3, '0'))
  returning students.id into v_id;

  insert into student_stats(student_id) values (v_id) on conflict do nothing;

  return query select s.id, s.username from students s where s.id = v_id;
end;
$$;

-- ============================================================
-- 6) 퀴즈 응답 기록: quiz_responses + word_mastery 갱신
--    (student_stats / student_wrong_words 는 기존 경로 유지)
-- ============================================================
create or replace function public.record_quiz_response(
  p_student_id    uuid,
  p_word_id       text,
  p_subject       text,
  p_unit          text,
  p_quiz_type     text,
  p_is_correct    boolean,
  p_chosen_word_id text
) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  insert into quiz_responses(student_id, word_id, subject, unit, quiz_type, is_correct, chosen_word_id)
  values (p_student_id, p_word_id, p_subject, p_unit, p_quiz_type, p_is_correct, p_chosen_word_id);

  insert into word_mastery(student_id, word_id, subject, status, correct_count, wrong_count,
                           consecutive_correct, last_result, last_seen_at)
  values (
    p_student_id, p_word_id, p_subject,
    'learning',
    case when p_is_correct then 1 else 0 end,
    case when p_is_correct then 0 else 1 end,
    case when p_is_correct then 1 else 0 end,
    p_is_correct, now()
  )
  on conflict (student_id, word_id) do update set
    correct_count       = word_mastery.correct_count + (case when p_is_correct then 1 else 0 end),
    wrong_count         = word_mastery.wrong_count + (case when p_is_correct then 0 else 1 end),
    consecutive_correct = case when p_is_correct then word_mastery.consecutive_correct + 1 else 0 end,
    last_result         = p_is_correct,
    last_seen_at        = now(),
    status              = case
                            when p_is_correct and (word_mastery.consecutive_correct + 1) >= 2 then 'mastered'
                            else 'learning'
                          end;
end;
$$;

-- ============================================================
-- 7) 학생 대시보드 데이터 (한 번에 반환)
-- ============================================================
create or replace function public.get_student_dashboard(p_student_id uuid)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_attempts int := 0;
  v_correct  int := 0;
  v_wrong    int := 0;
  v_recent   jsonb := '[]'::jsonb;
  v_subjects jsonb := '[]'::jsonb;
  v_streak   int := 0;
  v_day      date;
  v_has_today boolean;
begin
  select coalesce(attempts,0), coalesce(correct,0)
    into v_attempts, v_correct
    from student_stats where student_id = p_student_id;

  select count(*) into v_wrong from student_wrong_words where student_id = p_student_id;

  -- 최근 오답 word_id 5개
  select coalesce(jsonb_agg(word_id), '[]'::jsonb) into v_recent
  from (
    select word_id from student_wrong_words
    where student_id = p_student_id
    order by created_at desc limit 5
  ) t;

  -- 교과별 집계
  select coalesce(jsonb_agg(row_to_json(s)), '[]'::jsonb) into v_subjects
  from (
    select
      qr.subject as subject,
      count(*) as attempts,
      count(*) filter (where qr.is_correct) as correct,
      (select count(*) from word_mastery wm
         where wm.student_id = p_student_id and wm.subject = qr.subject) as attempted_words,
      (select count(*) from word_mastery wm
         where wm.student_id = p_student_id and wm.subject = qr.subject and wm.status = 'mastered') as mastered_words
    from quiz_responses qr
    where qr.student_id = p_student_id
    group by qr.subject
  ) s;

  -- 연속 학습일 (Asia/Seoul 기준). 오늘 활동 없으면 어제부터 카운트.
  v_day := (now() at time zone 'Asia/Seoul')::date;
  select exists(
    select 1 from quiz_responses
    where student_id = p_student_id
      and (created_at at time zone 'Asia/Seoul')::date = v_day
  ) into v_has_today;
  if not v_has_today then v_day := v_day - 1; end if;
  loop
    exit when not exists(
      select 1 from quiz_responses
      where student_id = p_student_id
        and (created_at at time zone 'Asia/Seoul')::date = v_day
    );
    v_streak := v_streak + 1;
    v_day := v_day - 1;
  end loop;

  return jsonb_build_object(
    'attempts', v_attempts,
    'correct', v_correct,
    'wrong_count', v_wrong,
    'streak', v_streak,
    'recent_wrong', v_recent,
    'subjects', v_subjects
  );
end;
$$;

-- ── 8) 함수 실행 권한 ──────────────────────────────────────
grant execute on function public.register_student(text, text) to anon;
grant execute on function public.record_quiz_response(uuid, text, text, text, text, boolean, text) to anon;
grant execute on function public.get_student_dashboard(uuid) to anon;
