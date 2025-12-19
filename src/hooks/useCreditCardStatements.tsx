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

export interface UpdateTransactionData {
  id: string;
  date?: string;
  description?: string;
  amount?: number;
  category?: string;
}

export interface CreateTransactionData {
  credit_card_id: string;
  statement_id: string;
  date: string;
  description: string;
  amount: number;
  category: string;
}

export function useCreditCardStatements(creditCardId?: string, statementId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: statements = [], isLoading: isLoadingStatements } = useQuery({
    queryKey: ["credit-card-statements", creditCardId],
    queryFn: async () => {
      let query = supabase
        .from("credit_card_statements")
        .select("*")
        .order("reference_month", { ascending: false });

      if (creditCardId) {
        query = query.eq("credit_card_id", creditCardId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as CreditCardStatement[];
    },
    enabled: !!user,
  });

  const { data: transactions = [], isLoading: isLoadingTransactions } = useQuery({
    queryKey: ["credit-card-transactions", creditCardId, statementId],
    queryFn: async () => {
      let query = supabase
        .from("credit_card_transactions")
        .select("*")
        .order("date", { ascending: false });

      if (creditCardId) {
        query = query.eq("credit_card_id", creditCardId);
      }

      if (statementId) {
        query = query.eq("statement_id", statementId);
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
      closingDay,
    }: {
      creditCardId: string;
      transactions: ParsedTransaction[];
      fileName: string;
      fileHash: string;
      fileType: "csv" | "ofx";
      closingDay?: number;
    }) => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("import-credit-card", {
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
        throw new Error(response.error.message || "Import failed");
      }

      return response.data as ImportResult;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["credit-card-statements"] });
      queryClient.invalidateQueries({ queryKey: ["credit-card-transactions"] });
      toast.success(
        `Importação concluída: ${result.importedCount} compras adicionadas, ${result.duplicateCount} duplicadas ignoradas`,
      );
    },
    onError: (error) => {
      console.error("Import error:", error);
      toast.error("Erro ao importar arquivo");
    },
  });

  // Update transaction mutation
  const updateTransactionMutation = useMutation({
    mutationFn: async (data: UpdateTransactionData) => {
      const { id, ...updateData } = data;

      // If amount or date changed, regenerate fingerprint
      if (
        updateData.amount !== undefined ||
        updateData.date !== undefined ||
        updateData.description !== undefined
      ) {
        const currentTransaction = transactions.find((t) => t.id === id);
        if (currentTransaction) {
          const newDate = updateData.date || currentTransaction.date;
          const newAmount = updateData.amount ?? currentTransaction.amount;
          const newDescription = updateData.description || currentTransaction.description;
          const normalizedDesc = newDescription.toLowerCase().replace(/\s+/g, "").substring(0, 50);
          (updateData as any).fingerprint = `${newDate}_${newAmount.toFixed(2)}_${normalizedDesc}`;
        }
      }

      const { data: result, error } = await supabase
        .from("credit_card_transactions")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: async (updatedTransaction) => {
      // Recalculate statement total
      if (updatedTransaction.statement_id) {
        await recalculateStatementTotal(updatedTransaction.statement_id);
      }
      queryClient.invalidateQueries({ queryKey: ["credit-card-statements"] });
      queryClient.invalidateQueries({ queryKey: ["credit-card-transactions"] });
      toast.success("Transação atualizada com sucesso");
    },
    onError: (error) => {
      console.error("Update transaction error:", error);
      toast.error("Erro ao atualizar transação");
    },
  });

  // Delete transaction mutation
  const deleteTransactionMutation = useMutation({
    mutationFn: async (transactionId: string) => {
      // Get the transaction first to know its statement_id
      const transaction = transactions.find((t) => t.id === transactionId);

      const { error } = await supabase
        .from("credit_card_transactions")
        .delete()
        .eq("id", transactionId);

      if (error) throw error;
      return transaction?.statement_id;
    },
    onSuccess: async (statementId) => {
      // Recalculate statement total
      if (statementId) {
        await recalculateStatementTotal(statementId);
      }
      queryClient.invalidateQueries({ queryKey: ["credit-card-statements"] });
      queryClient.invalidateQueries({ queryKey: ["credit-card-transactions"] });
      toast.success("Transação excluída com sucesso");
    },
    onError: (error) => {
      console.error("Delete transaction error:", error);
      toast.error("Erro ao excluir transação");
    },
  });

  // Create manual transaction mutation
  const createTransactionMutation = useMutation({
    mutationFn: async (data: CreateTransactionData) => {
      if (!user) throw new Error("Usuário não autenticado");

      const normalizedDesc = data.description
        .toLowerCase()
        .replace(/\s+/g, "")
        .substring(0, 50);
      const fingerprint = `${data.date}_${data.amount.toFixed(2)}_${normalizedDesc}`;

      const { data: result, error } = await supabase
        .from("credit_card_transactions")
        .insert({
          user_id: user.id,
          credit_card_id: data.credit_card_id,
          statement_id: data.statement_id,
          date: data.date,
          amount: data.amount,
          description: data.description,
          category: data.category,
          external_id: null,
          import_id: null,
          fingerprint,
        })
        .select()
        .single();

      if (error) throw error;
      return result as CreditCardTransaction;
    },
    onSuccess: async (createdTransaction) => {
      if (createdTransaction.statement_id) {
        await recalculateStatementTotal(createdTransaction.statement_id);
      }
      queryClient.invalidateQueries({ queryKey: ["credit-card-statements"] });
      queryClient.invalidateQueries({ queryKey: ["credit-card-transactions"] });
      toast.success("Transação adicionada com sucesso");
    },
    onError: (error) => {
      console.error("Create transaction error:", error);
      toast.error("Erro ao adicionar transação");
    },
  });

  // Mark statement as paid mutation
  const markStatementAsPaidMutation = useMutation({
    mutationFn: async (statementId: string) => {
      const { data, error } = await supabase
        .from("credit_card_statements")
        .update({ status: "paid" })
        .eq("id", statementId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["credit-card-statements"] });
      toast.success("Fatura marcada como paga");
    },
    onError: (error) => {
      console.error("Mark as paid error:", error);
      toast.error("Erro ao marcar fatura como paga");
    },
  });

  // Helper to recalculate statement total
  const recalculateStatementTotal = async (statementId: string) => {
    const { data: statementTransactions, error: fetchError } = await supabase
      .from("credit_card_transactions")
      .select("amount")
      .eq("statement_id", statementId);

    if (fetchError) {
      console.error("Error fetching transactions for recalculation:", fetchError);
      return;
    }

    const total = statementTransactions?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;

    const { error: updateError } = await supabase
      .from("credit_card_statements")
      .update({ total_amount: total })
      .eq("id", statementId);

    if (updateError) {
      console.error("Error updating statement total:", updateError);
    }
  };

  const getCurrentMonthStatement = (cardId: string) => {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    return statements.find(
      (s) => s.credit_card_id === cardId && s.reference_month === currentMonth,
    );
  };

  const getTransactionsForStatement = (stmtId: string) => {
    return transactions.filter((t) => t.statement_id === stmtId);
  };

  const getStatementById = (stmtId: string) => {
    return statements.find((s) => s.id === stmtId);
  };

  const getStatementByMonth = (cardId: string, referenceMonth: string) => {
    return statements.find(
      (s) => s.credit_card_id === cardId && s.reference_month === referenceMonth,
    );
  };

  return {
    statements,
    transactions,
    isLoadingStatements,
    isLoadingTransactions,
    importTransactions: importMutation.mutateAsync,
    isImporting: importMutation.isPending,
    updateTransaction: updateTransactionMutation.mutateAsync,
    isUpdatingTransaction: updateTransactionMutation.isPending,
    deleteTransaction: deleteTransactionMutation.mutateAsync,
    isDeletingTransaction: deleteTransactionMutation.isPending,
    createTransaction: createTransactionMutation.mutateAsync,
    isCreatingTransaction: createTransactionMutation.isPending,
    markStatementAsPaid: markStatementAsPaidMutation.mutateAsync,
    isMarkingPaid: markStatementAsPaidMutation.isPending,
    getCurrentMonthStatement,
    getTransactionsForStatement,
    getStatementById,
    getStatementByMonth,
  };
}
