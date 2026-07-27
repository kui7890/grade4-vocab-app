-- ============================================================
-- P6 확장: 연구용 데이터 내보내기 (익명 ID 기준)
-- ------------------------------------------------------------
-- 학생 이름(username)은 내보내지 않고 익명 ID(anon_code)만 사용합니다.
-- 적용: Supabase SQL Editor → New query → 전체 붙여넣기 → Run
-- ============================================================

create or replace function public.admin_export_research(p_pin text)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_students    jsonb := '[]'::jsonb;
  v_responses   jsonb := '[]'::jsonb;
  v_mastery     jsonb := '[]'::jsonb;
  v_wrong       jsonb := '[]'::jsonb;
  v_reviews     jsonb := '[]'::jsonb;
  v_assignments jsonb := '[]'::jsonb;
begin
  if p_pin <> '20260606' then raise exception 'INVALID_PIN'; end if;

  -- 1) 학생 요약 (익명 ID 기준)
  select coalesce(jsonb_agg(row_to_json(t) order by t.anon_code), '[]'::jsonb) into v_students
  from (
    select
      s.anon_code,
      s.created_at                                                                     as joined_at,
      (select count(*) from quiz_responses q where q.student_id = s.id)                as attempts,
      (select count(*) from quiz_responses q where q.student_id = s.id and q.is_correct) as correct,
      (select count(*) from student_wrong_words w where w.student_id = s.id)           as wrong_open,
      (select count(*) from word_mastery m where m.student_id = s.id and m.wrong_count >= 2) as repeat_wrong,
      (select count(*) from wrong_word_reviews r where r.student_id = s.id)            as reviewed,
      (select count(*) from word_mastery m where m.student_id = s.id and m.status = 'mastered') as mastered_words,
      (select count(distinct (q.created_at at time zone 'Asia/Seoul')::date)
         from quiz_responses q where q.student_id = s.id)                              as active_days,
      (select max(q.created_at) from quiz_responses q where q.student_id = s.id)       as last_active
    from students s
  ) t;

  -- 2) 문항 단위 응답 로그 (분석 핵심)
  select coalesce(jsonb_agg(row_to_json(t) order by t.anon_code, t.answered_at), '[]'::jsonb) into v_responses
  from (
    select
      s.anon_code,
      qr.word_id,
      qr.subject,
      qr.unit,
      qr.quiz_type,
      qr.is_correct,
      qr.chosen_word_id,
      qr.created_at as answered_at
    from quiz_responses qr
    join students s on s.id = qr.student_id
  ) t;

  -- 3) 단어별 숙달 상태
  select coalesce(jsonb_agg(row_to_json(t) order by t.anon_code, t.word_id), '[]'::jsonb) into v_mastery
  from (
    select
      s.anon_code, m.word_id, m.subject, m.status,
      m.correct_count, m.wrong_count, m.consecutive_correct, m.last_seen_at
    from word_mastery m
    join students s on s.id = m.student_id
  ) t;

  -- 4) 현재 오답 노트
  select coalesce(jsonb_agg(row_to_json(t) order by t.anon_code, t.added_at), '[]'::jsonb) into v_wrong
  from (
    select s.anon_code, w.word_id, w.created_at as added_at
    from student_wrong_words w
    join students s on s.id = w.student_id
  ) t;

  -- 5) 복습 완료 기록
  select coalesce(jsonb_agg(row_to_json(t) order by t.anon_code, t.reviewed_at), '[]'::jsonb) into v_reviews
  from (
    select s.anon_code, r.word_id, r.reviewed_at
    from wrong_word_reviews r
    join students s on s.id = r.student_id
  ) t;

  -- 6) 배정 학습 수행 기록
  select coalesce(jsonb_agg(row_to_json(t) order by t.anon_code, t.completed_at), '[]'::jsonb) into v_assignments
  from (
    select
      s.anon_code, a.title, a.set_type, a.subject,
      jsonb_array_length(a.word_ids) as word_count,
      p.score, p.total, p.completed_at
    from assignment_progress p
    join students s    on s.id = p.student_id
    join assignments a on a.id = p.assignment_id
  ) t;

  return jsonb_build_object(
    'students',    v_students,
    'responses',   v_responses,
    'mastery',     v_mastery,
    'wrong_words', v_wrong,
    'reviews',     v_reviews,
    'assignments', v_assignments,
    'exported_at', now()
  );
end;
$$;

grant execute on function public.admin_export_research(text) to anon;
