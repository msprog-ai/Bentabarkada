-- Migration: Create shipping_couriers and listing_couriers tables for Bentabarkada marketplace

-- 1. shipping_couriers table
create table if not exists public.shipping_couriers (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    logo_url text,
    estimated_days text not null,
    base_fee numeric not null,
    is_active boolean not null default true
);

-- Seed data for shipping_couriers
insert into public.shipping_couriers (name, logo_url, estimated_days, base_fee, is_active) values
  ('J&T Express', null, '3-5 days', 85, true),
  ('Flash Express', null, '2-4 days', 90, true),
  ('Ninja Van', null, '3-5 days', 85, true),
  ('LBC Express', null, '2-3 days', 100, true),
  ('GoGo Xpress', null, '3-7 days', 75, true)
  on conflict (name) do nothing;

-- 2. listing_couriers table
create table if not exists public.listing_couriers (
    id uuid primary key default gen_random_uuid(),
    listing_id uuid not null references public.listings(id) on delete cascade,
    courier_id uuid not null references public.shipping_couriers(id) on delete cascade,
    shipping_fee numeric
);

-- RLS: Anyone can read; only listing owner can insert/delete
-- Enable RLS
alter table public.shipping_couriers enable row level security;
alter table public.listing_couriers enable row level security;

-- Public SELECT for both tables
create policy "Public read couriers" on public.shipping_couriers for select using (true);
create policy "Public read listing_couriers" on public.listing_couriers for select using (true);

-- Only listing owner can insert/delete listing_couriers
create policy "Owner insert listing_couriers" on public.listing_couriers for insert using (
  exists (
    select 1 from public.listings l where l.id = listing_id and l.user_id = auth.uid()
  )
);
create policy "Owner delete listing_couriers" on public.listing_couriers for delete using (
  exists (
    select 1 from public.listings l where l.id = listing_id and l.user_id = auth.uid()
  )
);

-- No insert/update/delete for shipping_couriers except by admin (add as needed)
