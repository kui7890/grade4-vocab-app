-- ============================================================
-- P4 확장: 교사용 대시보드 (전체 현황 · 학생별 현황 · 학생 상세)
-- ------------------------------------------------------------
-- 모든 함수는 관리자 PIN(20260606)으로만 실행할 수 있습니다.
-- 적용: Supabase SQL Editor → New query → 전체 붙여넣기 → Run
-- ============================================================

-- ── 1) 전체 현황 ───────────────────────────────────────────
-- 학생 수 · 평균 정답률 · 총 학습 횟수 · 최다 오답 단어 · 도움이 필요한 학생
create or replace function public.admin_get_overview(p_pin text)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_students  int := 0;
  v_attempts  int := 0;
  v_correct   int := 0;
  v_active    int := 0;
  v_wrong     int := 0;
  v_top_wrong jsonb := '[]'::jsonb;
  v_need_help jsonb := '[]'::jsonb;
begin
  if p_pin <> '20260606' then raise exception 'INVALID_PIN'; end if;

  select count(*) into v_students from students;

  select count(*), count(*) filter (where is_correct)
    into v_attempts, v_correct
    from quiz_responses;

  -- 최근 7일 안에 학습한 학생 수
  select count(distinct student_id) into v_active
    from quiz_responses
    where created_at >= now() - interval '7 days';

  -- 현재 저장된 오답 총 개수
  select count(*) into v_wrong from student_wrong_words;

  -- 많이 틀린 단어 상위 10개
  select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) into v_top_wrong
  from (
    select
      qr.word_id,
      qr.subject,
      count(*) filter (where not qr.is_correct) as wrong_count,
      count(*)                                  as total,
      count(distinct qr.student_id) filter (where not qr.is_correct) as student_count
    from quiz_responses qr
    group by qr.word_id, qr.subject
    having count(*) filter (where not qr.is_correct) > 0
    order by count(*) filter (where not qr.is_correct) desc, count(*) desc
    limit 10
  ) t;

  -- 도움이 필요한 학생 (정답률 낮은 순 → 오답 많은 순) 상위 5명
  select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) into v_need_help
  from (
    select
      s.id as student_id, s.username, s.anon_code,
      count(qr.id)                                as attempts,
      count(qr.id) filter (where qr.is_correct)   as correct,
      (select count(*) from student_wrong_words w where w.student_id = s.id) as wrong_count
    from students s
    left join quiz_responses qr on qr.student_id = s.id
    group by s.id, s.username, s.anon_code
    having count(qr.id) > 0
    order by
      (count(qr.id) filter (where qr.is_correct))::numeric / nullif(count(qr.id), 0) asc,
      (select count(*) from student_wrong_words w where w.student_id = s.id) desc
    limit 5
  ) t;

  return jsonb_build_object(
    'student_count', v_students,
    'attempts',      v_attempts,
    'correct',       v_correct,
    'active_7d',     v_active,
    'wrong_total',   v_wrong,
    'top_wrong_words', v_top_wrong,
    'need_help',     v_need_help
  );
end;
$$;

-- ── 2) 학생별 현황 목록 ────────────────────────────────────
create or replace function public.admin_list_students_detail(p_pin text)
returns table(
  student_id     uuid,
  username       text,
  anon_code      text,
  attempts       int,
  correct        int,
  wrong_count    int,
  repeat_wrong   int,
  reviewed_count int,
  last_active    timestamptz,
  created_at     timestamptz
)
language plpgsql security definer set search_path = public, extensions as $$
begin
  if p_pin <> '20260606' then raise exception 'INVALID_PIN'; end if;

  return query
  select
    s.id,
    s.username,
    s.anon_code,
    coalesce(q.attempts, 0)::int,
    coalesce(q.correct, 0)::int,
    (select count(*) from student_wrong_words w where w.student_id = s.id)::int,
    (select count(*) from student_wrong_words w
       join word_mastery m on m.student_id = w.student_id and m.word_id = w.word_id
      where w.student_id = s.id and m.wrong_count >= 2)::int,
    (select count(*) from wrong_word_reviews r where r.student_id = s.id)::int,
    q.last_active,
    s.created_at
  from students s
  left join (
    select
      qr.student_id,
      count(*)                                as attempts,
      count(*) filter (where qr.is_correct)   as correct,
      max(qr.created_at)                      as last_active
    from quiz_responses qr
    group by qr.student_id
  ) q on q.student_id = s.id
  order by s.created_at desc;
