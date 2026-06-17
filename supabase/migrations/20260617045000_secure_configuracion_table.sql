-- 1. Crear la vista pública con columnas no sensibles
CREATE OR REPLACE VIEW configuracion_publica AS
SELECT 
  id, clave, valor, platform_name, abreviatura, logo_url, favicon_url, hero_images, 
  hero_title_1, hero_title_2, hero_subtitle, about_title_1, about_title_2, 
  about_text, about_images, about_features, about_mision, about_vision, 
  about_valores, stats_products, stats_clients, stats_years, 
  distributors_title_1, distributors_title_2, distributors_text, 
  distributors_cta_text, distributors_image_url, branding_images, 
  whatsapp_number, whatsapp_message, footer_description, footer_contact_email, 
  footer_contact_phone, footer_contact_address, privacy_policy, 
  terms_conditions, social_proof_enabled, social_proof_mode, 
  social_proof_min_interval, social_proof_max_interval, 
  social_proof_content_type, social_proof_show_image, show_modelo, 
  show_proveedor, pdf_slogan, pdf_advantages, pdf_repeat_header, 
  watermark_enabled, watermark_image_url, watermark_opacity, 
  watermark_position, watermark_type, watermark_text, cms_version_text
FROM configuracion;

-- 2. Conceder permisos de lectura a los roles públicos
GRANT SELECT ON configuracion_publica TO anon, authenticated;

-- 3. Revocar acceso directo a la tabla configuracion para el rol anon
REVOKE SELECT ON configuracion FROM anon;

-- 4. Habilitar RLS en configuracion
ALTER TABLE configuracion ENABLE ROW LEVEL SECURITY;

-- 5. Crear políticas de lectura/escritura únicamente para admins y empleados
DROP POLICY IF EXISTS "Permitir lectura a admins y empleados" ON configuracion;
CREATE POLICY "Permitir lectura a admins y empleados" ON configuracion
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM perfiles
      WHERE perfiles.id = auth.uid()
      AND perfiles.rol IN ('admin', 'empleado')
    )
  );

DROP POLICY IF EXISTS "Permitir escritura a admins y empleados" ON configuracion;
CREATE POLICY "Permitir escritura a admins y empleados" ON configuracion
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM perfiles
      WHERE perfiles.id = auth.uid()
      AND perfiles.rol IN ('admin', 'empleado')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM perfiles
      WHERE perfiles.id = auth.uid()
      AND perfiles.rol IN ('admin', 'empleado')
    )
  );
