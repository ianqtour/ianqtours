-- Migra o campo de parada dos passageiros para texto.
-- Isso permite usar os valores livres da tabela public.paradas_ordem
-- sem depender mais do enum public.paradas.
DO $$
DECLARE
    parada_type TEXT;
BEGIN
    SELECT format_type(a.atttypid, a.atttypmod)
    INTO parada_type
    FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'passageiros'
      AND a.attname = 'parada'
      AND a.attnum > 0
      AND NOT a.attisdropped;

    IF parada_type IS NOT NULL AND parada_type <> 'text' THEN
        ALTER TABLE public.passageiros
            ALTER COLUMN parada TYPE TEXT
            USING parada::TEXT;
    END IF;
END $$;
