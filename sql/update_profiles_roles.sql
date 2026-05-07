-- Adds role support and keeps the profile table in sync with auth.users.
-- admin dan dosen tetap disimpan sebagai role terpisah, tetapi backend
-- akan mengelompokkan keduanya sebagai role_group = staff.

alter table public.profiles
  add column if not exists role text not null default 'mahasiswa';

do $$
begin
  alter table public.profiles
    add constraint profiles_role_check
    check (role in ('mahasiswa', 'dosen', 'admin'));
exception
  when duplicate_object then null;
end $$;

update public.profiles
set role = 'mahasiswa'
where role is null or role not in ('mahasiswa', 'dosen', 'admin');

create or replace function public.set_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;

create trigger trg_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_profiles_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(coalesce(new.email, ''), '@', 1)),
    new.raw_user_meta_data->>'avatar_url',
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'mahasiswa')
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(excluded.full_name, public.profiles.full_name),
        avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
        updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();
