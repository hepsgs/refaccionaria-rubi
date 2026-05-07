CREATE OR REPLACE FUNCTION get_catalog_filters()
RETURNS json AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'marcas', (SELECT COALESCE(array_agg(DISTINCT marca ORDER BY marca), '{}') FROM productos WHERE marca IS NOT NULL),
    'proveedores', (SELECT COALESCE(array_agg(DISTINCT proveedor ORDER BY proveedor), '{}') FROM productos WHERE proveedor IS NOT NULL),
    'tipos', (SELECT COALESCE(array_agg(DISTINCT tipo ORDER BY tipo), '{}') FROM productos WHERE tipo IS NOT NULL),
    'modelos', (SELECT COALESCE(array_agg(DISTINCT modelo ORDER BY modelo), '{}') FROM productos WHERE modelo IS NOT NULL),
    'años', (
      SELECT COALESCE(array_agg(DISTINCT year ORDER BY year DESC), '{}') FROM (
        SELECT año_inicio as year FROM productos WHERE año_inicio IS NOT NULL
        UNION
        SELECT año_fin as year FROM productos WHERE año_fin IS NOT NULL
      ) years_subquery
    )
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
