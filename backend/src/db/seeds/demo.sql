-- Connexa demo database (public schema)
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS customers CASCADE;

CREATE TABLE customers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  city VARCHAR(100),
  country VARCHAR(100),
  joined_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  category VARCHAR(100),
  price DECIMAL(10,2) NOT NULL,
  stock_quantity INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  status VARCHAR(50) DEFAULT 'pending',
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  ordered_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ
);

CREATE TABLE order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL
);

INSERT INTO customers (name, email, city, country) VALUES
  ('Alice Chen', 'alice@example.com', 'Toronto', 'Canada'),
  ('Bob Martinez', 'bob@example.com', 'Calgary', 'Canada'),
  ('Carol White', 'carol@example.com', 'Vancouver', 'Canada'),
  ('David Kim', 'david@example.com', 'New York', 'USA'),
  ('Emma Davis', 'emma@example.com', 'London', 'UK'),
  ('Frank Wilson', 'frank@example.com', 'Chicago', 'USA'),
  ('Grace Lee', 'grace@example.com', 'Seattle', 'USA'),
  ('Henry Brown', 'henry@example.com', 'Boston', 'USA'),
  ('Ivy Taylor', 'ivy@example.com', 'Montreal', 'Canada'),
  ('Jack Anderson', 'jack@example.com', 'Ottawa', 'Canada'),
  ('Karen Thomas', 'karen@example.com', 'Denver', 'USA'),
  ('Leo Jackson', 'leo@example.com', 'Austin', 'USA'),
  ('Mia Harris', 'mia@example.com', 'Portland', 'USA'),
  ('Noah Martin', 'noah@example.com', 'San Francisco', 'USA'),
  ('Olivia Garcia', 'olivia@example.com', 'Los Angeles', 'USA'),
  ('Paul Rodriguez', 'paul@example.com', 'Miami', 'USA'),
  ('Quinn Lewis', 'quinn@example.com', 'Dallas', 'USA'),
  ('Rachel Walker', 'rachel@example.com', 'Phoenix', 'USA'),
  ('Sam Hall', 'sam@example.com', 'Edmonton', 'Canada'),
  ('Tina Allen', 'tina@example.com', 'Winnipeg', 'Canada'),
  ('Uma Young', 'uma@example.com', 'Halifax', 'Canada'),
  ('Victor King', 'victor@example.com', 'Birmingham', 'UK'),
  ('Wendy Wright', 'wendy@example.com', 'Manchester', 'UK'),
  ('Xavier Lopez', 'xavier@example.com', 'Madrid', 'Spain'),
  ('Yara Hill', 'yara@example.com', 'Barcelona', 'Spain'),
  ('Zane Scott', 'zane@example.com', 'Berlin', 'Germany'),
  ('Ava Green', 'ava@example.com', 'Munich', 'Germany'),
  ('Ben Adams', 'ben@example.com', 'Paris', 'France'),
  ('Chloe Baker', 'chloe@example.com', 'Lyon', 'France'),
  ('Dan Nelson', 'dan@example.com', 'Amsterdam', 'Netherlands'),
  ('Ella Carter', 'ella@example.com', 'Brussels', 'Belgium'),
  ('Finn Mitchell', 'finn@example.com', 'Dublin', 'Ireland'),
  ('Gina Perez', 'gina@example.com', 'Rome', 'Italy'),
  ('Hugo Roberts', 'hugo@example.com', 'Milan', 'Italy'),
  ('Iris Turner', 'iris@example.com', 'Stockholm', 'Sweden'),
  ('Jake Phillips', 'jake@example.com', 'Oslo', 'Norway'),
  ('Kate Campbell', 'kate@example.com', 'Copenhagen', 'Denmark'),
  ('Liam Parker', 'liam@example.com', 'Zurich', 'Switzerland'),
  ('Maya Evans', 'maya@example.com', 'Vienna', 'Austria'),
  ('Nate Edwards', 'nate@example.com', 'Prague', 'Czech Republic'),
  ('Olive Collins', 'olive@example.com', 'Warsaw', 'Poland'),
  ('Pete Stewart', 'pete@example.com', 'Lisbon', 'Portugal'),
  ('Quincy Morris', 'quincy@example.com', 'Athens', 'Greece'),
  ('Rita Rogers', 'rita@example.com', 'Budapest', 'Hungary'),
  ('Sean Reed', 'sean@example.com', 'Helsinki', 'Finland'),
  ('Tara Cook', 'tara@example.com', 'Singapore', 'Singapore'),
  ('Ulysses Morgan', 'ulysses@example.com', 'Tokyo', 'Japan'),
  ('Vera Bell', 'vera@example.com', 'Seoul', 'South Korea'),
  ('Wade Murphy', 'wade@example.com', 'Sydney', 'Australia'),
  ('Xena Bailey', 'xena@example.com', 'Melbourne', 'Australia');

INSERT INTO products (name, category, price, stock_quantity) VALUES
  ('Wireless Headphones', 'Electronics', 89.99, 150),
  ('Mechanical Keyboard', 'Electronics', 129.99, 75),
  ('Standing Desk', 'Furniture', 349.00, 30),
  ('Coffee Maker', 'Appliances', 79.99, 200),
  ('Notebook Set', 'Stationery', 19.99, 500),
  ('Webcam HD', 'Electronics', 59.99, 90),
  ('Monitor Arm', 'Furniture', 49.99, 60),
  ('USB-C Hub', 'Electronics', 39.99, 300),
  ('Desk Lamp', 'Furniture', 34.99, 180),
  ('Ergonomic Chair', 'Furniture', 499.00, 20),
  ('Bluetooth Speaker', 'Electronics', 69.99, 120),
  ('Mouse Pad XL', 'Accessories', 24.99, 400),
  ('Cable Management Kit', 'Accessories', 14.99, 250),
  ('Laptop Stand', 'Accessories', 44.99, 110),
  ('Screen Cleaner', 'Accessories', 9.99, 600),
  ('Power Strip', 'Electronics', 29.99, 200),
  ('Whiteboard', 'Stationery', 89.99, 40),
  ('Planner 2025', 'Stationery', 24.99, 300),
  ('Pen Set', 'Stationery', 12.99, 700),
  ('Sticky Notes Pack', 'Stationery', 7.99, 800);

DO $$
DECLARE
  i INT;
  j INT;
  cust_id INT;
  ord_id INT;
  prod_id INT;
  qty INT;
  price DECIMAL;
  stat VARCHAR;
  statuses VARCHAR[] := ARRAY['pending','confirmed','shipped','delivered','delivered','delivered','cancelled'];
BEGIN
  FOR i IN 1..200 LOOP
    cust_id := floor(random() * 50 + 1)::INT;
    stat := statuses[floor(random() * 7 + 1)::INT];
    INSERT INTO orders (customer_id, status, total_amount, ordered_at)
    VALUES (cust_id, stat, 0, NOW() - (random() * 365 || ' days')::INTERVAL)
    RETURNING id INTO ord_id;

    FOR j IN 1..floor(random()*3+1)::INT LOOP
      prod_id := floor(random()*20+1)::INT;
      qty := floor(random()*3+1)::INT;
      SELECT p.price INTO price FROM products p WHERE p.id = prod_id;
      INSERT INTO order_items (order_id, product_id, quantity, unit_price)
      VALUES (ord_id, prod_id, qty, price);
      UPDATE orders SET total_amount = total_amount + (qty * price) WHERE id = ord_id;
    END LOOP;
  END LOOP;
END $$;
