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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency, formatPercentage, formatMonthYear } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { 
  Plus, 
  Target,
  TrendingUp,
  Wallet,
  Pencil,
  Trash2,
  MoreHorizontal,
  CheckCircle2
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

interface Goal {
  id: string;
  name: string;
  type: "spending" | "saving";
  targetAmount: number;
  currentAmount: number;
  deadline?: Date;
  isCompleted: boolean;
}

// Empty data - users start with nothing
const goals: Goal[] = [];

export default function Metas() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newGoal, setNewGoal] = useState({
    name: "",
    type: "spending",
    targetAmount: "",
    deadline: "",
  });

  const hasData = goals.length > 0;
  const spendingGoals = goals.filter(g => g.type === "spending");
  const savingGoals = goals.filter(g => g.type === "saving");
  const completedGoals = goals.filter(g => g.isCompleted);
  const totalSaved = savingGoals.reduce((sum, g) => sum + g.currentAmount, 0);

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
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nova Meta
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle className="font-display">Nova Meta</DialogTitle>
                <DialogDescription>
                  Defina um novo objetivo financeiro
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    type="button"
                    variant={newGoal.type === "spending" ? "default" : "outline"}
                    onClick={() => setNewGoal({ ...newGoal, type: "spending" })}
                    className="w-full"
                  >
                    <TrendingUp className="mr-2 h-4 w-4" />
                    Limite de gasto
                  </Button>
                  <Button
                    type="button"
                    variant={newGoal.type === "saving" ? "success" : "outline"}
                    onClick={() => setNewGoal({ ...newGoal, type: "saving" })}
                    className="w-full"
                  >
                    <Target className="mr-2 h-4 w-4" />
                    Economia
                  </Button>
                </div>
                <div className="grid gap-2">
                  <Label>Nome da meta</Label>
                  <Input
                    placeholder="Ex: Reserva de emergência"
                    value={newGoal.name}
                    onChange={(e) => setNewGoal({ ...newGoal, name: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Valor alvo (R$)</Label>
                  <Input
                    type="number"
                    placeholder="0,00"
                    value={newGoal.targetAmount}
                    onChange={(e) => setNewGoal({ ...newGoal, targetAmount: e.target.value })}
                  />
                </div>
                {newGoal.type === "saving" && (
                  <div className="grid gap-2">
                    <Label>Prazo (opcional)</Label>
                    <Input
                      type="date"
                      value={newGoal.deadline}
                      onChange={(e) => setNewGoal({ ...newGoal, deadline: e.target.value })}
                    />
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={() => setIsDialogOpen(false)}>
                  Criar Meta
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Empty State */}
        {!hasData ? (
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
                      {goals.filter(g => !g.isCompleted).length}
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

            {/* Spending Goals */}
            {spendingGoals.length > 0 && (
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
                  {spendingGoals.map((goal, index) => {
                    const progress = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
                    const isOverBudget = goal.currentAmount > goal.targetAmount;
                    
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
                              {formatMonthYear(new Date())}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className={cn(
                              "font-semibold",
                              isOverBudget ? "text-destructive" : "text-foreground"
                            )}>
                              {formatCurrency(goal.currentAmount)}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              de {formatCurrency(goal.targetAmount)}
                            </p>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="ml-2 h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Pencil className="mr-2 h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive">
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
                                ? `Excedido em ${formatCurrency(goal.currentAmount - goal.targetAmount)}`
                                : `Restam ${formatCurrency(goal.targetAmount - goal.currentAmount)}`
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
            {savingGoals.length > 0 && (
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
                  {savingGoals.map((goal, index) => {
                    const progress = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
                    
                    return (
                      <div 
                        key={goal.id}
                        className={cn(
                          "rounded-lg border border-border bg-background p-4 transition-all duration-200 hover:shadow-md animate-fade-in",
                          goal.isCompleted && "border-success/30 bg-success/5"
                        )}
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "flex h-10 w-10 items-center justify-center rounded-lg",
                              goal.isCompleted ? "bg-success/10" : "bg-primary/10"
                            )}>
                              {goal.isCompleted ? (
                                <CheckCircle2 className="h-5 w-5 text-success" />
                              ) : (
                                <Target className="h-5 w-5 text-primary" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-foreground">{goal.name}</p>
                              {goal.deadline && (
                                <p className="text-xs text-muted-foreground">
                                  Prazo: {formatMonthYear(goal.deadline)}
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
                              <DropdownMenuItem>
                                <Wallet className="mr-2 h-4 w-4" />
                                Adicionar valor
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Pencil className="mr-2 h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive">
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
                              goal.isCompleted ? "text-success" : "text-foreground"
                            )}>
                              {formatCurrency(goal.currentAmount)}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {formatCurrency(goal.targetAmount)}
                            </span>
                          </div>
                          <Progress 
                            value={progress} 
                            className={cn(
                              "h-2",
                              goal.isCompleted && "[&>div]:bg-success"
                            )}
                          />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{formatPercentage(progress)}</span>
                            {goal.isCompleted ? (
                              <span className="text-success">Meta atingida!</span>
                            ) : (
                              <span>Faltam {formatCurrency(goal.targetAmount - goal.currentAmount)}</span>
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
      </div>
    </MainLayout>
  );
}
