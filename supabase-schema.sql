create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  size text not null,
  price numeric(10,2) not null default 0 check (price >= 0),
  badge text not null default '',
  stock integer not null default 0 check (stock >= 0),
  image text not null default 'mango atcher banner 1.png',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  confirmation_code text not null unique,
  customer_name text not null,
  phone text not null,
  city text not null,
  address text not null,
  notes text not null default '',
  total numeric(10,2) not null default 0 check (total >= 0),
  payment_method text not null default 'cod' check (payment_method in ('cod','online')),
  payment_status text not null default 'Pending' check (payment_status in ('Pending','Paid','Failed')),
  delivery_fee numeric(10,2) not null default 30 check (delivery_fee >= 0),
  status text not null default 'New' check (status in ('New','Confirmed','Preparing','Out for delivery','Delivered','Cancelled')),
  delivery_eta text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  size text not null,
  price numeric(10,2) not null check (price >= 0),
  quantity integer not null default 1 check (quantity > 0)
);

alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

drop policy if exists "Anyone can view active products" on public.products;
create policy "Anyone can view active products" on public.products for select using (active = true or auth.role() = 'authenticated');

drop policy if exists "Anyone can create orders" on public.orders;
create policy "Anyone can create orders" on public.orders for insert with check (true);

drop policy if exists "Admins can manage orders" on public.orders;
create policy "Admins can manage orders" on public.orders for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "Anyone can create order items" on public.order_items;
create policy "Anyone can create order items" on public.order_items for insert with check (true);

drop policy if exists "Admins can view order items" on public.order_items;
create policy "Admins can view order items" on public.order_items for select using (auth.role() = 'authenticated');

drop policy if exists "Admins can manage products" on public.products;
create policy "Admins can manage products" on public.products for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

alter table public.orders add column if not exists payment_method text not null default 'cod';
alter table public.orders add column if not exists delivery_fee numeric(10,2) not null default 30;
alter table public.orders add column if not exists confirmation_code text;
alter table public.orders add column if not exists payment_status text not null default 'Pending';
update public.orders set confirmation_code = 'LP-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6)) where confirmation_code is null;
create unique index if not exists orders_confirmation_code_key on public.orders (confirmation_code);
alter table public.orders alter column confirmation_code set not null;

insert into public.products (name, size, price, badge, stock, image)
select * from (values
  ('Mango Atchar', '1kg', 80, 'Best Seller', 20, 'mango atcher banner 1.png'),
  ('Mango Atchar', '2kg', 150, 'New', 20, 'mango atcher banner 1.png'),
  ('Mango Atchar', '5kg', 300, '', 20, 'mango atcher banner 1.png'),
  ('Mango Atchar', '10kg', 550, '', 20, 'mango atcher banner 1.png')
) as seed(name, size, price, badge, stock, image)
where not exists (select 1 from public.products);
