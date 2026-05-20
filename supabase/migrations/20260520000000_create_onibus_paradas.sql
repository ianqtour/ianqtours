-- Tabela para armazenar a ordem configurável das paradas por ônibus
CREATE TABLE IF NOT EXISTS public.onibus_paradas (
    id SERIAL PRIMARY KEY,
    onibus_id UUID NOT NULL REFERENCES public.onibus(id) ON DELETE CASCADE,
    parada TEXT NOT NULL,
    posicao INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(onibus_id, parada)
);

-- Habilitar RLS
ALTER TABLE public.onibus_paradas ENABLE ROW LEVEL SECURITY;

-- Política de leitura pública (o guia precisa ler sem auth)
CREATE POLICY "Allow public read on onibus_paradas"
    ON public.onibus_paradas
    FOR SELECT
    USING (true);

-- Política de escrita para usuários autenticados
CREATE POLICY "Allow authenticated write on onibus_paradas"
    ON public.onibus_paradas
    FOR ALL
    USING (true)
    WITH CHECK (true);
