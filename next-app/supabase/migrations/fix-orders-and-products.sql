-- ============================================================
-- LIMPOPO ATCHAR - DATABASE FIX MIGRATION
-- Run this entire file in Supabase SQL Editor
-- ============================================================

-- ============================================================
-- FIX 1: Add ALL missing columns to the orders table
-- ============================================================

-- paystack_reference - stores Paystack payment reference for card payments
alter table public.orders
  add column if not exists paystack_reference text;

comment on column public.orders.paystack_reference is 'Paystack transaction reference for card payments';

-- status - order fulfilment status (already in schema file, may be missing in live DB)
alter table public.orders
  add column if not exists status text not null default 'New';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'orders_status_check'
  ) then
    alter table public.orders
      add constraint orders_status_check
      check (status in ('New','Confirmed','Preparing','Out for delivery','Delivered','Cancelled'));
  end if;
end $$;

-- delivery_eta - estimated delivery time/date shown to customer
alter table public.orders
  add column if not exists delivery_eta text not null default '';

-- ============================================================
-- FIX 2: Fix payment_method check constraint
-- The old constraint only allowed ('cod','online') but code sends 'card'
-- ============================================================

do $$
begin
  if exists (
    select 1 from pg_constraint where conname = 'orders_payment_method_check'
  ) then
    alter table public.orders drop constraint orders_payment_method_check;
  end if;
end $$;

alter table public.orders
  add constraint orders_payment_method_check
  check (payment_method in ('cod', 'card', 'online'));

-- Fix any existing rows
update public.orders set payment_method = 'card' where payment_method = 'online';

-- ============================================================
-- FIX 3: Add 'category' column to products table (missing from original schema)
-- ============================================================

alter table public.products
  add column if not exists category text not null default '';

comment on column public.products.category is 'Product flavour/category grouping (e.g. Mango Atchar, Garlic Atchar)';

-- Backfill category for existing products (use name as default category)
update public.products set category = name where category is null or category = '';

-- ============================================================
-- FIX 4: Make sure confirmation_code exists and is unique
-- ============================================================

alter table public.orders
  add column if not exists confirmation_code text;

update public.orders
set confirmation_code = 'LP-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6))
where confirmation_code is null;

do $$
begin
  if not exists (
    select 1 from pg_indexes where indexname = 'orders_confirmation_code_key'
  ) then
    create unique index orders_confirmation_code_key on public.orders (confirmation_code);
  end if;
end $$;

alter table public.orders alter column confirmation_code set not null;

-- ============================================================
-- FIX 5: payment_method and payment_status defaults
-- ============================================================

alter table public.orders alter column payment_method set default 'cod';
alter table public.orders alter column payment_status set default 'Pending';
alter table public.orders alter column delivery_fee set default 30;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'orders_payment_status_check'
  ) then
    alter table public.orders
      add constraint orders_payment_status_check
      check (payment_status in ('Pending','Paid','Failed'));
  end if;
end $$;

-- ============================================================
-- FIX 6: Refresh the PostgREST / Supabase API schema cache
-- This is CRITICAL after adding columns - otherwise API says "column not in schema cache"
-- ============================================================

notify pgrst, 'reload schema';

-- ============================================================
-- FIX 7: RLS Policies - make sure they work
-- ============================================================

-- Re-create policies for orders
drop policy if exists "Anyone can create orders" on public.orders;
create policy "Anyone can create orders" on public.orders
  for insert with check (true);

drop policy if exists "Admins can manage orders" on public.orders;
create policy "Admins can manage orders" on public.orders
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "Authenticated users can view orders" on public.orders;
create policy "Authenticated users can view orders" on public.orders
  for select using (auth.role() = 'authenticated');

-- Re-create policies for order_items
drop policy if exists "Anyone can create order items" on public.order_items;
create policy "Anyone can create order items" on public.order_items
  for insert with check (true);

drop policy if exists "Admins can view order items" on public.order_items;
create policy "Admins can view order items" on public.order_items
  for select using (auth.role() = 'authenticated');

drop policy if exists "Admins can manage order items" on public.order_items;
create policy "Admins can manage order items" on public.order_items
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Re-create products policies
drop policy if exists "Anyone can view active products" on public.products;
create policy "Anyone can view active products" on public.products
  for select using (active = true or auth.role() = 'authenticated');

drop policy if exists "Admins can manage products" on public.products;
create policy "Admins can manage products" on public.products
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- ============================================================
-- VERIFICATION - Run this after to confirm all columns exist
-- ============================================================
-- select column_name, data_type, is_nullable, column_default
-- from information_schema.columns
-- where table_schema = 'public' and table_name = 'orders'
-- order by ordinal_position;
