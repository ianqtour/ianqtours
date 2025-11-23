-- Adicionar coluna 'presente' na tabela passageiros_reserva
-- Esta coluna armazena se o passageiro está presente (true), ausente (false) ou não marcado (null)

ALTER TABLE passageiros_reserva
ADD COLUMN presente BOOLEAN DEFAULT NULL;

-- Comentário: 
-- NULL = presença não foi marcada ainda
-- TRUE = passageiro está presente
-- FALSE = passageiro está ausente

