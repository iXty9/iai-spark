-- 1) Create admin checker function to avoid RLS recursion
create or replace function public.is_admin(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = 'admin'
  );
$$;

-- 2) Add missing write policies for app_settings (admins can insert/update)
create policy "Admins can insert app settings"
on public.app_settings
for insert
to authenticated
with check (public.is_admin(auth.uid()));

create policy "Admins can update app settings"
on public.app_settings
for update
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

-- 3) Backfill 'tagline' key from existing 'app_name' value (one-time migration)
insert into public.app_settings (key, value)
select 'tagline', a.value
from public.app_settings a
where a.key = 'app_name'
on conflict (key) do nothing;

-- 4) Strip wrapping double quotes from tagline and app_name values
update public.app_settings
set value = regexp_replace(value, '^\"|\"$', '', 'g')
where key in ('tagline', 'app_name')
  and value ~ '^\"|\"$';