end;
$$;

-- ── 3) 개별 학생 상세 ──────────────────────────────────────
-- 교과별 성취 · 단원별 취약 어휘 · 반복 오답 · 최근 학습 이력
create or replace function public.admin_get_student_detail(p_pin text, p_student_id uuid)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_profile  jsonb;
  v_subjects jsonb := '[]'::jsonb;
  v_units    jsonb := '[]'::jsonb;
  v_repeat   jsonb := '[]'::jsonb;
  v_recent   jsonb := '[]'::jsonb;
  v_daily    jsonb := '[]'::jsonb;
begin
  if p_pin <> '20260606' then raise exception 'INVALID_PIN'; end if;

  -- 기본 정보 + 요약
  select to_jsonb(t) into v_profile
  from (
    select
      s.id as student_id, s.username, s.anon_code, s.created_at,
      (select count(*) from quiz_responses q where q.student_id = s.id)                        as attempts,
      (select count(*) from quiz_responses q where q.student_id = s.id and q.is_correct)       as correct,
      (select max(created_at) from quiz_responses q where q.student_id = s.id)                 as last_active,
      (select count(*) from student_wrong_words w where w.student_id = s.id)                   as wrong_count,
      (select count(*) from wrong_word_reviews r where r.student_id = s.id)                    as reviewed_count,
      (select count(*) from word_mastery m where m.student_id = s.id and m.status = 'mastered') as mastered_words
    from students s
    where s.id = p_student_id
  ) t;

  if v_profile is null then raise exception 'STUDENT_NOT_FOUND'; end if;

  -- 교과별 성취
  select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) into v_subjects
  from (
    select
      qr.subject,
      count(*)                              as attempts,
      count(*) filter (where qr.is_correct) as correct,
      (select count(*) from word_mastery m
        where m.student_id = p_student_id and m.subject = qr.subject) as attempted_words,
      (select count(*) from word_mastery m
        where m.student_id = p_student_id and m.subject = qr.subject and m.status = 'mastered') as mastered_words
    from quiz_responses qr
    where qr.student_id = p_student_id
    group by qr.subject
    order by qr.subject
  ) t;

  -- 단원별 취약 어휘 (틀린 횟수 많은 단원 순)
  select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) into v_units
  from (
    select
      qr.subject,
      coalesce(qr.unit, '-') as unit,
      count(*)                                   as attempts,
      count(*) filter (where not qr.is_correct)  as wrong_count
    from quiz_responses qr
    where qr.student_id = p_student_id
    group by qr.subject, coalesce(qr.unit, '-')
    having count(*) filter (where not qr.is_correct) > 0
    order by count(*) filter (where not qr.is_correct) desc
    limit 10
  ) t;

  -- 반복 오답 단어 (2회 이상 틀린 단어)
  select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) into v_repeat
  from (
    select m.word_id, m.subject, m.wrong_count, m.correct_count, m.status
    from word_mastery m
    where m.student_id = p_student_id and m.wrong_count >= 2
    order by m.wrong_count desc
    limit 20
  ) t;

  -- 최근 학습 이력 (최근 20문항)
  select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) into v_recent
  from (
    select qr.word_id, qr.subject, qr.unit, qr.quiz_type, qr.is_correct, qr.created_at
    from quiz_responses qr
    where qr.student_id = p_student_id
    order by qr.created_at desc
    limit 20
  ) t;

  -- 날짜별 학습량 (최근 14일, Asia/Seoul 기준)
  select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) into v_daily
  from (
    select
      ((qr.created_at at time zone 'Asia/Seoul')::date)::text as day,
      count(*)                              as attempts,
      count(*) filter (where qr.is_correct) as correct
    from quiz_responses qr
    where qr.student_id = p_student_id
      and qr.created_at >= now() - interval '14 days'
    group by ((qr.created_at at time zone 'Asia/Seoul')::date)
    order by ((qr.created_at at time zone 'Asia/Seoul')::date)
  ) t;

  return jsonb_build_object(
    'profile',    v_profile,
    'subjects',   v_subjects,
    'weak_units', v_units,
    'repeat_words', v_repeat,
    'recent',     v_recent,
    'daily',      v_daily
  );
end;
$$;

-- ── 4) 실행 권한 ───────────────────────────────────────────
grant execute on function public.admin_get_overview(text)              to anon;
grant execute on function public.admin_list_students_detail(text)      to anon;
grant execute on function public.admin_get_student_detail(text, uuid)  to anon;
