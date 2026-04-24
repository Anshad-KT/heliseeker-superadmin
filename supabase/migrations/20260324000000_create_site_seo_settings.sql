CREATE TABLE IF NOT EXISTS public.site_seo_settings (
  key text PRIMARY KEY,
  meta_title text NOT NULL DEFAULT '',
  meta_description text NOT NULL DEFAULT '',
  og_image_url text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE TRIGGER set_updated_at
BEFORE UPDATE ON public.site_seo_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.site_seo_settings (key)
VALUES ('global')
ON CONFLICT (key) DO NOTHING;

