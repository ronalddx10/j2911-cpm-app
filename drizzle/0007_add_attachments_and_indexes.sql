-- Migration 0007: Add order attachments table, granular address columns, and database performance indexes

-- 1. Ensure new client columns exist
ALTER TABLE cpm_clients ADD COLUMN IF NOT EXISTS secondary_contact_name varchar;
ALTER TABLE cpm_clients ADD COLUMN IF NOT EXISTS secondary_contact_phone varchar;
ALTER TABLE cpm_clients ADD COLUMN IF NOT EXISTS secondary_contact_email varchar;
ALTER TABLE cpm_clients ADD COLUMN IF NOT EXISTS location text;

-- 2. Ensure new order columns exist
ALTER TABLE cpm_orders ADD COLUMN IF NOT EXISTS event_name varchar;
ALTER TABLE cpm_orders ADD COLUMN IF NOT EXISTS unit_number varchar;
ALTER TABLE cpm_orders ADD COLUMN IF NOT EXISTS floor_number varchar;
ALTER TABLE cpm_orders ADD COLUMN IF NOT EXISTS building_name varchar;
ALTER TABLE cpm_orders ADD COLUMN IF NOT EXISTS street_number varchar;
ALTER TABLE cpm_orders ADD COLUMN IF NOT EXISTS street_name varchar;
ALTER TABLE cpm_orders ADD COLUMN IF NOT EXISTS landmark text;

-- 3. Create cpm_order_attachments table if not exists
CREATE TABLE IF NOT EXISTS cpm_order_attachments (
  id bigserial PRIMARY KEY,
  order_id bigint NOT NULL REFERENCES cpm_orders(id) ON DELETE CASCADE,
  document_type varchar NOT NULL,
  file_name varchar NOT NULL,
  file_path varchar NOT NULL,
  file_size integer NOT NULL,
  mime_type varchar,
  is_approved boolean DEFAULT false NOT NULL,
  approved_by_user_id bigint REFERENCES cpm_users(id) ON DELETE SET NULL,
  approved_at timestamp,
  uploaded_by_user_id bigint REFERENCES cpm_users(id) ON DELETE SET NULL,
  created_at timestamp DEFAULT now() NOT NULL
);

-- 4. Create Performance B-Tree Indexes on Foreign Keys and Hot Search Columns (P2-4 Fix)
CREATE INDEX IF NOT EXISTS idx_cpm_orders_status_id ON cpm_orders(status_id);
CREATE INDEX IF NOT EXISTS idx_cpm_orders_created_at ON cpm_orders(created_at);
CREATE INDEX IF NOT EXISTS idx_cpm_orders_created_by ON cpm_orders(created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_cpm_orders_client_id ON cpm_orders(client_id);
CREATE INDEX IF NOT EXISTS idx_cpm_orders_venue_id ON cpm_orders(venue_id);

CREATE INDEX IF NOT EXISTS idx_cpm_order_days_order_id ON cpm_order_days(order_id);
CREATE INDEX IF NOT EXISTS idx_cpm_order_days_event_date ON cpm_order_days(event_date);

CREATE INDEX IF NOT EXISTS idx_cpm_meal_periods_order_day_id ON cpm_meal_periods(order_day_id);
CREATE INDEX IF NOT EXISTS idx_cpm_meal_periods_menu_id ON cpm_meal_periods(menu_id);

CREATE INDEX IF NOT EXISTS idx_cpm_meal_period_items_meal_period_id ON cpm_meal_period_items(meal_period_id);
CREATE INDEX IF NOT EXISTS idx_cpm_meal_period_items_item_id ON cpm_meal_period_items(item_id);

CREATE INDEX IF NOT EXISTS idx_cpm_order_attachments_order_id ON cpm_order_attachments(order_id);
CREATE INDEX IF NOT EXISTS idx_cpm_order_history_order_id ON cpm_order_history(order_id);
