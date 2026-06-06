-- ============================================================
-- 4학년 교과 어휘 학습 앱 - Supabase 데이터베이스 스키마
-- ------------------------------------------------------------
-- 사용 방법:
-- 1) Supabase 프로젝트 생성 (https://supabase.com)
-- 2) 좌측 메뉴 SQL Editor → New query
-- 3) 이 파일 내용을 모두 붙여넣고 Run
-- ============================================================

-- 비밀번호 해시(crypt)를 위해 pgcrypto 확장 사용
create extension if not exists pgcrypto;

-- ── 학생 계정 ──────────────────────────────────────────────
create table if not exists public.students (
  id            uuid primary key default gen_random_uuid(),
  username      text unique not null,
  password_hash text not null,          -- bcrypt 해시 (평문 저장 안 함)
  created_at    timestamptz not null default now()
);

-- ── 학생별 오답 어휘 ───────────────────────────────────────
create table if not exists public.student_wrong_words (
  student_id uuid not null references public.students(id) on delete cascade,
  word_id    text not null,             -- VOCAB_DB의 어휘 id
  created_at timestamptz not null default now(),
  primary key (student_id, word_id)
);

-- ── 학생별 누적 통계 ───────────────────────────────────────
create table if not exists public.student_stats (
  student_id uuid primary key references public.students(id) on delete cascade,
  attempts   int not null default 0,    -- 푼 문항 수
  correct    int not null default 0,    -- 맞힌 문항 수
  updated_at timestamptz not null default now()
);

-- ============================================================
-- 행 수준 보안(RLS)
-- ============================================================
alter table public.students            enable row level security;
alter table public.student_wrong_words enable row level security;
alter table public.student_stats       enable row level security;

-- students 테이블은 anon에게 어떤 직접 접근도 허용하지 않습니다.
-- (비밀번호 해시 보호) 모든 접근은 아래 SECURITY DEFINER 함수로만 합니다.

-- 학습 데이터는 교실용 앱 특성상 anon 접근을 허용합니다.
drop policy if exists "wrong_select" on public.student_wrong_words;
drop policy if exists "wrong_insert" on public.student_wrong_words;
drop policy if exists "wrong_delete" on public.student_wrong_words;
create policy "wrong_select" on public.student_wrong_words for select using (true);
create policy "wrong_insert" on public.student_wrong_words for insert with check (true);
create policy "wrong_delete" on public.student_wrong_words for delete using (true);

drop policy if exists "stats_select" on public.student_stats;
create policy "stats_select" on public.student_stats for select using (true);

grant select, insert, delete on public.student_wrong_words to anon;
grant select on public.student_stats to anon;

-- ============================================================
-- 회원가입 / 로그인 함수 (비밀번호는 서버에서만 검증)
-- ============================================================

-- 회원가입: 아이디 중복/길이 검사 후 생성, 통계 행도 함께 생성
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

  insert into students(username, password_hash)
  values (v_username, crypt(p_password, gen_salt('bf')))
  returning students.id into v_id;

  insert into student_stats(student_id) values (v_id) on conflict do nothing;

  return query select s.id, s.username from students s where s.id = v_id;
end;
$$;

-- 로그인: 아이디+비밀번호 일치 시 학생 정보 반환 (없으면 빈 결과)
create or replace function public.login_student(p_username text, p_password text)
returns table(id uuid, username text)
language plpgsql security definer set search_path = public, extensions as $$
begin
  return query
    select s.id, s.username
    from students s
    where lower(s.username) = lower(trim(p_username))
      and s.password_hash = crypt(p_password, s.password_hash);
end;
$$;

-- 통계 누적 (행 없으면 생성, 있으면 증가)
create or replace function public.record_answer(p_student_id uuid, p_correct boolean)
returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  insert into student_stats(student_id, attempts, correct)
  values (p_student_id, 1, case when p_correct then 1 else 0 end)
  on conflict (student_id) do update
    set attempts   = student_stats.attempts + 1,
        correct    = student_stats.correct + (case when p_correct then 1 else 0 end),
        updated_at = now();
end;
$$;

-- ============================================================
-- 관리자 함수 (PIN = 20260606)
-- ============================================================

-- 학생 목록 조회 (PIN 일치 시에만)
create or replace function public.admin_list_students(p_pin text)
returns table(id uuid, username text, created_at timestamptz)
language plpgsql security definer set search_path = public, extensions as $$
begin
  if p_pin <> '20260606' then raise exception 'INVALID_PIN'; end if;
  return query select s.id, s.username, s.created_at from students s order by s.created_at desc;
end;
$$;

-- 학생 삭제 (PIN 일치 시에만, 오답/통계도 함께 삭제됨)
create or replace function public.admin_delete_student(p_pin text, p_student_id uuid)
returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if p_pin <> '20260606' then raise exception 'INVALID_PIN'; end if;
  delete from students where id = p_student_id;
end;
$$;

-- ── 함수 실행 권한을 anon에게 부여 ──────────────────────────
grant execute on function public.register_student(text, text)   to anon;
grant execute on function public.login_student(text, text)      to anon;
grant execute on function public.record_answer(uuid, boolean)   to anon;
grant execute on function public.admin_list_students(text)      to anon;
grant execute on function public.admin_delete_student(text, uuid) to anon;
