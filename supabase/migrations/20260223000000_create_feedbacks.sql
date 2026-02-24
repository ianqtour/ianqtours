-- Create extension for accent insensitive search
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Create feedbacks table
CREATE TABLE IF NOT EXISTS public.feedbacks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    excursao_id UUID NOT NULL REFERENCES public.excursoes(id),
    passageiro_id UUID NOT NULL REFERENCES public.passageiros(id),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comentario TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;

-- Policy for admins to read all feedbacks
CREATE POLICY "Admins can view all feedbacks"
ON public.feedbacks
FOR SELECT
TO authenticated
USING (true); -- Assuming authenticated users are admins for now, or refine based on role

-- Function to clean CPF (remove non-digits)
CREATE OR REPLACE FUNCTION public.clean_cpf(cpf_text TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN regexp_replace(cpf_text, '\D', '', 'g');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get survey target details (publicly accessible via RPC)
CREATE OR REPLACE FUNCTION public.get_survey_target(
    p_excursion_name TEXT,
    p_cpf TEXT
)
RETURNS TABLE (
    excursao_id UUID,
    excursao_nome TEXT,
    passageiro_id UUID,
    passageiro_nome TEXT,
    has_feedback BOOLEAN
) 
SECURITY DEFINER
AS $$
DECLARE
    v_excursao_id UUID;
    v_excursao_nome TEXT;
    v_passageiro_id UUID;
    v_passageiro_nome TEXT;
    v_clean_cpf TEXT;
BEGIN
    v_clean_cpf := public.clean_cpf(p_cpf);

    -- Find excursion (case insensitive search)
    SELECT id, nome INTO v_excursao_id, v_excursao_nome
    FROM public.excursoes
    WHERE unaccent(lower(nome)) = unaccent(lower(p_excursion_name))
    LIMIT 1;

    IF v_excursao_id IS NULL THEN
        RETURN;
    END IF;

    -- Find passenger and verify reservation
    SELECT p.id, p.nome INTO v_passageiro_id, v_passageiro_nome
    FROM public.passageiros p
    JOIN public.passageiros_reserva pr ON p.id = pr.passageiro_id
    JOIN public.reservas r ON pr.reserva_id = r.id
    WHERE 
        public.clean_cpf(p.cpf) = v_clean_cpf
        AND r.excursao_id = v_excursao_id
        AND r.status != 'cancelada'
    LIMIT 1;

    IF v_passageiro_id IS NULL THEN
        RETURN;
    END IF;

    -- Check if feedback already exists
    RETURN QUERY SELECT 
        v_excursao_id,
        v_excursao_nome,
        v_passageiro_id,
        v_passageiro_nome,
        EXISTS (
            SELECT 1 FROM public.feedbacks f 
            WHERE f.excursao_id = v_excursao_id 
            AND f.passageiro_id = v_passageiro_id
        );
END;
$$ LANGUAGE plpgsql;

-- Function to submit feedback (publicly accessible via RPC)
CREATE OR REPLACE FUNCTION public.submit_feedback(
    p_excursao_id UUID,
    p_passageiro_id UUID,
    p_rating INTEGER,
    p_comentario TEXT
)
RETURNS VOID
SECURITY DEFINER
AS $$
BEGIN
    -- Verify reservation exists (double check security)
    IF NOT EXISTS (
        SELECT 1
        FROM public.passageiros_reserva pr
        JOIN public.reservas r ON pr.reserva_id = r.id
        WHERE pr.passageiro_id = p_passageiro_id
        AND r.excursao_id = p_excursao_id
        AND r.status != 'cancelada'
    ) THEN
        RAISE EXCEPTION 'Reserva não encontrada para este passageiro nesta excursão.';
    END IF;

    -- Insert feedback
    INSERT INTO public.feedbacks (excursao_id, passageiro_id, rating, comentario)
    VALUES (p_excursao_id, p_passageiro_id, p_rating, p_comentario);
END;
$$ LANGUAGE plpgsql;
