-- Run after the products table exists. These rows give the starter store all three flavors and four sizes.
insert into public.products (name, size, price, badge, stock, image, active)
select seed.name, seed.size, seed.price, seed.badge, 20, '/mango-atchar-fallback.png', true
from (values
  ('Mango Atchar', '1kg', 80, 'Best Seller'),
  ('Mango Atchar', '2kg', 150, 'New'),
  ('Mango Atchar', '5kg', 300, ''),
  ('Mango Atchar', '10kg', 550, ''),
  ('Garlic Atchar', '1kg', 85, ''),
  ('Garlic Atchar', '2kg', 160, ''),
  ('Garlic Atchar', '5kg', 320, ''),
  ('Garlic Atchar', '10kg', 580, ''),
  ('Hot Chili Atchar', '1kg', 85, ''),
  ('Hot Chili Atchar', '2kg', 160, ''),
  ('Hot Chili Atchar', '5kg', 320, ''),
  ('Hot Chili Atchar', '10kg', 580, '')
) as seed(name, size, price, badge)
where not exists (
  select 1 from public.products existing
  where existing.name = seed.name and existing.size = seed.size
);
