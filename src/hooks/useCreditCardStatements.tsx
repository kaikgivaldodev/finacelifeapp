import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface CreditCardStatement {
  id: string;
  user_id: string;
  credit_card_id: string;
  reference_month: string;
  closing_date: string | null;
  due_date: string | null;
  total_amount: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface CreditCardTransaction {
  id: string;
  user_id: string;
  credit_card_id: string;
  statement_id: string | null;
  date: string;
  amount: number;
  description: string;
  category: string;
  external_id: string | null;
  import_id: string | null;
  fingerprint: string;
  created_at: string;
  updated_at: string;
}

export interface ImportResult {
  success: boolean;
  importId: string;
  importedCount: number;
  duplicateCount: number;
  totalRecords: number;
}

export interface ParsedTransaction {
  date: string;
  description: string;
  amount: number;
  externalId?: string;
  category?: string;
}

export function useCreditCardStatements(creditCardId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: statements = [], isLoading: isLoadingStatements } = useQuery({
    queryKey: ['credit-card-statements', creditCardId],
    queryFn: async () => {
      let query = supabase
        .from('credit_card_statements')
        .select('*')
        .order('reference_month', { ascending: false });

      if (creditCardId) {
        query = query.eq('credit_card_id', creditCardId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as CreditCardStatement[];
    },
    enabled: !!user,
  });

  const { data: transactions = [], isLoading: isLoadingTransactions } = useQuery({
    queryKey: ['credit-card-transactions', creditCardId],
    queryFn: async () => {
      let query = supabase
        .from('credit_card_transactions')
        .select('*')
        .order('date', { ascending: false });

      if (creditCardId) {
        query = query.eq('credit_card_id', creditCardId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as CreditCardTransaction[];
    },
    enabled: !!user,
  });

  const importMutation = useMutation({
    mutationFn: async ({ 
      creditCardId, 
      transactions, 
      fileName, 
      fileHash, 
      fileType,
      closingDay 
    }: {
      creditCardId: string;
      transactions: ParsedTransaction[];
      fileName: string;
      fileHash: string;
      fileType: 'csv' | 'ofx';
      closingDay?: number;
    }) => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('import-credit-card', {
        body: {
          creditCardId,
          transactions,
          fileName,
          fileHash,
          fileType,
          closingDay,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Import failed');
      }

      return response.data as ImportResult;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['credit-card-statements'] });
      queryClient.invalidateQueries({ queryKey: ['credit-card-transactions'] });
      toast.success(
        `Importação concluída: ${result.importedCount} compras adicionadas, ${result.duplicateCount} duplicadas ignoradas`
      );
    },
    onError: (error) => {
      console.error('Import error:', error);
      toast.error('Erro ao importar arquivo');
    },
  });

  const getCurrentMonthStatement = (cardId: string) => {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    return statements.find(
      s => s.credit_card_id === cardId && s.reference_month === currentMonth
    );
  };

  const getTransactionsForStatement = (statementId: string) => {
    return transactions.filter(t => t.statement_id === statementId);
  };

  return {
    statements,
    transactions,
    isLoadingStatements,
    isLoadingTransactions,
    importTransactions: importMutation.mutateAsync,
    isImporting: importMutation.isPending,
    getCurrentMonthStatement,
    getTransactionsForStatement,
  };
}
