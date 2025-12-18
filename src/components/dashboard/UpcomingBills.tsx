import { cn } from "@/lib/utils";
import { formatCurrency, formatRelativeDate, formatShortDate } from "@/lib/formatters";
import { Calendar, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BillItem {
  id: string;
  name: string;
  amount: number;
  dueDate: Date;
  category: string;
  status: "pending" | "paid" | "overdue";
}

interface UpcomingBillsProps {
  bills: BillItem[];
  onPayBill?: (id: string) => void;
  className?: string;
}

export function UpcomingBills({ bills, onPayBill, className }: UpcomingBillsProps) {
  const getStatusBadge = (status: BillItem["status"], dueDate: Date) => {
    const relative = formatRelativeDate(dueDate);
    
    if (status === "paid") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
          <CheckCircle2 className="h-3 w-3" />
          Paga
        </span>
      );
    }

    if (relative.status === "overdue" || status === "overdue") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
          <AlertCircle className="h-3 w-3" />
          {relative.text}
        </span>
      );
    }

    if (relative.status === "today") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning animate-pulse">
          <Clock className="h-3 w-3" />
          {relative.text}
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
        <Calendar className="h-3 w-3" />
        {relative.text}
      </span>
    );
  };

  return (
    <div className={cn("rounded-xl border border-border bg-card p-5", className)}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-lg font-semibold text-foreground">
          Próximas Contas
        </h3>
        <Button variant="ghost" size="sm" className="text-xs">
          Ver todas
        </Button>
      </div>

      <div className="space-y-3">
        {bills.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nenhuma conta pendente
          </p>
        ) : (
          bills.map((bill, index) => (
            <div
              key={bill.id}
              className={cn(
                "flex items-center justify-between rounded-lg border border-border/50 bg-background/50 p-3 transition-all duration-200 hover:bg-background",
                "animate-fade-in"
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <span className="text-lg">{getCategoryIcon(bill.category)}</span>
                </div>
                <div>
                  <p className="font-medium text-foreground">{bill.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatShortDate(bill.dueDate)} · {bill.category}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="font-semibold text-foreground">{formatCurrency(bill.amount)}</p>
                  {getStatusBadge(bill.status, bill.dueDate)}
                </div>
                {bill.status !== "paid" && onPayBill && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPayBill(bill.id)}
                    className="shrink-0"
                  >
                    Pagar
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    "Moradia": "🏠",
    "Contas da casa": "💡",
    "Transporte": "🚗",
    "Assinaturas": "📺",
    "Saúde": "💊",
    "Educação": "📚",
    "Alimentação": "🍽️",
    "Lazer": "🎮",
    default: "📋",
  };
  return icons[category] || icons.default;
}
