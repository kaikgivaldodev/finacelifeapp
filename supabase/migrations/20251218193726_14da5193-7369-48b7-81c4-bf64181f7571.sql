-- Tabela de conexões bancárias (Open Finance / Pluggy)
CREATE TABLE public.bank_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'pluggy',
  provider_item_id text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disconnected', 'error')),
  last_sync_at timestamptz,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Tabela de contas bancárias
CREATE TABLE public.bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid NOT NULL REFERENCES public.bank_connections(id) ON DELETE CASCADE,
  provider_account_id text NOT NULL,
  name text NOT NULL,
  institution_name text,
  type text NOT NULL DEFAULT 'other' CHECK (type IN ('checking', 'savings', 'wallet', 'credit', 'investment', 'other')),
  currency text NOT NULL DEFAULT 'BRL',
  current_balance numeric(14,2) NOT NULL DEFAULT 0,
  available_balance numeric(14,2),
  last_refreshed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(connection_id, provider_account_id)
);

-- Enable RLS
ALTER TABLE public.bank_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for bank_connections
CREATE POLICY "Users can view own bank_connections"
  ON public.bank_connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bank_connections"
  ON public.bank_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bank_connections"
  ON public.bank_connections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own bank_connections"
  ON public.bank_connections FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for bank_accounts (via join com bank_connections)
CREATE POLICY "Users can view own bank_accounts"
  ON public.bank_accounts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bank_connections bc
      WHERE bc.id = connection_id AND bc.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own bank_accounts"
  ON public.bank_accounts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bank_connections bc
      WHERE bc.id = connection_id AND bc.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own bank_accounts"
  ON public.bank_accounts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.bank_connections bc
      WHERE bc.id = connection_id AND bc.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own bank_accounts"
  ON public.bank_accounts FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.bank_connections bc
      WHERE bc.id = connection_id AND bc.user_id = auth.uid()
    )
  );

-- Trigger para updated_at
CREATE TRIGGER update_bank_connections_updated_at
  BEFORE UPDATE ON public.bank_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bank_accounts_updated_at
  BEFORE UPDATE ON public.bank_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();