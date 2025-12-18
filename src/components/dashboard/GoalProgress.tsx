import { cn } from "@/lib/utils";
import { formatCurrency, formatPercentage } from "@/lib/formatters";
import { Target, TrendingUp } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  type: "spending" | "saving";
}

interface GoalProgressProps {
  goals: Goal[];
  className?: string;
}

export function GoalProgress({ goals, className }: GoalProgressProps) {
  return (
    <div className={cn("rounded-xl border border-border bg-card p-5", className)}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-lg font-semibold text-foreground">
          Progresso das Metas
        </h3>
        <Target className="h-5 w-5 text-primary" />
      </div>

      <div className="space-y-4">
        {goals.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nenhuma meta definida
          </p>
        ) : (
          goals.map((goal) => {
            const progress = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
            const isOverBudget = goal.type === "spending" && goal.currentAmount > goal.targetAmount;
            const isOnTrack = goal.type === "saving" 
              ? goal.currentAmount >= goal.targetAmount 
              : goal.currentAmount <= goal.targetAmount;

            return (
              <div key={goal.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-lg",
                        goal.type === "spending" 
                          ? "bg-warning/10 text-warning"
                          : "bg-success/10 text-success"
                      )}
                    >
                      {goal.type === "spending" ? (
                        <TrendingUp className="h-4 w-4" />
                      ) : (
                        <Target className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{goal.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {goal.type === "spending" ? "Meta de gasto" : "Meta de economia"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn(
                      "text-sm font-semibold",
                      isOverBudget ? "text-destructive" : isOnTrack ? "text-success" : "text-foreground"
                    )}>
                      {formatCurrency(goal.currentAmount)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      de {formatCurrency(goal.targetAmount)}
                    </p>
                  </div>
                </div>
                <div className="space-y-1">
                  <Progress 
                    value={progress} 
                    className={cn(
                      "h-2",
                      isOverBudget && "[&>div]:bg-destructive"
                    )}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{formatPercentage(progress)}</span>
                    {goal.type === "spending" && (
                      <span>
                        {goal.currentAmount <= goal.targetAmount
                          ? `Restam ${formatCurrency(goal.targetAmount - goal.currentAmount)}`
                          : `Excedido em ${formatCurrency(goal.currentAmount - goal.targetAmount)}`}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
