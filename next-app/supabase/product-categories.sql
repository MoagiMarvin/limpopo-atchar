alter table public.products add column if not exists category text;

update public.products
set category = name
where category is null;

alter table public.products alter column category set default 'Mango Atchar';
