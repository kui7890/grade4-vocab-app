-- ============================================================
-- P5 확장: 오답 분석 + 개별화 학습 배정
-- ------------------------------------------------------------
-- 적용: Supabase SQL Editor → New query → 전체 붙여넣기 → Run
-- ============================================================

-- ── 1) 교사 배정 학습 세트 ─────────────────────────────────
create table if not exists public.assignments (
  id                uuid primary key default gen_random_uuid(),
  title             text not null,
  target_student_id uuid references public.students(id) on delete cascade, -- null = 전체 학생
  set_type          text not null default 'subject' check (set_type in ('subject','review')),
  subject           text,                       -- null = 교과 무관
  word_ids          jsonb not null default '[]'::jsonb,
  due_date          date,
  created_at        timestamptz not null default now()
);
create index if not exists idx_asg_target on public.assignments(target_student_id);

-- ── 2) 배정 수행 상태 ──────────────────────────────────────
create table if not exists public.assignment_progress (
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  student_id    uuid not null references public.students(id) on delete cascade,
  score         int,
  total         int,
  completed_at  timestamptz not null default now(),
  primary key (assignment_id, student_id)
);

alter table public.assignments         enable row level security;
alter table public.assignment_progress enable row level security;
-- 직접 접근은 차단하고 아래 SECURITY DEFINER 함수로만 사용한다.

-- ============================================================
-- 3) 오답 분석 (교사용, PIN 필요)
--    p_subject / p_unit 은 null 이면 전체
-- ============================================================
create or replace function public.admin_get_wrong_analysis(
  p_pin     text,
  p_subject text default null,
  p_unit    text default null
)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_words    jsonb := '[]'::jsonb;
  v_subjects jsonb := '[]'::jsonb;
  v_units    jsonb := '[]'::jsonb;
  v_students jsonb := '[]'::jsonb;
  v_filters  jsonb := '[]'::jsonb;
begin
  if p_pin <> '20260606' then raise exception 'INVALID_PIN'; end if;

  -- 어휘별 오답 (오답 횟수 많은 순)
  select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) into v_words
  from (
    select
      qr.word_id,
      qr.subject,
      coalesce(qr.unit, '-') as unit,
      count(*) filter (where not qr.is_correct) as wrong_count,
      count(*)                                  as total,
      count(distinct qr.student_id) filter (where not qr.is_correct) as student_count
    from quiz_responses qr
    where (p_subject is null or qr.subject = p_subject)
      and (p_unit    is null or qr.unit    = p_unit)
    group by qr.word_id, qr.subject, coalesce(qr.unit, '-')
    having count(*) filter (where not qr.is_correct) > 0
    order by count(*) filter (where not qr.is_correct) desc, count(*) desc
    limit 30
  ) t;

  -- 교과별 오답률
  select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) into v_subjects
  from (
    select
      qr.subject,
      count(*)                                  as total,
      count(*) filter (where not qr.is_correct) as wrong_count
    from quiz_responses qr
    where (p_subject is null or qr.subject = p_subject)
      and (p_unit    is null or qr.unit    = p_unit)
    group by qr.subject
    order by qr.subject
  ) t;

  -- 단원별 오답률
  select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) into v_units
  from (
    select
      qr.subject,
      coalesce(qr.unit, '-') as unit,
      count(*)                                  as total,
      count(*) filter (where not qr.is_correct) as wrong_count
    from quiz_responses qr
    where (p_subject is null or qr.subject = p_subject)
      and (p_unit    is null or qr.unit    = p_unit)
    group by qr.subject, coalesce(qr.unit, '-')
    having count(*) filter (where not qr.is_correct) > 0
    order by count(*) filter (where not qr.is_correct) desc
    limit 20
  ) t;

  -- 학생별 반복 오답 (2회 이상 틀린 단어)
  select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) into v_students
  from (
    select
      s.id as student_id, s.username, s.anon_code,
      m.word_id, m.subject, m.wrong_count
    from word_mastery m
    join students s on s.id = m.student_id
    where m.wrong_count >= 2
      and (p_subject is null or m.subject = p_subject)
    order by m.wrong_count desc
    limit 30
  ) t;

  -- 필터 선택지 (교과 · 단원)
  select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) into v_filters
  from (
    select distinct qr.subject, coalesce(qr.unit, '-') as unit
    from quiz_responses qr
    order by qr.subject, unit
  ) t;

  return jsonb_build_object(
    'words', v_words,
    'subjects', v_subjects,
    'units', v_units,
    'students', v_students,
    'filters', v_filters
  );
