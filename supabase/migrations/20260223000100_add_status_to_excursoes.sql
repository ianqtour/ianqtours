-- Add status column to excursoes table
ALTER TABLE public.excursoes 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled'));

-- Update existing records to have 'active' status
UPDATE public.excursoes SET status = 'active' WHERE status IS NULL;
