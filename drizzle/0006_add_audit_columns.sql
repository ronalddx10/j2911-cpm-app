ALTER TABLE cpm_menus
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT NOW(),
  ADD COLUMN created_by_user_id bigint,
  ADD COLUMN updated_by_user_id bigint;

ALTER TABLE cpm_items
  ADD COLUMN created_at timestamptz NOT NULL DEFAULT NOW(),
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT NOW(),
  ADD COLUMN created_by_user_id bigint,
  ADD COLUMN updated_by_user_id bigint;

ALTER TABLE cpm_clients
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT NOW(),
  ADD COLUMN created_by_user_id bigint,
  ADD COLUMN updated_by_user_id bigint;
