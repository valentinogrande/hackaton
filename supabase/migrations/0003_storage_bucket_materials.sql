-- Storage bucket for teacher-uploaded PDFs.
insert into storage.buckets (id, name, public)
values ('materials', 'materials', false)
on conflict (id) do nothing;

create policy "materials_read_authenticated"
  on storage.objects for select to authenticated
  using (bucket_id = 'materials');

create policy "materials_write_teacher_admin"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'materials' and public.current_role() in ('admin','teacher'));

create policy "materials_update_teacher_admin"
  on storage.objects for update to authenticated
  using (bucket_id = 'materials' and public.current_role() in ('admin','teacher'));

create policy "materials_delete_teacher_admin"
  on storage.objects for delete to authenticated
  using (bucket_id = 'materials' and public.current_role() in ('admin','teacher'));
