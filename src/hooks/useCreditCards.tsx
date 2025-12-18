/**
 * Hook para gerenciar cartões de crédito
 * CRUD completo com Supabase
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface CreditCard {
  id: string;
  user_id: string;
  name: string;
  last_digits: string | null;
  limit_amount: number;
  best_purchase_day: number | null;
  due_day: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateCreditCardData {
  name: string;
  last_digits?: string;
  limit_amount: number;
  best_purchase_day?: number;
  due_day: number;
}

export function useCreditCards() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["credit_cards", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("credit_cards")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("name");
      
      if (error) throw error;
      return data as CreditCard[];
    },
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateCreditCardData) => {
      if (!user) throw new Error("Usuário não autenticado");
      
      const { data: result, error } = await supabase
        .from("credit_cards")
        .insert({
          user_id: user.id,
          name: data.name,
          last_digits: data.last_digits || null,
          limit_amount: data.limit_amount,
          best_purchase_day: data.best_purchase_day || null,
          due_day: data.due_day,
        })
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["credit_cards"] });
      toast.success("Cartão cadastrado com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao cadastrar cartão: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("credit_cards")
        .update({ is_active: false })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["credit_cards"] });
      toast.success("Cartão removido!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover: ${error.message}`);
    },
  });

  return {
    cards: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    createCard: createMutation.mutateAsync,
    deleteCard: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
  };
}
