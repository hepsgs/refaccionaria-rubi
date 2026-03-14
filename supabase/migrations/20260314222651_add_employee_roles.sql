-- Up Migration

-- Add rol column
ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS "rol" text DEFAULT 'cliente';

-- Add permisos column 
ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS "permisos" jsonb DEFAULT '{}'::jsonb;

-- Migrate existing admins
UPDATE perfiles SET rol = 'admin' WHERE es_admin = true;

-- Down Migration
-- ALTER TABLE perfiles DROP COLUMN IF EXISTS "rol";
-- ALTER TABLE perfiles DROP COLUMN IF EXISTS "permisos";
