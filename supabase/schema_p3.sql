-- ============================================================
-- P3 확장: 오답 노트 고도화 (반복 오답 · 복습 완료 기록)
-- ------------------------------------------------------------
-- 적용: Supabase SQL Editor → New query → 전체 붙여넣기 → Run
-- ============================================================

-- ── 1) 복습 완료 기록 ──────────────────────────────────────
-- "복습 완료"를 누르면 오답 목록에서는 빠지지만, 복습했다는 사실은 남긴다.
create table if not exists public.wrong_word_reviews (
  id          bigint generated always as identity primary key,
  student_id  uuid not null references public.students(id) on delete cascade,
  word_id     text not null,
  reviewed_at timestamptz not null default now()
);
create index if not exists idx_wwr_student on public.wrong_word_reviews(student_id, reviewed_at);

alter table public.wrong_word_reviews enable row level security;
-- 직접 접근은 차단하고 아래 SECURITY DEFINER 함수로만 사용한다.

-- ── 2) 오답 노트 상세 (반복 횟수 포함) ─────────────────────
-- 반복해서 틀린 단어(wrong_count 큰 순)를 먼저 보여 준다.
create or replace function public.get_wrong_notes(p_student_id uuid)
returns table(
  word_id       text,
  wrong_count   int,
  correct_count int,
  added_at      timestamptz,
  last_seen_at  timestamptz
)
language plpgsql security definer set search_path = public, extensions as $$
begin
  return query
  select
    sww.word_id,
    coalesce(wm.wrong_count, 0)::int,
    coalesce(wm.correct_count, 0)::int,
    sww.created_at,
    wm.last_seen_at
  from student_wrong_words sww
  left join word_mastery wm
    on wm.student_id = sww.student_id and wm.word_id = sww.word_id
  where sww.student_id = p_student_id
  order by coalesce(wm.wrong_count, 0) desc, sww.created_at desc;
end;
$$;

-- ── 3) 복습 완료: 기록 남기고 오답 목록에서 제거 ───────────
create or replace function public.complete_review(p_student_id uuid, p_word_id text)
returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  insert into wrong_word_reviews(student_id, word_id) values (p_student_id, p_word_id);
  delete from student_wrong_words
    where student_id = p_student_id and word_id = p_word_id;
end;
$$;

-- ── 4) 대시보드에 복습 완료 수 추가 (기존 함수 덮어쓰기) ───
create or replace function public.get_student_dashboard(p_student_id uuid)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_attempts int := 0;
  v_correct  int := 0;
  v_wrong    int := 0;
  v_reviewed int := 0;
  v_repeat   int := 0;
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

  -- 복습 완료 누적 횟수
  select count(*) into v_reviewed from wrong_word_reviews where student_id = p_student_id;

  -- 현재 오답 중 2회 이상 틀린 "반복 오답" 개수
  select count(*) into v_repeat
  from student_wrong_words sww
  join word_mastery wm
    on wm.student_id = sww.student_id and wm.word_id = sww.word_id
  where sww.student_id = p_student_id and wm.wrong_count >= 2;

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
    'repeat_wrong_count', v_repeat,
    'reviewed_count', v_reviewed,
    'streak', v_streak,
    'recent_wrong', v_recent,
    'subjects', v_subjects
  );
end;
$$;

-- ── 5) 실행 권한 ───────────────────────────────────────────
grant execute on function public.get_wrong_notes(uuid)          to anon;
grant execute on function public.complete_review(uuid, text)    to anon;
grant execute on function public.get_student_dashboard(uuid)    to anon;
