-- ============================================================
-- 0001 INIT: roles, academic core, materials, study, points
-- Applied via Supabase MCP. Local copy for reference + new clones.
-- ============================================================

-- Enums
create type user_role as enum ('admin', 'teacher', 'student');
create type attendance_status as enum ('present', 'absent', 'late');
create type study_mode as enum ('quiz', 'flashcards', 'fill_blank', 'open');
create type question_kind as enum ('multiple_choice', 'flashcard', 'fill_blank', 'open');

-- profiles: 1:1 with auth.users, holds role + points balance
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role user_role not null default 'student',
  points_balance integer not null default 0,
  created_at timestamptz not null default now()
);
create index on profiles(role);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'student')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.current_role()
returns user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- Academic core
create table courses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  year integer not null,
  created_at timestamptz not null default now()
);

create table subjects (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  teacher_id uuid references profiles(id) on delete set null,
  name text not null,
  created_at timestamptz not null default now()
);
create index on subjects(course_id);
create index on subjects(teacher_id);

create table enrollments (
  student_id uuid not null references profiles(id) on delete cascade,
  course_id uuid not null references courses(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (student_id, course_id)
);
create index on enrollments(course_id);

-- Grades + attendance
create table grades (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles(id) on delete cascade,
  subject_id uuid not null references subjects(id) on delete cascade,
  value numeric(4,2) not null,
  period text not null default 'T1',
  note text,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index on grades(student_id);
create index on grades(subject_id);

create table attendance (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles(id) on delete cascade,
  subject_id uuid not null references subjects(id) on delete cascade,
  date date not null,
  status attendance_status not null,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (student_id, subject_id, date)
);
create index on attendance(subject_id, date);

-- Materials
create table materials (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references subjects(id) on delete cascade,
  title text not null,
  pdf_path text not null,
  extracted_text text,
  uploaded_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index on materials(subject_id);

-- Study sessions + AI-generated questions + answers
create table study_sessions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles(id) on delete cascade,
  material_id uuid not null references materials(id) on delete cascade,
  mode study_mode not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz
);
create index on study_sessions(student_id);

create table questions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references study_sessions(id) on delete cascade,
  kind question_kind not null,
  prompt jsonb not null,
  correct jsonb not null,
  created_at timestamptz not null default now()
);
create index on questions(session_id);

create table answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references questions(id) on delete cascade,
  student_id uuid not null references profiles(id) on delete cascade,
  response jsonb not null,
  is_correct boolean not null,
  points_awarded integer not null default 0,
  created_at timestamptz not null default now()
);
create index on answers(student_id);

-- Points ledger (immutable log; profiles.points_balance is cache)
create table points_ledger (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles(id) on delete cascade,
  delta integer not null,
  reason text not null,
  ref_id uuid,
  created_at timestamptz not null default now()
);
create index on points_ledger(student_id, created_at desc);

create or replace function public.apply_points_delta()
returns trigger
language plpgsql
as $$
begin
  update public.profiles
     set points_balance = points_balance + new.delta
   where id = new.student_id;
  return new;
end;
$$;

create trigger points_ledger_apply
  after insert on points_ledger
  for each row execute function public.apply_points_delta();
