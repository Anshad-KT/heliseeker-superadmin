-- 005_split_modules_permissions.sql
-- Split `role_permissions` into:
--   - `modules` (module catalog)
--   - `permissions` (permission catalog: view/create/edit)
--   - `role_permissions` (join table: role_id + module_id + permission_id)
--
-- Also migrates data from the legacy boolean-based table created earlier.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- If the legacy boolean table exists, keep it as a snapshot.
ALTER TABLE IF EXISTS public.role_permissions RENAME TO role_permissions_legacy;

CREATE TABLE IF NOT EXISTS public.permissions (
  permission_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  permission_name text NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS public.modules (
  module_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  module_name text NOT NULL UNIQUE,
  module_parent text,
  link text,
  module_name_label text,
  module_parent_label text
);

CREATE TABLE IF NOT EXISTS public.role_permissions (
  role_permission_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  role_id uuid NOT NULL REFERENCES public.roles(role_id) ON UPDATE CASCADE ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES public.permissions(permission_id) ON UPDATE CASCADE ON DELETE CASCADE,
  module_id uuid NOT NULL REFERENCES public.modules(module_id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT role_permissions_unique_triplet UNIQUE (role_id, module_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON public.role_permissions (role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_module ON public.role_permissions (module_id);

-- Seed base permissions used by the UI.
INSERT INTO public.permissions (permission_name)
VALUES ('view'), ('create'), ('edit')
ON CONFLICT (permission_name) DO NOTHING;

-- Seed known modules (matches the admin access UI).
INSERT INTO public.modules (module_name, module_name_label, link)
VALUES
  ('centers', 'Centers', null),
  ('leads', 'Enquiries', null),
  ('department', 'Department', null),
  ('service', 'Service', null),
  ('specialization', 'Specialization', null),
  ('ageGroup', 'Age Group', null),
  ('flatPages', 'Flat Pages', null),
  ('customers', 'Website Users', null),
  ('userManagement', 'User Management', null),
  ('userRoles', 'User Roles', null)
ON CONFLICT (module_name) DO NOTHING;

-- RLS (keep it consistent with other admin-facing tables in this repo).
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS permissions_all_authenticated ON public.permissions;
CREATE POLICY permissions_all_authenticated
ON public.permissions
FOR ALL
TO authenticated
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS modules_all_authenticated ON public.modules;
CREATE POLICY modules_all_authenticated
ON public.modules
FOR ALL
TO authenticated
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS role_permissions_all_authenticated ON public.role_permissions;
CREATE POLICY role_permissions_all_authenticated
ON public.role_permissions
FOR ALL
TO authenticated
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

GRANT SELECT, INSERT, UPDATE, DELETE ON public.permissions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.modules TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.role_permissions TO authenticated;

-- Migrate legacy boolean permissions (if present).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'role_permissions_legacy'
  ) THEN
    -- Ensure any module keys from legacy are present in `modules`.
    INSERT INTO public.modules (module_name)
    SELECT DISTINCT l.module
    FROM public.role_permissions_legacy l
    WHERE l.module IS NOT NULL AND btrim(l.module) <> ''
    ON CONFLICT (module_name) DO NOTHING;

    -- Expand boolean columns into the join table.
    INSERT INTO public.role_permissions (role_id, module_id, permission_id)
    SELECT l.role_id, m.module_id, p.permission_id
    FROM public.role_permissions_legacy l
    JOIN public.modules m ON m.module_name = l.module
    JOIN public.permissions p ON p.permission_name = 'view'
    WHERE COALESCE(l.can_view, false) = true
    ON CONFLICT (role_id, module_id, permission_id) DO NOTHING;

    INSERT INTO public.role_permissions (role_id, module_id, permission_id)
    SELECT l.role_id, m.module_id, p.permission_id
    FROM public.role_permissions_legacy l
    JOIN public.modules m ON m.module_name = l.module
    JOIN public.permissions p ON p.permission_name = 'create'
    WHERE COALESCE(l.can_create, false) = true
    ON CONFLICT (role_id, module_id, permission_id) DO NOTHING;

    INSERT INTO public.role_permissions (role_id, module_id, permission_id)
    SELECT l.role_id, m.module_id, p.permission_id
    FROM public.role_permissions_legacy l
    JOIN public.modules m ON m.module_name = l.module
    JOIN public.permissions p ON p.permission_name = 'edit'
    WHERE COALESCE(l.can_edit, false) = true
    ON CONFLICT (role_id, module_id, permission_id) DO NOTHING;
  END IF;
END $$;
