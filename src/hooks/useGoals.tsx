/**
 * Hook para gerenciar metas financeiras
 * CRUD completo com Supabase
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

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

export interface CreateGoalData {
  name: string;
  type: "monthly_spending" | "saving_goal";
  target_amount: number;
  reference_month?: string;
}

export function useGoals() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
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
    goals: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    createGoal: createMutation.mutateAsync,
    deleteGoal: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
  };
}
