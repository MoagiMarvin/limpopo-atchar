-- ============================================================
-- FIX 1: Add 'card' to allowed payment_method values
-- The old constraint only allowed ('cod','online') but code sends 'card'
-- ============================================================

-- First, drop the old check constraint if it exists
do $$
begin
  if exists (
    select 1 from pg_constraint 
    where conname = 'orders_payment_method_check'
  ) then
    alter table public.orders drop constraint orders_payment_method_check;
  end if;
end $$;

-- Now add the corrected constraint that includes 'card' and 'online'
alter table public.orders
  add constraint orders_payment_method_check
  check (payment_method in ('cod', 'card', 'online'));

-- Also update any existing rows that might have 'card' already blocked
update public.orders set payment_method = 'card' where payment_method = 'online';

-- ============================================================
-- FIX 2: Add 'category' column to products table (missing from schema)
-- ============================================================

alter table public.products
  add column if not exists category text not null default '';

-- Backfill category for existing products (use name as default category)
update public.products set category = name where category is null or category = '';

-- ============================================================
-- FIX 3: Ensure order_items table has product_id properly set up
-- and enable select policy for order_items for authenticated users
-- ============================================================

-- Re-create policies for order_items to make sure they're correct
drop policy if exists "Anyone can create order items" on public.order_items;
create policy "Anyone can create order items" on public.order_items
  for insert with check (true);

drop policy if exists "Admins can view order items" on public.order_items;
create policy "Admins can view order items" on public.order_items
  for select using (auth.role() = 'authenticated');

drop policy if exists "Admins can manage order items" on public.order_items;
create policy "Admins can manage order items" on public.order_items
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- ============================================================
-- FIX 4: Re-verify orders policies are correct for anon inserts
-- ============================================================

drop policy if exists "Anyone can create orders" on public.orders;
create policy "Anyone can create orders" on public.orders
  for insert with check (true);

drop policy if exists "Admins can manage orders" on public.orders;
create policy "Admins can manage orders" on public.orders
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Also add a policy so service role / API can read orders
drop policy if exists "Authenticated users can view orders" on public.orders;
create policy "Authenticated users can view orders" on public.orders
  for select using (auth.role() = 'authenticated');
