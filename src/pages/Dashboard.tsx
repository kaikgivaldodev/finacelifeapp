/**
 * Dashboard - Visão geral das finanças
 * Exibe dados reais do usuário autenticado
 */
import { MainLayout } from "@/components/layout/MainLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { UpcomingBills } from "@/components/dashboard/UpcomingBills";
import { FinanceCharts } from "@/components/dashboard/FinanceCharts";
import { GoalProgress } from "@/components/dashboard/GoalProgress";
import { formatCurrency, formatMonthYear } from "@/lib/formatters";
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  Target,
  Calendar,
  Receipt,
  CreditCard,
  PlusCircle,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTransactions } from "@/hooks/useTransactions";
import { useFixedBills } from "@/hooks/useFixedBills";
import { useGoals } from "@/hooks/useGoals";
import { 
  startOfMonth, 
  endOfMonth, 
  startOfDay, 
  endOfDay, 
  subDays, 
  subMonths,
  isWithinInterval,
  parseISO
} from "date-fns";

type PeriodFilter = "today" | "yesterday" | "last-7" | "last-30" | "current-month" | "last-month";

export default function Dashboard() {
  const [period, setPeriod] = useState<PeriodFilter>("current-month");
  const currentMonth = formatMonthYear(new Date());
  const navigate = useNavigate();

  // Buscar dados reais
  const { transactions, isLoading: isLoadingTransactions } = useTransactions();
  const { bills, instances, isLoading: isLoadingBills } = useFixedBills();
  const { goals, isLoading: isLoadingGoals } = useGoals();

  const isLoading = isLoadingTransactions || isLoadingBills || isLoadingGoals;

  // Calcular intervalo de datas baseado no período selecionado
  const dateRange = useMemo(() => {
    const now = new Date();
    
    switch (period) {
      case "today":
        return { start: startOfDay(now), end: endOfDay(now) };
      case "yesterday":
        const yesterday = subDays(now, 1);
        return { start: startOfDay(yesterday), end: endOfDay(yesterday) };
      case "last-7":
        return { start: startOfDay(subDays(now, 6)), end: endOfDay(now) };
      case "last-30":
        return { start: startOfDay(subDays(now, 29)), end: endOfDay(now) };
      case "current-month":
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case "last-month":
        const lastMonth = subMonths(now, 1);
        return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
      default:
        return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  }, [period]);

  // Filtrar transações pelo período
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const transactionDate = parseISO(t.date);
      return isWithinInterval(transactionDate, { start: dateRange.start, end: dateRange.end });
    });
  }, [transactions, dateRange]);

  // Calcular totais
  const totalIncome = filteredTransactions
    .filter(t => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);
  
  const totalExpenses = filteredTransactions
    .filter(t => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);
  
  const balance = totalIncome - totalExpenses;

  // Custo mensal das contas fixas
  const fixedBillsCost = bills.reduce((sum, b) => sum + b.amount, 0);

  // Dados para gráfico de barras (receitas vs despesas por categoria)
  const barData = useMemo(() => {
    const categoryTotals: Record<string, { receitas: number; despesas: number }> = {};
    
    filteredTransactions.forEach(t => {
      if (!categoryTotals[t.category]) {
        categoryTotals[t.category] = { receitas: 0, despesas: 0 };
      }
      if (t.type === "income") {
        categoryTotals[t.category].receitas += t.amount;
      } else {
        categoryTotals[t.category].despesas += t.amount;
      }
    });

    return Object.entries(categoryTotals).map(([name, values]) => ({
      name,
      receitas: values.receitas,
      despesas: values.despesas,
    }));
  }, [filteredTransactions]);

  // Cores para o gráfico de pizza
  const pieColors = [
    "hsl(40, 95%, 55%)",   // primary/gold
    "hsl(142, 71%, 45%)",  // success
    "hsl(0, 72%, 51%)",    // destructive
    "hsl(217, 91%, 60%)",  // blue
    "hsl(270, 70%, 60%)",  // purple
    "hsl(25, 95%, 53%)",   // warning/orange
    "hsl(180, 60%, 50%)",  // cyan
    "hsl(330, 70%, 55%)",  // pink
  ];

  // Dados para gráfico de pizza (despesas por categoria)
  const pieData = useMemo(() => {
    const categoryTotals: Record<string, number> = {};
    
    filteredTransactions
      .filter(t => t.type === "expense")
      .forEach(t => {
        categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
      });

    return Object.entries(categoryTotals).map(([name, value], index) => ({
      name,
      value,
      color: pieColors[index % pieColors.length],
    }));
  }, [filteredTransactions]);

  // Mapear contas fixas para o componente UpcomingBills
  const upcomingBills = useMemo(() => {
    return bills.map(bill => ({
      id: bill.id,
      name: bill.name,
      amount: bill.amount,
      dueDate: bill.currentMonthDueDate,
      category: bill.category,
      status: bill.currentMonthStatus as "pending" | "paid" | "overdue",
    }));
  }, [bills]);

  // Mapear metas para o componente GoalProgress
  const mappedGoals = useMemo(() => {
    return goals.map(goal => ({
      id: goal.id,
      name: goal.name,
      targetAmount: goal.target_amount,
      currentAmount: goal.current_amount,
      type: goal.type === "monthly_spending" ? "spending" as const : "saving" as const,
    }));
  }, [goals]);

  // Verificar se tem dados
  const hasData = transactions.length > 0 || bills.length > 0 || goals.length > 0;

  // Loading state
  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">
              Dashboard
            </h1>
            <p className="text-sm text-muted-foreground">
              Visão geral das suas finanças em {currentMonth}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={period} onValueChange={(v) => setPeriod(v as PeriodFilter)}>
              <SelectTrigger className="w-[180px]">
                <Calendar className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="yesterday">Ontem</SelectItem>
                <SelectItem value="last-7">Últimos 7 dias</SelectItem>
                <SelectItem value="last-30">Últimos 30 dias</SelectItem>
                <SelectItem value="current-month">Este mês</SelectItem>
                <SelectItem value="last-month">Mês passado</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => navigate("/lancamentos")}>
              + Novo Lançamento
            </Button>
          </div>
        </div>

        {/* Empty State for New Users */}
        {!hasData ? (
          <div className="space-y-6">
            {/* Welcome Card */}
            <div className="rounded-xl border border-primary/20 bg-gradient-card p-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-gold shadow-glow">
                <Wallet className="h-8 w-8 text-primary-foreground" />
              </div>
              <h2 className="font-display text-2xl font-bold text-foreground mb-2">
                Bem-vindo ao Vida Financeira!
              </h2>
              <p className="text-muted-foreground max-w-md mx-auto mb-6">
                Comece a organizar suas finanças pessoais. Cadastre suas contas fixas, 
                receitas e despesas para ter controle total do seu dinheiro.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <Button onClick={() => navigate("/contas-fixas")}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Cadastrar conta fixa
                </Button>
                <Button variant="outline" onClick={() => navigate("/lancamentos")}>
                  <Receipt className="mr-2 h-4 w-4" />
                  Adicionar lançamento
                </Button>
              </div>
            </div>

            {/* Quick Actions Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div 
                className="group cursor-pointer rounded-xl border border-border bg-card p-6 transition-all duration-200 hover:border-primary/50 hover:shadow-md"
                onClick={() => navigate("/contas-fixas")}
              >
                <div className="flex items-center gap-4 mb-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <Wallet className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Contas Fixas</h3>
                    <p className="text-sm text-muted-foreground">Água, luz, aluguel...</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Cadastre suas despesas recorrentes e nunca mais esqueça um vencimento.
                </p>
              </div>

              <div 
                className="group cursor-pointer rounded-xl border border-border bg-card p-6 transition-all duration-200 hover:border-success/50 hover:shadow-md"
                onClick={() => navigate("/lancamentos")}
              >
                <div className="flex items-center gap-4 mb-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-success/10 group-hover:bg-success/20 transition-colors">
                    <TrendingUp className="h-6 w-6 text-success" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Lançamentos</h3>
                    <p className="text-sm text-muted-foreground">Receitas e despesas</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Registre suas entradas e saídas para acompanhar seu saldo.
                </p>
              </div>

              <div 
                className="group cursor-pointer rounded-xl border border-border bg-card p-6 transition-all duration-200 hover:border-warning/50 hover:shadow-md"
                onClick={() => navigate("/cartoes")}
              >
                <div className="flex items-center gap-4 mb-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-warning/10 group-hover:bg-warning/20 transition-colors">
                    <CreditCard className="h-6 w-6 text-warning" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Cartões</h3>
                    <p className="text-sm text-muted-foreground">Crédito e débito</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Gerencie seus cartões e acompanhe suas faturas.
                </p>
              </div>
            </div>

            {/* Empty Stats */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="Saldo do Mês"
                value={formatCurrency(0)}
                subtitle="Nenhum lançamento"
                icon={Wallet}
                variant="default"
              />
              <StatCard
                title="Receitas"
                value={formatCurrency(0)}
                subtitle="Nenhuma receita"
                icon={TrendingUp}
                variant="default"
              />
              <StatCard
                title="Despesas"
                value={formatCurrency(0)}
                subtitle="Nenhuma despesa"
                icon={TrendingDown}
                variant="default"
              />
              <StatCard
                title="Meta do Mês"
                value="--"
                subtitle="Nenhuma meta definida"
                icon={Target}
                variant="default"
              />
            </div>
          </div>
        ) : (
          <>
            {/* Stats Cards - shown when user has data */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 stagger-children">
              <StatCard
                title="Saldo do Período"
                value={formatCurrency(balance)}
                subtitle={balance >= 0 ? "Você está no azul" : "Você está no vermelho"}
                icon={Wallet}
                variant={balance >= 0 ? "gold" : "danger"}
              />
              <StatCard
                title="Receitas"
                value={formatCurrency(totalIncome)}
                subtitle={`${filteredTransactions.filter(t => t.type === "income").length} lançamentos`}
                icon={TrendingUp}
                variant="success"
              />
              <StatCard
                title="Despesas"
                value={formatCurrency(totalExpenses)}
                subtitle={`${filteredTransactions.filter(t => t.type === "expense").length} lançamentos`}
                icon={TrendingDown}
                variant="danger"
              />
              <StatCard
                title="Contas Fixas"
                value={formatCurrency(fixedBillsCost)}
                subtitle={`${bills.length} contas cadastradas`}
                icon={Target}
                variant="warning"
              />
            </div>

            {/* Charts */}
            {(barData.length > 0 || pieData.length > 0) && (
              <FinanceCharts barData={barData} pieData={pieData} />
            )}

            {/* Bottom Section */}
            <div className="grid gap-6 lg:grid-cols-2">
              <UpcomingBills bills={upcomingBills} />
              <GoalProgress goals={mappedGoals} />
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
}
