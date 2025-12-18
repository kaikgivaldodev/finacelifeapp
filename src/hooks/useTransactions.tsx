/**
 * Hook para gerenciar lançamentos (transactions)
 * CRUD completo com Supabase
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface Transaction {
  id: string;
  user_id: string;
  account_id: string | null;
  type: "income" | "expense";
  date: string;
  amount: number;
  category: string;
  description: string | null;
  payment_method: string;
  credit_card_id: string | null;
  is_recurring: boolean;
  fixed_bill_instance_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTransactionData {
  type: "income" | "expense";
  date: string;
  amount: number;
  category: string;
  description?: string;
  payment_method: string;
  credit_card_id?: string | null;
  account_id?: string | null;
}

export interface UpdateTransactionData extends Partial<CreateTransactionData> {
  id: string;
}

export function useTransactions() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["transactions", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("date", { ascending: false });
      
      if (error) throw error;
      return data as Transaction[];
    },
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateTransactionData) => {
      if (!user) throw new Error("Usuário não autenticado");
      
      const { data: result, error } = await supabase
        .from("transactions")
        .insert({
          user_id: user.id,
          type: data.type,
          date: data.date,
          amount: data.amount,
          category: data.category,
          description: data.description || null,
          payment_method: data.payment_method,
          credit_card_id: data.credit_card_id || null,
          account_id: data.account_id || null,
        })
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["transactions_for_goals"] }); // Atualizar metas de gasto
      toast.success("Lançamento criado com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar lançamento: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: UpdateTransactionData) => {
      const { id, ...updateData } = data;
      
      const { data: result, error } = await supabase
        .from("transactions")
        .update({
          ...updateData,
          credit_card_id: updateData.credit_card_id || null,
          account_id: updateData.account_id || null,
          description: updateData.description || null,
        })
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["transactions_for_goals"] });
      toast.success("Lançamento atualizado com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar lançamento: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["transactions_for_goals"] }); // Atualizar metas de gasto
      toast.success("Lançamento excluído!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir: ${error.message}`);
    },
  });

  return {
    transactions: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    createTransaction: createMutation.mutateAsync,
    updateTransaction: updateMutation.mutateAsync,
    deleteTransaction: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
  };
}
