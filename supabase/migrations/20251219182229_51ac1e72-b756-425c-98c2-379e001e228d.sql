-- Add start_date, end_date and frequency to fixed_bills
ALTER TABLE public.fixed_bills 
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS end_date date,
  ADD COLUMN IF NOT EXISTS frequency text NOT NULL DEFAULT 'monthly';

-- Add check constraint for frequency
ALTER TABLE public.fixed_bills
  DROP CONSTRAINT IF EXISTS fixed_bills_frequency_check;
ALTER TABLE public.fixed_bills
  ADD CONSTRAINT fixed_bills_frequency_check CHECK (frequency IN ('monthly'));

-- Add check constraint for end_date >= start_date
ALTER TABLE public.fixed_bills
  DROP CONSTRAINT IF EXISTS fixed_bills_end_date_check;
ALTER TABLE public.fixed_bills
  ADD CONSTRAINT fixed_bills_end_date_check CHECK (end_date IS NULL OR end_date >= start_date);

-- Update existing rows to have start_date = today if NULL
UPDATE public.fixed_bills 
SET start_date = CURRENT_DATE 
WHERE start_date IS NULL;

-- Make start_date NOT NULL after populating existing rows
ALTER TABLE public.fixed_bills 
  ALTER COLUMN start_date SET NOT NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_fixed_bills_user_start_date 
  ON public.fixed_bills(user_id, start_date);

-- Ensure unique constraint on bills_instances (fixed_bill_id, due_date)
ALTER TABLE public.bills_instances 
  DROP CONSTRAINT IF EXISTS bills_instances_fixed_bill_due_date_key;
ALTER TABLE public.bills_instances
  ADD CONSTRAINT bills_instances_fixed_bill_due_date_key 
  UNIQUE (fixed_bill_id, due_date);

-- Create index for bills_instances
CREATE INDEX IF NOT EXISTS idx_bills_instances_user_due_date 
  ON public.bills_instances(user_id, due_date);