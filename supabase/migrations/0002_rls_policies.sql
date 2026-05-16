-- ============================================================
-- 0002 RLS policies for all tables.
-- ============================================================

alter table profiles enable row level security;
alter table courses enable row level security;
alter table subjects enable row level security;
alter table enrollments enable row level security;
alter table grades enable row level security;
alter table attendance enable row level security;
alter table materials enable row level security;
alter table study_sessions enable row level security;
alter table questions enable row level security;
alter table answers enable row level security;
alter table points_ledger enable row level security;

-- profiles
create policy profiles_self_read on profiles
  for select using (id = auth.uid() or public.current_role() in ('admin','teacher'));
create policy profiles_self_update on profiles
  for update using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from profiles where id = auth.uid()));
create policy profiles_admin_all on profiles
  for all using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

-- courses
create policy courses_read_all on courses
  for select using (auth.uid() is not null);
create policy courses_admin_write on courses
  for all using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

-- subjects
create policy subjects_read_all on subjects
  for select using (auth.uid() is not null);
create policy subjects_admin_write on subjects
  for all using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

-- enrollments
create policy enrollments_student_read on enrollments
  for select using (student_id = auth.uid() or public.current_role() in ('admin','teacher'));
create policy enrollments_admin_write on enrollments
  for all using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

-- grades
create policy grades_student_read on grades
  for select using (
    student_id = auth.uid()
    or public.current_role() = 'admin'
    or exists (select 1 from subjects s where s.id = grades.subject_id and s.teacher_id = auth.uid())
  );
create policy grades_teacher_write on grades
  for insert with check (
    public.current_role() in ('admin','teacher')
    and exists (select 1 from subjects s where s.id = subject_id
                and (s.teacher_id = auth.uid() or public.current_role() = 'admin'))
  );
create policy grades_teacher_update on grades
  for update using (
    public.current_role() = 'admin'
    or exists (select 1 from subjects s where s.id = grades.subject_id and s.teacher_id = auth.uid())
  );
create policy grades_teacher_delete on grades
  for delete using (
    public.current_role() = 'admin'
    or exists (select 1 from subjects s where s.id = grades.subject_id and s.teacher_id = auth.uid())
  );

-- attendance
create policy attendance_read on attendance
  for select using (
    student_id = auth.uid()
    or public.current_role() = 'admin'
    or exists (select 1 from subjects s where s.id = attendance.subject_id and s.teacher_id = auth.uid())
  );
create policy attendance_teacher_write on attendance
  for insert with check (
    public.current_role() in ('admin','teacher')
    and exists (select 1 from subjects s where s.id = subject_id
                and (s.teacher_id = auth.uid() or public.current_role() = 'admin'))
  );
create policy attendance_teacher_update on attendance
  for update using (
    public.current_role() = 'admin'
    or exists (select 1 from subjects s where s.id = attendance.subject_id and s.teacher_id = auth.uid())
  );
create policy attendance_teacher_delete on attendance
  for delete using (
    public.current_role() = 'admin'
    or exists (select 1 from subjects s where s.id = attendance.subject_id and s.teacher_id = auth.uid())
  );

-- materials
create policy materials_read on materials
  for select using (auth.uid() is not null);
create policy materials_write on materials
  for insert with check (
    public.current_role() = 'admin'
    or exists (select 1 from subjects s where s.id = subject_id and s.teacher_id = auth.uid())
  );
create policy materials_update on materials
  for update using (
    public.current_role() = 'admin'
    or exists (select 1 from subjects s where s.id = materials.subject_id and s.teacher_id = auth.uid())
  );
create policy materials_delete on materials
  for delete using (
    public.current_role() = 'admin'
    or exists (select 1 from subjects s where s.id = materials.subject_id and s.teacher_id = auth.uid())
  );

-- study_sessions / questions / answers
create policy sessions_owner on study_sessions
  for all using (student_id = auth.uid() or public.current_role() = 'admin')
  with check (student_id = auth.uid() or public.current_role() = 'admin');
create policy questions_session_owner on questions
  for select using (
    public.current_role() = 'admin'
    or exists (select 1 from study_sessions ss where ss.id = questions.session_id and ss.student_id = auth.uid())
  );
create policy questions_insert on questions
  for insert with check (
    exists (select 1 from study_sessions ss where ss.id = session_id and ss.student_id = auth.uid())
  );
create policy answers_owner on answers
  for all using (student_id = auth.uid() or public.current_role() = 'admin')
  with check (student_id = auth.uid());

-- points_ledger (read self, writes go through service role)
create policy points_read_self on points_ledger
  for select using (student_id = auth.uid() or public.current_role() in ('admin','teacher'));
