/**
 * Hook para gerenciar metas financeiras
 * CRUD completo com Supabase
 * Metas de gasto são calculadas automaticamente baseado nas transações
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";
import { useMemo } from "react";
import { startOfMonth, endOfMonth, parseISO, isWithinInterval, format } from "date-fns";

export interface Goal {
  id: string;
  user_id: string;
  name: string;
  type: "monthly_spending" | "saving_goal";
  target_amount: number;
  current_amount: number;
  reference_month: string | null;
  created_at: string;
  updated_at: string;
}

export interface GoalWithCalculatedAmount extends Goal {
  calculated_amount: number; // Para metas de gasto, é calculado das transações
}

export interface CreateGoalData {
  name: string;
  type: "monthly_spending" | "saving_goal";
  target_amount: number;
  reference_month?: string;
}

export interface UpdateGoalData {
  id: string;
  current_amount?: number;
  name?: string;
  target_amount?: number;
}

interface Transaction {
  id: string;
  type: "income" | "expense";
  date: string;
  amount: number;
}

export function useGoals() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Buscar metas
  const goalsQuery = useQuery({
    queryKey: ["goals", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("goals")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as Goal[];
    },
    enabled: !!user,
  });

  // Buscar transações para calcular metas de gasto
  const transactionsQuery = useQuery({
    queryKey: ["transactions_for_goals", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("transactions")
        .select("id, type, date, amount")
        .eq("user_id", user.id)
        .eq("type", "expense"); // Apenas despesas
      
      if (error) throw error;
      return data as Transaction[];
    },
    enabled: !!user,
  });

  // Calcular current_amount para metas de gasto baseado nas transações
  const goalsWithCalculatedAmount = useMemo((): GoalWithCalculatedAmount[] => {
    const goals = goalsQuery.data ?? [];
    const transactions = transactionsQuery.data ?? [];

    return goals.map(goal => {
      if (goal.type === "monthly_spending" && goal.reference_month) {
        // Calcular total de despesas no mês de referência
        const refDate = parseISO(goal.reference_month);
        const monthStart = startOfMonth(refDate);
        const monthEnd = endOfMonth(refDate);

        const totalExpenses = transactions
          .filter(t => {
            const transactionDate = parseISO(t.date);
            return isWithinInterval(transactionDate, { start: monthStart, end: monthEnd });
          })
          .reduce((sum, t) => sum + t.amount, 0);

        return {
          ...goal,
          calculated_amount: totalExpenses,
          current_amount: totalExpenses, // Sobrescreve para metas de gasto
        };
      }

      // Para metas de economia, usa o valor do banco
      return {
        ...goal,
        calculated_amount: goal.current_amount,
      };
    });
  }, [goalsQuery.data, transactionsQuery.data]);

  const createMutation = useMutation({
    mutationFn: async (data: CreateGoalData) => {
      if (!user) throw new Error("Usuário não autenticado");
      
      const { data: result, error } = await supabase
        .from("goals")
        .insert({
          user_id: user.id,
          name: data.name,
          type: data.type,
          target_amount: data.target_amount,
          reference_month: data.reference_month || null,
          current_amount: 0,
        })
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      toast.success("Meta criada com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar meta: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: UpdateGoalData) => {
      const updateData: Record<string, any> = {};
      if (data.current_amount !== undefined) updateData.current_amount = data.current_amount;
      if (data.name !== undefined) updateData.name = data.name;
      if (data.target_amount !== undefined) updateData.target_amount = data.target_amount;
      
      const { data: result, error } = await supabase
        .from("goals")
        .update(updateData)
        .eq("id", data.id)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar meta: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("goals")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      toast.success("Meta excluída!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir: ${error.message}`);
    },
  });

  return {
    goals: goalsWithCalculatedAmount,
    isLoading: goalsQuery.isLoading || transactionsQuery.isLoading,
    error: goalsQuery.error || transactionsQuery.error,
    createGoal: createMutation.mutateAsync,
    updateGoal: updateMutation.mutateAsync,
    deleteGoal: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
  };
}
