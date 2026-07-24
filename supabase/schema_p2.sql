-- ============================================================
-- P2 확장: 개별화 학습 세트 (오답 > 낮은 정답률 > 미학습 우선)
-- ------------------------------------------------------------
-- 적용: Supabase SQL Editor → New query → 전체 붙여넣기 → Run
-- ============================================================

-- 어휘 목록(p_word_ids)은 앱의 VOCAB_DB에서 전달받는다.
-- (DB는 전체 어휘 목록을 모르므로 "미학습" 판별을 위해 필요)
--
-- 우선순위(tier)
--   1) wrong    : 현재 오답 노트에 있는 단어
--   2) learning : 시도했지만 아직 숙달되지 않은 단어 (정답률 낮은 순)
--   3) new      : 아직 한 번도 학습하지 않은 단어
--   4) mastered : 이미 숙달한 단어 (자리가 남을 때만)
create or replace function public.get_personalized_set(
  p_student_id uuid,
  p_word_ids   text[],
  p_size       int default 8
)
returns table(word_id text, reason text)
language plpgsql security definer set search_path = public, extensions as $$
begin
  return query
  with universe as (
    select unnest(p_word_ids) as wid
  ),
  scored as (
    select
      u.wid,
      case
        when sww.word_id is not null then 1
        when wm.word_id is null      then 3
        when wm.status <> 'mastered' then 2
        else 4
      end as tier,
      case
        when sww.word_id is not null then 'wrong'
        when wm.word_id is null      then 'new'
        when wm.status <> 'mastered' then 'learning'
        else 'mastered'
      end as reason,
      coalesce(wm.correct_count, 0) as cc,
      coalesce(wm.wrong_count, 0)   as wc,
      wm.last_seen_at               as seen
    from universe u
    left join student_wrong_words sww
      on sww.student_id = p_student_id and sww.word_id = u.wid
    left join word_mastery wm
      on wm.student_id = p_student_id and wm.word_id = u.wid
  )
  select s.wid, s.reason
  from scored s
  order by
    s.tier,
    -- 같은 tier 안에서는 정답률이 낮은 단어부터
    (case when (s.cc + s.wc) > 0 then s.cc::numeric / (s.cc + s.wc) else 0 end) asc,
    -- 그다음 오래 안 본 단어부터
    s.seen asc nulls first,
    random()
  limit greatest(coalesce(p_size, 8), 1);
end;
$$;

grant execute on function public.get_personalized_set(uuid, text[], int) to anon;
