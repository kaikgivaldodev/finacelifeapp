-- Add closing_day to credit_cards if it doesn't exist
ALTER TABLE public.credit_cards ADD COLUMN IF NOT EXISTS closing_day integer;

-- Create imports table for tracking file imports
CREATE TABLE IF NOT EXISTS public.imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  file_name text NOT NULL,
  file_hash text NOT NULL,
  file_type text NOT NULL DEFAULT 'csv',
  scope text NOT NULL DEFAULT 'account',
  account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  credit_card_id uuid REFERENCES public.credit_cards(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'processing',
  total_records integer DEFAULT 0,
  imported_records integer DEFAULT 0,
  duplicate_records integer DEFAULT 0,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create credit_card_statements table (faturas)
CREATE TABLE public.credit_card_statements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  credit_card_id uuid NOT NULL REFERENCES public.credit_cards(id) ON DELETE CASCADE,
  reference_month date NOT NULL,
  closing_date date,
  due_date date,
  total_amount numeric(14,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_statement_per_month UNIQUE(user_id, credit_card_id, reference_month)
);

-- Create credit_card_transactions table
CREATE TABLE public.credit_card_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  credit_card_id uuid NOT NULL REFERENCES public.credit_cards(id) ON DELETE CASCADE,
  statement_id uuid REFERENCES public.credit_card_statements(id) ON DELETE SET NULL,
  date date NOT NULL,
  amount numeric(14,2) NOT NULL,
  description text NOT NULL,
  category text NOT NULL DEFAULT 'Sem categoria',
  external_id text,
  import_id uuid REFERENCES public.imports(id) ON DELETE SET NULL,
  fingerprint text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create unique index for deduplication
CREATE UNIQUE INDEX IF NOT EXISTS idx_credit_card_transactions_dedup 
  ON public.credit_card_transactions(user_id, credit_card_id, fingerprint);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_credit_card_transactions_statement 
  ON public.credit_card_transactions(statement_id);
CREATE INDEX IF NOT EXISTS idx_credit_card_transactions_date 
  ON public.credit_card_transactions(credit_card_id, date);
CREATE INDEX IF NOT EXISTS idx_credit_card_statements_month 
  ON public.credit_card_statements(credit_card_id, reference_month);

-- Enable RLS on all new tables
ALTER TABLE public.imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_card_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_card_transactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for imports
CREATE POLICY "Users can view own imports" ON public.imports FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own imports" ON public.imports FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own imports" ON public.imports FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own imports" ON public.imports FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for credit_card_statements
CREATE POLICY "Users can view own statements" ON public.credit_card_statements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own statements" ON public.credit_card_statements FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own statements" ON public.credit_card_statements FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own statements" ON public.credit_card_statements FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for credit_card_transactions
CREATE POLICY "Users can view own cc transactions" ON public.credit_card_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own cc transactions" ON public.credit_card_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own cc transactions" ON public.credit_card_transactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own cc transactions" ON public.credit_card_transactions FOR DELETE USING (auth.uid() = user_id);

-- Add triggers for updated_at
CREATE TRIGGER update_imports_updated_at BEFORE UPDATE ON public.imports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_credit_card_statements_updated_at BEFORE UPDATE ON public.credit_card_statements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_credit_card_transactions_updated_at BEFORE UPDATE ON public.credit_card_transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();