-- Adiciona a coluna is_guide na tabela passageiros_reserva
ALTER TABLE passageiros_reserva ADD COLUMN IF NOT EXISTS is_guide BOOLEAN DEFAULT FALSE;
