/**
 * Hook para gerenciar contas fixas
 * CRUD completo com Supabase + criação de instâncias mensais
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";
import { startOfMonth, setDate } from "date-fns";
import { toYYYYMMDD } from "@/lib/formatters";

export interface FixedBill {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  amount: number;
  category: string;
  due_day: number;
  billing_type: string;
  payment_account_id: string | null;
  auto_generate: boolean;
  is_active: boolean;
  start_date: string;
  end_date: string | null;
  frequency: string;
  created_at: string;
  updated_at: string;
}

export interface BillInstance {
  id: string;
  user_id: string;
  fixed_bill_id: string;
  reference_month: string;
  due_date: string;
  amount: number;
  status: "pending" | "paid" | "overdue";
  paid_at: string | null;
  payment_transaction_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateFixedBillData {
  name: string;
  description?: string;
  amount: number;
  category: string;
  due_day: number;
  start_date: string; // YYYY-MM-DD
  end_date?: string; // YYYY-MM-DD
  auto_generate?: boolean;
}

export interface UpdateFixedBillData extends Partial<CreateFixedBillData> {
  id: string;
}

export function useFixedBills() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const billsQuery = useQuery({
    queryKey: ["fixed_bills", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("fixed_bills")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("due_day");
      
      if (error) throw error;
      return data as FixedBill[];
    },
    enabled: !!user,
  });

  const instancesQuery = useQuery({
    queryKey: ["bills_instances", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const currentMonth = toYYYYMMDD(startOfMonth(new Date()));
      
      const { data, error } = await supabase
        .from("bills_instances")
        .select("*")
        .eq("user_id", user.id)
        .eq("reference_month", currentMonth)
        .order("due_date");
      
      if (error) throw error;
      return data as BillInstance[];
    },
    enabled: !!user,
  });


  const generateBillInstancesMutation = useMutation({
    mutationFn: async ({ billId, months = 12 }: { billId: string; months?: number }) => {
      const { error } = await supabase.rpc("generate_bill_instances", {
        p_fixed_bill_id: billId,
        p_months: months,
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bills_instances"] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao gerar instâncias: ${error.message}`);
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateFixedBillData) => {
      if (!user) throw new Error("Usuário não autenticado");
      
      // Criar conta fixa
      const { data: bill, error: billError } = await supabase
        .from("fixed_bills")
        .insert({
          user_id: user.id,
          name: data.name,
          description: data.description || null,
          amount: data.amount,
          category: data.category,
          due_day: data.due_day,
          start_date: data.start_date,
          end_date: data.end_date || null,
          frequency: "monthly",
          auto_generate: data.auto_generate ?? true,
        })
        .select()
        .single();
      
      if (billError) throw billError;
      
      return bill;
    },
    onSuccess: async (bill) => {
      // Generate instances automatically after creating bill
      try {
        await generateBillInstancesMutation.mutateAsync({ billId: bill.id, months: 12 });
        toast.success("Conta fixa cadastrada e próximas 12 faturas geradas!");
      } catch (error) {
        toast.success("Conta fixa cadastrada, mas houve erro ao gerar instâncias");
      }
      
      queryClient.invalidateQueries({ queryKey: ["fixed_bills"] });
      queryClient.invalidateQueries({ queryKey: ["bills_instances"] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao cadastrar: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: UpdateFixedBillData) => {
      const { id, ...updateData } = data;
      
      const { data: result, error } = await supabase
        .from("fixed_bills")
        .update({
          ...updateData,
          description: updateData.description || null,
        })
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;

      // Atualizar a instância do mês atual se houver mudanças no valor ou dia de vencimento
      if (updateData.amount !== undefined || updateData.due_day !== undefined) {
        const currentMonth = startOfMonth(new Date());
        const dueDay = updateData.due_day ?? result.due_day;
        const dueDate = setDate(currentMonth, dueDay);

        await supabase
          .from("bills_instances")
          .update({
            amount: updateData.amount ?? result.amount,
            due_date: toYYYYMMDD(dueDate),
          })
          .eq("fixed_bill_id", id)
          .eq("reference_month", toYYYYMMDD(currentMonth));
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fixed_bills"] });
      queryClient.invalidateQueries({ queryKey: ["bills_instances"] });
      toast.success("Conta fixa atualizada com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar: ${error.message}`);
    },
  });

  const markAsPaidMutation = useMutation({
    mutationFn: async (instanceId: string) => {
      const { error } = await supabase
        .from("bills_instances")
        .update({ 
          status: "paid", 
          paid_at: new Date().toISOString() 
        })
        .eq("id", instanceId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bills_instances"] });
      toast.success("Conta marcada como paga!");
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("fixed_bills")
        .update({ is_active: false })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fixed_bills"] });
      queryClient.invalidateQueries({ queryKey: ["bills_instances"] });
      toast.success("Conta fixa removida!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover: ${error.message}`);
    },
  });

  // Combinar bills com instances para exibição
  const billsWithStatus = billsQuery.data?.map(bill => {
    const instance = instancesQuery.data?.find(i => i.fixed_bill_id === bill.id);
    return {
      ...bill,
      currentMonthStatus: instance?.status ?? "pending",
      currentMonthDueDate: instance?.due_date ? new Date(instance.due_date) : setDate(new Date(), bill.due_day),
      instanceId: instance?.id,
    };
  }) ?? [];

  return {
    bills: billsWithStatus,
    instances: instancesQuery.data ?? [],
    isLoading: billsQuery.isLoading || instancesQuery.isLoading,
    error: billsQuery.error || instancesQuery.error,
    createBill: createMutation.mutateAsync,
    updateBill: updateMutation.mutateAsync,
    markAsPaid: markAsPaidMutation.mutateAsync,
    deleteBill: deleteMutation.mutateAsync,
    generateBillInstances: generateBillInstancesMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isGenerating: generateBillInstancesMutation.isPending,
  };
}
