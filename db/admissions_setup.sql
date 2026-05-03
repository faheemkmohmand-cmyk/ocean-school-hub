-- ─────────────────────────────────────────────
-- Admissions Management System
-- Run this in your Supabase SQL Editor (one-time)
-- ─────────────────────────────────────────────

create table if not exists public.admission_settings (
  id integer primary key default 1 check (id = 1),
  is_open boolean not null default false,
  session_year text not null default '2026',
  open_date date,
  last_date date,
  banner_message text,
  notes text,
  updated_at timestamptz not null default now()
);

insert into public.admission_settings (id, is_open, session_year, banner_message)
values (1, true, '2026', 'Admissions Open for Session 2026 — Apply Online Today')
on conflict (id) do nothing;

do $$ begin
  create type public.admission_type as enum ('fresh', 'migration');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.admission_status as enum ('pending','under_review','approved','rejected','documents_missing');
exception when duplicate_object then null; end $$;

create table if not exists public.admissions (
  id uuid primary key default gen_random_uuid(),
  reference_no text unique not null,
  full_name text not null,
  father_name text not null,
  date_of_birth date,
  b_form_no text not null,
  contact_number text not null,
  whatsapp_number text,
  home_address text,
  gender text check (gender in ('male','female','other')),
  applying_class text not null,
  admission_type public.admission_type not null default 'fresh',
  previous_school text,
  previous_class text,
  previous_marks text,
  year_of_passing text,
  status public.admission_status not null default 'pending',
  admin_note text,
  rejection_reason text,
  admission_roll_no text,
  migration_step integer check (migration_step between 1 and 8),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_admissions_status     on public.admissions(status);
create index if not exists idx_admissions_class      on public.admissions(applying_class);
create index if not exists idx_admissions_type       on public.admissions(admission_type);
create index if not exists idx_admissions_bform      on public.admissions(b_form_no);
create index if not exists idx_admissions_created    on public.admissions(created_at desc);

create table if not exists public.admission_documents (
  id uuid primary key default gen_random_uuid(),
  admission_id uuid not null references public.admissions(id) on delete cascade,
  doc_type text not null,
  file_path text not null,
  file_name text,
  uploaded_at timestamptz not null default now()
);
create index if not exists idx_admission_docs_admission on public.admission_documents(admission_id);

-- Reference number generator: OHS-YYYY-XXXX
create or replace function public.generate_admission_reference()
returns trigger language plpgsql as $$
declare
  yr text := to_char(now(), 'YYYY');
  seq int;
begin
  if new.reference_no is null or new.reference_no = '' then
    select count(*) + 1 into seq from public.admissions
      where reference_no like 'OHS-' || yr || '-%';
    new.reference_no := 'OHS-' || yr || '-' || lpad(seq::text, 4, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_generate_admission_ref on public.admissions;
create trigger trg_generate_admission_ref
before insert on public.admissions
for each row execute function public.generate_admission_reference();

create or replace function public.touch_admissions_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end;
$$;
drop trigger if exists trg_touch_admissions on public.admissions;
create trigger trg_touch_admissions
before update on public.admissions
for each row execute function public.touch_admissions_updated_at();

-- RLS
alter table public.admission_settings   enable row level security;
alter table public.admissions           enable row level security;
alter table public.admission_documents  enable row level security;

drop policy if exists "settings_read_all" on public.admission_settings;
create policy "settings_read_all" on public.admission_settings for select using (true);

drop policy if exists "settings_admin_all" on public.admission_settings;
create policy "settings_admin_all" on public.admission_settings for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists "admissions_public_insert" on public.admissions;
create policy "admissions_public_insert" on public.admissions
  for insert to anon, authenticated with check (true);

drop policy if exists "admissions_admin_read" on public.admissions;
create policy "admissions_admin_read" on public.admissions for select
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists "admissions_admin_update" on public.admissions;
create policy "admissions_admin_update" on public.admissions for update
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists "admissions_admin_delete" on public.admissions;
create policy "admissions_admin_delete" on public.admissions for delete
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists "admission_docs_public_insert" on public.admission_documents;
create policy "admission_docs_public_insert" on public.admission_documents
  for insert to anon, authenticated with check (true);

drop policy if exists "admission_docs_admin_all" on public.admission_documents;
create policy "admission_docs_admin_all" on public.admission_documents for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- Public tracking RPC
create or replace function public.track_admission(p_query text)
returns table (
  reference_no text, full_name text, applying_class text,
  admission_type public.admission_type, status public.admission_status,
  migration_step integer, admin_note text, rejection_reason text,
  created_at timestamptz, updated_at timestamptz
) language sql stable security definer set search_path = public as $$
  select reference_no, full_name, applying_class, admission_type, status,
         migration_step, admin_note, rejection_reason, created_at, updated_at
    from public.admissions
   where reference_no = p_query or b_form_no = p_query
   order by created_at desc limit 5;
$$;
grant execute on function public.track_admission(text) to anon, authenticated;

-- Storage bucket
insert into storage.buckets (id, name, public)
values ('admissions', 'admissions', true)
on conflict (id) do nothing;

drop policy if exists "admissions_bucket_public_read" on storage.objects;
create policy "admissions_bucket_public_read" on storage.objects
  for select using (bucket_id = 'admissions');

drop policy if exists "admissions_bucket_public_upload" on storage.objects;
create policy "admissions_bucket_public_upload" on storage.objects
  for insert to anon, authenticated with check (bucket_id = 'admissions');

drop policy if exists "admissions_bucket_admin_manage" on storage.objects;
create policy "admissions_bucket_admin_manage" on storage.objects for all
  using (bucket_id = 'admissions' and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (bucket_id = 'admissions' and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
