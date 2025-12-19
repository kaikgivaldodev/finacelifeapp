/**
 * Página de Agenda/Calendário Mensal de Contas Fixas
 * Visualização organizada por data com filtros e resumos
 */
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { 
  Calendar as CalendarIcon,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Wallet,
  Tag,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, addMonths, subMonths, parseISO, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BillInstance } from "@/hooks/useFixedBills";

const categories = [
  "Todos",
  "Moradia",
  "Contas da casa",
  "Transporte",
  "Assinaturas",
  "Saúde",
  "Educação",
  "Outros",
];

const statusOptions = [
  { value: "all", label: "Todos os status" },
  { value: "pending", label: "Pendentes" },
  { value: "paid", label: "Pagas" },
  { value: "overdue", label: "Vencidas" },
];

export default function AgendaContas() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Todos");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editingInstance, setEditingInstance] = useState<BillInstance | null>(null);
  const [editAmount, setEditAmount] = useState("");

  const monthStart = startOfMonth(selectedMonth);
  const monthEnd = endOfMonth(selectedMonth);
  
  // Fetch instances for the selected month
  const { data: instances = [], isLoading } = useQuery({
    queryKey: ["agenda_bills_instances", user?.id, format(monthStart, "yyyy-MM-dd")],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from("bills_instances")
        .select(`
          *,
          fixed_bills:fixed_bill_id (
            name,
            description,
            category,
            due_day
          )
        `)
        .eq("user_id", user.id)
        .gte("due_date", format(monthStart, "yyyy-MM-dd"))
        .lte("due_date", format(monthEnd, "yyyy-MM-dd"))
        .order("due_date", { ascending: true });
      
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user,
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
      queryClient.invalidateQueries({ queryKey: ["agenda_bills_instances"] });
      toast.success("Conta marcada como paga!");
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const updateAmountMutation = useMutation({
    mutationFn: async ({ id, amount }: { id: string; amount: number }) => {
      const { error } = await supabase
        .from("bills_instances")
        .update({ amount })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agenda_bills_instances"] });
      toast.success("Valor atualizado!");
      setEditingInstance(null);
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const handlePrevMonth = () => setSelectedMonth(subMonths(selectedMonth, 1));
  const handleNextMonth = () => setSelectedMonth(addMonths(selectedMonth, 1));
  const handleToday = () => setSelectedMonth(new Date());

  const handleMarkAsPaid = async (instanceId: string) => {
    await markAsPaidMutation.mutateAsync(instanceId);
  };

  const handleUpdateAmount = async () => {
    if (!editingInstance) return;
    const amount = parseFloat(editAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Valor inválido");
      return;
    }
    await updateAmountMutation.mutateAsync({ id: editingInstance.id, amount });
  };

  // Filter instances
  const filteredInstances = useMemo(() => {
    let filtered = instances;
    
    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(i => 
        i.fixed_bills?.name?.toLowerCase().includes(search) ||
        i.fixed_bills?.description?.toLowerCase().includes(search)
      );
    }
    
    // Category filter
    if (categoryFilter !== "Todos") {
      filtered = filtered.filter(i => i.fixed_bills?.category === categoryFilter);
    }
    
    // Status filter
    if (statusFilter !== "all") {
      if (statusFilter === "overdue") {
        filtered = filtered.filter(i => {
          const dueDate = parseISO(i.due_date);
          return i.status === "pending" && dueDate < new Date();
        });
      } else {
        filtered = filtered.filter(i => i.status === statusFilter);
      }
    }
    
    return filtered;
  }, [instances, searchTerm, categoryFilter, statusFilter]);

  // Group by date
  const groupedByDate = useMemo(() => {
    const groups = new Map<string, typeof filteredInstances>();
    
    filteredInstances.forEach(instance => {
      const dateKey = instance.due_date;
      if (!groups.has(dateKey)) {
        groups.set(dateKey, []);
      }
      groups.get(dateKey)!.push(instance);
    });
    
    return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredInstances]);

  // Calculate totals
  const totalAmount = filteredInstances.reduce((sum, i) => sum + i.amount, 0);
  const paidAmount = filteredInstances.filter(i => i.status === "paid").reduce((sum, i) => sum + i.amount, 0);
  const pendingAmount = totalAmount - paidAmount;
  const pendingCount = filteredInstances.filter(i => i.status === "pending").length;
  const paidCount = filteredInstances.filter(i => i.status === "paid").length;
  const overdueCount = filteredInstances.filter(i => {
    const dueDate = parseISO(i.due_date);
    return i.status === "pending" && dueDate < new Date();
  }).length;

  const getStatusBadge = (instance: any) => {
    const dueDate = parseISO(instance.due_date);
    const today = new Date();
    
    if (instance.status === "paid") {
      return (
        <Badge className="bg-success/10 text-success hover:bg-success/20 gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Paga
        </Badge>
      );
    }

    if (dueDate < today) {
      return (
        <Badge className="bg-destructive/10 text-destructive hover:bg-destructive/20 gap-1 animate-pulse">
          <AlertCircle className="h-3 w-3" />
          Vencida
        </Badge>
      );
    }

    if (isSameDay(dueDate, today)) {
      return (
        <Badge className="bg-warning/10 text-warning hover:bg-warning/20 gap-1 animate-pulse">
          <Clock className="h-3 w-3" />
          Hoje
        </Badge>
      );
    }

    return (
      <Badge className="bg-muted text-muted-foreground hover:bg-muted/80 gap-1">
        <Clock className="h-3 w-3" />
        Pendente
      </Badge>
    );
  };

  const getCategoryIcon = (category: string): string => {
    const icons: Record<string, string> = {
      "Moradia": "🏠",
      "Contas da casa": "💡",
      "Transporte": "🚗",
      "Assinaturas": "📺",
      "Saúde": "💊",
      "Educação": "📚",
      "Outros": "📋",
    };
    return icons[category] || "📋";
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">
              Agenda de Contas Fixas
            </h1>
            <p className="text-sm text-muted-foreground">
              Calendário mensal com todas as suas contas organizadas por data
            </p>
          </div>
        </div>

        {/* Month Navigation */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handlePrevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2 min-w-[200px] justify-center">
              <CalendarIcon className="h-4 w-4 text-primary" />
              <span className="font-display text-lg font-semibold text-foreground">
                {format(selectedMonth, "MMMM 'de' yyyy", { locale: ptBR }).replace(/^\w/, (c) => c.toUpperCase())}
              </span>
            </div>
            <Button variant="outline" size="icon" onClick={handleNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="outline" onClick={handleToday}>
            Mês Atual
          </Button>
        </div>

        {/* Summary Card */}
        <div className="rounded-xl border border-primary/20 bg-gradient-card p-6">
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-gold shadow-glow">
                <Wallet className="h-7 w-7 text-primary-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Total do mês</p>
                <p className="font-display text-3xl font-bold text-foreground">
                  {formatCurrency(totalAmount)}
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground mb-1">Pago</p>
                <p className="font-display text-xl font-bold text-success">
                  {formatCurrency(paidAmount)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{paidCount} contas</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground mb-1">Pendente</p>
                <p className="font-display text-xl font-bold text-foreground">
                  {formatCurrency(pendingAmount)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{pendingCount} contas</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground mb-1">Vencidas</p>
                <p className="font-display text-xl font-bold text-destructive">
                  {overdueCount}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {overdueCount === 1 ? "conta" : "contas"}
                </p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground mb-1">Total</p>
                <p className="font-display text-xl font-bold text-foreground">
                  {filteredInstances.length}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {filteredInstances.length === 1 ? "conta" : "contas"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar conta..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {/* Category Filter */}
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <Tag className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              {categories.map(cat => (
                <SelectItem key={cat} value={cat}>
                  {cat !== "Todos" && getCategoryIcon(cat)} {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Loading */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredInstances.length === 0 ? (
          <EmptyState
            icon={CalendarIcon}
            title="Nenhuma conta encontrada"
            description="Não há contas fixas neste mês com os filtros aplicados."
            className="min-h-[300px]"
          />
        ) : (
          <div className="space-y-4">
            {groupedByDate.map(([dateKey, dayInstances]) => {
              const date = parseISO(dateKey);
              const dayTotal = dayInstances.reduce((sum, i) => sum + i.amount, 0);
              const isToday = isSameDay(date, new Date());
              
              return (
                <div 
                  key={dateKey}
                  className={cn(
                    "rounded-xl border bg-card overflow-hidden",
                    isToday ? "border-primary/40 shadow-lg" : "border-border"
                  )}
                >
                  {/* Date Header */}
                  <div className={cn(
                    "flex items-center justify-between p-4 border-b",
                    isToday ? "bg-primary/5 border-primary/20" : "bg-muted/30 border-border"
                  )}>
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "flex h-12 w-12 flex-col items-center justify-center rounded-lg",
                        isToday ? "bg-gradient-gold shadow-glow" : "bg-muted"
                      )}>
                        <span className={cn(
                          "text-xs font-medium",
                          isToday ? "text-primary-foreground" : "text-muted-foreground"
                        )}>
                          {format(date, "EEE", { locale: ptBR }).toUpperCase()}
                        </span>
                        <span className={cn(
                          "text-xl font-bold",
                          isToday ? "text-primary-foreground" : "text-foreground"
                        )}>
                          {format(date, "dd")}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {format(date, "EEEE, d 'de' MMMM", { locale: ptBR }).replace(/^\w/, (c) => c.toUpperCase())}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {dayInstances.length} {dayInstances.length === 1 ? "conta" : "contas"}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-display text-lg font-bold text-foreground">
                        {formatCurrency(dayTotal)}
                      </p>
                    </div>
                  </div>
                  
                  {/* Bills List */}
                  <div className="divide-y divide-border">
                    {dayInstances.map((instance, index) => (
                      <div 
                        key={instance.id}
                        className="flex items-center justify-between p-4 hover:bg-muted/20 transition-colors animate-fade-in"
                        style={{ animationDelay: `${index * 30}ms` }}
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-lg">
                            {getCategoryIcon(instance.fixed_bills?.category || "Outros")}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-foreground">
                              {instance.fixed_bills?.name}
                            </p>
                            {instance.fixed_bills?.description && (
                              <p className="text-xs text-muted-foreground">
                                {instance.fixed_bills.description}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="secondary" className="text-xs">
                                {instance.fixed_bills?.category}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="font-display text-lg font-bold text-foreground">
                              {formatCurrency(instance.amount)}
                            </p>
                            <button
                              onClick={() => {
                                setEditingInstance(instance);
                                setEditAmount(instance.amount.toString());
                              }}
                              className="text-xs text-primary hover:underline"
                            >
                              Editar valor
                            </button>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {getStatusBadge(instance)}
                            {instance.status !== "paid" && (
                              <Button
                                size="sm"
                                onClick={() => handleMarkAsPaid(instance.id)}
                                disabled={markAsPaidMutation.isPending}
                              >
                                {markAsPaidMutation.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Edit Amount Dialog */}
        <Dialog open={!!editingInstance} onOpenChange={(open) => !open && setEditingInstance(null)}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="font-display">Editar Valor</DialogTitle>
              <DialogDescription>
                Altere o valor desta instância específica
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-amount">Novo Valor (R$)</Label>
                <Input
                  id="edit-amount"
                  type="number"
                  step="0.01"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  placeholder="0,00"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingInstance(null)}>
                Cancelar
              </Button>
              <Button onClick={handleUpdateAmount} disabled={updateAmountMutation.isPending}>
                {updateAmountMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}