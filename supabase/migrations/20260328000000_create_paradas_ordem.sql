-- Tabela para armazenar a ordem configurável das paradas
-- Essa ordem é usada na página do guia para agrupar passageiros
CREATE TABLE IF NOT EXISTS public.paradas_ordem (
    id SERIAL PRIMARY KEY,
    parada TEXT NOT NULL UNIQUE,
    posicao INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.paradas_ordem ENABLE ROW LEVEL SECURITY;

-- Política de leitura pública (o guia precisa ler sem auth)
CREATE POLICY "Allow public read on paradas_ordem"
    ON public.paradas_ordem
    FOR SELECT
    USING (true);

-- Política de escrita para usuários autenticados
CREATE POLICY "Allow authenticated write on paradas_ordem"
    ON public.paradas_ordem
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Função para popular a tabela com os valores do enum se estiver vazia
CREATE OR REPLACE FUNCTION public.init_paradas_ordem()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.paradas_ordem LIMIT 1) THEN
        INSERT INTO public.paradas_ordem (parada, posicao)
        SELECT e.enumlabel::TEXT, ROW_NUMBER() OVER (ORDER BY e.enumsortorder)
        FROM pg_enum e
        JOIN pg_type t ON t.oid = e.enumtypid
        WHERE t.oid = to_regtype('public.paradas');
    END IF;
END;
$$;

-- Popular automaticamente ao rodar a migration
SELECT public.init_paradas_ordem();
