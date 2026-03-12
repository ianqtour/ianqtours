CREATE OR REPLACE FUNCTION public.get_enum_values(p_enum_name TEXT)
RETURNS TABLE (value TEXT)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    e.enumlabel::TEXT AS value
  FROM
    pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
  WHERE
    t.oid = to_regtype(p_enum_name)
  ORDER BY
    e.enumsortorder;
$$;