end;
$$;

-- ============================================================
-- 4) 학습 배정 (교사용, PIN 필요)
-- ============================================================
create or replace function public.admin_create_assignment(
  p_pin        text,
  p_title      text,
  p_student_id uuid,          -- null 이면 전체 학생
  p_set_type   text,
  p_subject    text,
  p_word_ids   text[],
  p_due_date   date
)
returns uuid
language plpgsql security definer set search_path = public, extensions as $$
declare v_id uuid;
begin
  if p_pin <> '20260606' then raise exception 'INVALID_PIN'; end if;
  if coalesce(array_length(p_word_ids, 1), 0) = 0 then raise exception 'NO_WORDS'; end if;

  insert into assignments(title, target_student_id, set_type, subject, word_ids, due_date)
  values (
    p_title,
    p_student_id,
    coalesce(p_set_type, 'subject'),
    p_subject,
    to_jsonb(p_word_ids),
    p_due_date
  )
  returning id into v_id;

  return v_id;
end;
$$;

-- 배정 목록 + 수행 현황
create or replace function public.admin_list_assignments(p_pin text)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare v_rows jsonb := '[]'::jsonb;
begin
  if p_pin <> '20260606' then raise exception 'INVALID_PIN'; end if;

  select coalesce(jsonb_agg(row_to_json(t) order by t.created_at desc), '[]'::jsonb) into v_rows
  from (
    select
      a.id, a.title, a.set_type, a.subject, a.word_ids, a.due_date, a.created_at,
      a.target_student_id,
      s.username as target_username,
      jsonb_array_length(a.word_ids) as word_count,
      -- 대상 학생 수 (특정 학생이면 1, 전체면 전체 학생 수)
      case when a.target_student_id is null
           then (select count(*) from students)
           else 1 end as target_count,
      (select count(*) from assignment_progress p where p.assignment_id = a.id) as done_count
    from assignments a
    left join students s on s.id = a.target_student_id
  ) t;

  return v_rows;
end;
$$;

create or replace function public.admin_delete_assignment(p_pin text, p_assignment_id uuid)
returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if p_pin <> '20260606' then raise exception 'INVALID_PIN'; end if;
  delete from assignments where id = p_assignment_id;
end;
$$;

-- ============================================================
-- 5) 학생용: 내 배정 목록 / 완료 처리
-- ============================================================
create or replace function public.get_assignments(p_student_id uuid)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare v_rows jsonb := '[]'::jsonb;
begin
  select coalesce(jsonb_agg(row_to_json(t) order by t.created_at desc), '[]'::jsonb) into v_rows
  from (
    select
      a.id, a.title, a.set_type, a.subject, a.word_ids, a.due_date, a.created_at,
      jsonb_array_length(a.word_ids) as word_count,
      (p.assignment_id is not null)  as completed,
      p.score, p.total, p.completed_at
    from assignments a
    left join assignment_progress p
      on p.assignment_id = a.id and p.student_id = p_student_id
    where a.target_student_id is null or a.target_student_id = p_student_id
  ) t;

  return v_rows;
end;
$$;

create or replace function public.complete_assignment(
  p_assignment_id uuid,
  p_student_id    uuid,
  p_score         int,
  p_total         int
)
returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  insert into assignment_progress(assignment_id, student_id, score, total)
  values (p_assignment_id, p_student_id, p_score, p_total)
  on conflict (assignment_id, student_id) do update
    set score = excluded.score,
        total = excluded.total,
        completed_at = now();
end;
$$;

-- ── 6) 실행 권한 ───────────────────────────────────────────
grant execute on function public.admin_get_wrong_analysis(text, text, text)                  to anon;
grant execute on function public.admin_create_assignment(text, text, uuid, text, text, text[], date) to anon;
grant execute on function public.admin_list_assignments(text)                                to anon;
grant execute on function public.admin_delete_assignment(text, uuid)                         to anon;
grant execute on function public.get_assignments(uuid)                                       to anon;
grant execute on function public.complete_assignment(uuid, uuid, int, int)                   to anon;
