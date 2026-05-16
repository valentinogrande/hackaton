-- Mirror auth.users.email into profiles so we can display a friendly name
-- (email) when a profile's full_name is empty — without joining auth tables
-- in every query.

alter table profiles add column if not exists email text;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'student'),
    new.email
  );
  return new;
end;
$$;

update profiles p set email = u.email
from auth.users u
where u.id = p.id and (p.email is null or p.email = '');
