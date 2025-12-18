/**
 * Página de Metas
 * Gerenciamento de metas financeiras (gastos e economia)
 */
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/ui/empty-state";
import { DatePicker } from "@/components/ui/date-picker";
import { formatCurrency, formatPercentage, formatMonthYear } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { 
  Plus, 
  Target,
  TrendingUp,
  Wallet,
  Trash2,
  MoreHorizontal,
  CheckCircle2,
  Loader2,
  Pencil
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { useState } from "react";
import { useGoals, CreateGoalData, UpdateGoalData, GoalWithCalculatedAmount } from "@/hooks/useGoals";
import { format, startOfMonth } from "date-fns";
import { z } from "zod";
import { toast } from "sonner";

// Schema de validação
const goalSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  type: z.enum(["monthly_spending", "saving_goal"]),
  target_amount: z.number().positive("Valor deve ser maior que zero"),
  reference_month: z.date().optional(),
});

export default function Metas() {
  const { goals, isLoading, createGoal, updateGoal, deleteGoal, isCreating, isUpdating } = useGoals();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDepositDialogOpen, setIsDepositDialogOpen] = useState(false);
  const [selectedGoalForDeposit, setSelectedGoalForDeposit] = useState<{ id: string; name: string; current_amount: number } | null>(null);
  const [depositAmount, setDepositAmount] = useState("");
  const [editingGoal, setEditingGoal] = useState<GoalWithCalculatedAmount | null>(null);
  const [filterType, setFilterType] = useState<"all" | "monthly_spending" | "saving_goal">("all");

  const [formData, setFormData] = useState({
    name: "",
    type: "monthly_spending" as "monthly_spending" | "saving_goal",
    targetAmount: "",
    referenceMonth: startOfMonth(new Date()),
  });

  const hasData = goals.length > 0;
  const spendingGoals = goals.filter(g => g.type === "monthly_spending");
  const savingGoals = goals.filter(g => g.type === "saving_goal");
  const totalSaved = savingGoals.reduce((sum, g) => sum + g.current_amount, 0);
  const completedGoals = goals.filter(g => g.current_amount >= g.target_amount);

  // Metas filtradas baseado no filtro selecionado
  const filteredSpendingGoals = filterType === "saving_goal" ? [] : spendingGoals;
  const filteredSavingGoals = filterType === "monthly_spending" ? [] : savingGoals;

  const resetForm = () => {
    setFormData({
      name: "",
      type: "monthly_spending",
      targetAmount: "",
      referenceMonth: startOfMonth(new Date()),
    });
    setEditingGoal(null);
  };

  const openEditDialog = (goal: GoalWithCalculatedAmount) => {
    setEditingGoal(goal);
    setFormData({
      name: goal.name,
      type: goal.type,
      targetAmount: goal.target_amount.toString(),
      referenceMonth: goal.reference_month ? new Date(goal.reference_month) : startOfMonth(new Date()),
    });
    setIsDialogOpen(true);
  };

  const openDepositDialog = (goal: { id: string; name: string; current_amount: number }) => {
    setSelectedGoalForDeposit(goal);
    setDepositAmount("");
    setIsDepositDialogOpen(true);
  };

  const handleDeposit = async () => {
    if (!selectedGoalForDeposit) return;
    
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Informe um valor válido");
      return;
    }

    try {
      await updateGoal({
        id: selectedGoalForDeposit.id,
        current_amount: selectedGoalForDeposit.current_amount + amount,
      });
      toast.success(`Depósito de ${formatCurrency(amount)} realizado!`);
      setIsDepositDialogOpen(false);
      setSelectedGoalForDeposit(null);
      setDepositAmount("");
    } catch (error) {
      // Error handled by hook
    }
  };

  const handleSubmit = async () => {
    const amount = parseFloat(formData.targetAmount);
    
    const validation = goalSchema.safeParse({
      name: formData.name,
      type: formData.type,
      target_amount: isNaN(amount) ? 0 : amount,
      reference_month: formData.referenceMonth,
    });

    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    try {
      if (editingGoal) {
        await updateGoal({
          id: editingGoal.id,
          name: formData.name,
          target_amount: amount,
        });
        toast.success("Meta atualizada!");
      } else {
        const data: CreateGoalData = {
          name: formData.name,
          type: formData.type,
          target_amount: amount,
          reference_month: format(formData.referenceMonth, "yyyy-MM-dd"),
        };
        await createGoal(data);
      }
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      // Error handled by hook
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir esta meta?")) {
      await deleteGoal(id);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">
              Metas
            </h1>
            <p className="text-sm text-muted-foreground">
              Acompanhe seus objetivos financeiros
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nova Meta
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle className="font-display">
                  {editingGoal ? "Editar Meta" : "Nova Meta"}
                </DialogTitle>
                <DialogDescription>
                  {editingGoal ? "Atualize os dados da meta" : "Defina um novo objetivo financeiro"}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                {/* Tipo - apenas para criação */}
                {!editingGoal && (
                  <div className="grid grid-cols-2 gap-4">
                    <Button
                      type="button"
                      variant={formData.type === "monthly_spending" ? "default" : "outline"}
                      onClick={() => setFormData({ ...formData, type: "monthly_spending" })}
                      className="w-full"
                    >
                      <TrendingUp className="mr-2 h-4 w-4" />
                      Limite de gasto
                    </Button>
                    <Button
                      type="button"
                      variant={formData.type === "saving_goal" ? "success" : "outline"}
                      onClick={() => setFormData({ ...formData, type: "saving_goal" })}
                      className="w-full"
                    >
                      <Target className="mr-2 h-4 w-4" />
                      Economia
                    </Button>
                  </div>
                )}

                {/* Nome */}
                <div className="grid gap-2">
                  <Label>Nome da meta *</Label>
                  <Input
                    placeholder="Ex: Gastar no máximo R$ 2.000"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                {/* Valor alvo */}
                <div className="grid gap-2">
                  <Label>Valor alvo (R$) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    value={formData.targetAmount}
                    onChange={(e) => setFormData({ ...formData, targetAmount: e.target.value })}
                  />
                </div>

                {/* Mês de referência - apenas para criação */}
                {!editingGoal && (
                  <div className="grid gap-2">
                    <Label>Mês de referência</Label>
                    <DatePicker
                      value={formData.referenceMonth}
                      onChange={(date) => setFormData({ ...formData, referenceMonth: date || new Date() })}
                      placeholder="Selecione o mês"
                    />
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSubmit} disabled={isCreating || isUpdating}>
                  {(isCreating || isUpdating) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingGoal ? "Salvar" : "Criar Meta"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Loading */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !hasData ? (
          <EmptyState
            icon={Target}
            title="Nenhuma meta definida"
            description="Defina metas de gastos mensais ou de economia para acompanhar seu progresso financeiro e alcançar seus objetivos."
            actionLabel="Criar meta"
            onAction={() => setIsDialogOpen(true)}
            className="min-h-[400px]"
          />
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <Target className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Metas ativas</p>
                    <p className="font-display text-2xl font-bold text-foreground">
                      {goals.length}
                    </p>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-success/10">
                    <Wallet className="h-6 w-6 text-success" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total economizado</p>
                    <p className="font-display text-2xl font-bold text-success">
                      {formatCurrency(totalSaved)}
                    </p>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                    <CheckCircle2 className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Metas concluídas</p>
                    <p className="font-display text-2xl font-bold text-foreground">
                      {completedGoals.length}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant={filterType === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterType("all")}
              >
                Todas ({goals.length})
              </Button>
              <Button
                variant={filterType === "monthly_spending" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterType("monthly_spending")}
              >
                <TrendingUp className="mr-2 h-4 w-4" />
                Limite de gasto ({spendingGoals.length})
              </Button>
              <Button
                variant={filterType === "saving_goal" ? "success" : "outline"}
                size="sm"
                onClick={() => setFilterType("saving_goal")}
              >
                <Target className="mr-2 h-4 w-4" />
                Economia ({savingGoals.length})
              </Button>
            </div>

            {/* Spending Goals */}
            {filteredSpendingGoals.length > 0 && (
              <div className="rounded-xl border border-border bg-card">
                <div className="border-b border-border p-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-warning" />
                    <h3 className="font-display font-semibold text-foreground">Metas de Gasto</h3>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Controle seus limites de gastos mensais
                  </p>
                </div>
                <div className="divide-y divide-border">
                  {filteredSpendingGoals.map((goal, index) => {
                    const progress = Math.min((goal.current_amount / goal.target_amount) * 100, 100);
                    const isOverBudget = goal.current_amount > goal.target_amount;
                    
                    return (
                      <div 
                        key={goal.id} 
                        className="p-4 animate-fade-in"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-foreground">{goal.name}</p>
                              {isOverBudget && (
                                <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                                  Excedido
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {goal.reference_month ? formatMonthYear(goal.reference_month) : formatMonthYear(new Date())}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className={cn(
                              "font-semibold",
                              isOverBudget ? "text-destructive" : "text-foreground"
                            )}>
                              {formatCurrency(goal.current_amount)}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              de {formatCurrency(goal.target_amount)}
                            </p>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="ml-2 h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditDialog(goal)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(goal.id)}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <div className="mt-3 space-y-1">
                          <Progress 
                            value={progress} 
                            className={cn(
                              "h-2",
                              isOverBudget && "[&>div]:bg-destructive"
                            )}
                          />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{formatPercentage(progress)}</span>
                            <span>
                              {isOverBudget 
                                ? `Excedido em ${formatCurrency(goal.current_amount - goal.target_amount)}`
                                : `Restam ${formatCurrency(goal.target_amount - goal.current_amount)}`
                              }
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Saving Goals */}
            {filteredSavingGoals.length > 0 && (
              <div className="rounded-xl border border-border bg-card">
                <div className="border-b border-border p-4">
                  <div className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-success" />
                    <h3 className="font-display font-semibold text-foreground">Metas de Economia</h3>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Acompanhe suas reservas e objetivos
                  </p>
                </div>
                <div className="grid gap-4 p-4 sm:grid-cols-2">
                  {filteredSavingGoals.map((goal, index) => {
                    const progress = Math.min((goal.current_amount / goal.target_amount) * 100, 100);
                    const isCompleted = goal.current_amount >= goal.target_amount;
                    
                    return (
                      <div 
                        key={goal.id}
                        className={cn(
                          "rounded-lg border border-border bg-background p-4 transition-all duration-200 hover:shadow-md animate-fade-in",
                          isCompleted && "border-success/30 bg-success/5"
                        )}
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "flex h-10 w-10 items-center justify-center rounded-lg",
                              isCompleted ? "bg-success/10" : "bg-primary/10"
                            )}>
                              {isCompleted ? (
                                <CheckCircle2 className="h-5 w-5 text-success" />
                              ) : (
                                <Target className="h-5 w-5 text-primary" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-foreground">{goal.name}</p>
                              {goal.reference_month && (
                                <p className="text-xs text-muted-foreground">
                                  Prazo: {formatMonthYear(goal.reference_month)}
                                </p>
                              )}
                            </div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditDialog(goal)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                              {!isCompleted && (
                                <DropdownMenuItem onClick={() => openDepositDialog({ id: goal.id, name: goal.name, current_amount: goal.current_amount })}>
                                  <Wallet className="mr-2 h-4 w-4" />
                                  Depositar
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(goal.id)}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <div className="mt-4 space-y-2">
                          <div className="flex justify-between">
                            <span className={cn(
                              "text-lg font-semibold",
                              isCompleted ? "text-success" : "text-foreground"
                            )}>
                              {formatCurrency(goal.current_amount)}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {formatCurrency(goal.target_amount)}
                            </span>
                          </div>
                          <Progress 
                            value={progress} 
                            className={cn(
                              "h-2",
                              isCompleted && "[&>div]:bg-success"
                            )}
                          />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{formatPercentage(progress)}</span>
                            {isCompleted ? (
                              <span className="text-success">Meta atingida!</span>
                            ) : (
                              <span>Faltam {formatCurrency(goal.target_amount - goal.current_amount)}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* Deposit Dialog */}
        <Dialog open={isDepositDialogOpen} onOpenChange={setIsDepositDialogOpen}>
          <DialogContent className="sm:max-w-[350px]">
            <DialogHeader>
              <DialogTitle className="font-display">Depositar</DialogTitle>
              <DialogDescription>
                Adicione um valor à meta "{selectedGoalForDeposit?.name}"
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Valor (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  autoFocus
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDepositDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleDeposit} disabled={isUpdating}>
                {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Depositar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
