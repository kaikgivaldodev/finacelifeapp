import { MainLayout } from "@/components/layout/MainLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { UpcomingBills } from "@/components/dashboard/UpcomingBills";
import { FinanceCharts } from "@/components/dashboard/FinanceCharts";
import { GoalProgress } from "@/components/dashboard/GoalProgress";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency, formatMonthYear } from "@/lib/formatters";
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  Target,
  Calendar,
  Receipt,
  CreditCard,
  PlusCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

// Empty data - users start with nothing
const bills: any[] = [];
const barData: any[] = [];
const pieData: any[] = [];
const goals: any[] = [];

export default function Dashboard() {
  const [period, setPeriod] = useState("current-month");
  const currentMonth = formatMonthYear(new Date());
  const navigate = useNavigate();

  // Calculate totals - will be 0 for new users
  const totalIncome = 0;
  const totalExpenses = 0;
  const balance = totalIncome - totalExpenses;

  const hasData = barData.length > 0 || bills.length > 0;

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
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[180px]">
                <Calendar className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current-month">Este mês</SelectItem>
                <SelectItem value="last-month">Mês passado</SelectItem>
                <SelectItem value="last-30">Últimos 30 dias</SelectItem>
                <SelectItem value="custom">Personalizado</SelectItem>
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
                title="Saldo do Mês"
                value={formatCurrency(balance)}
                subtitle={balance >= 0 ? "Você está no azul" : "Você está no vermelho"}
                icon={Wallet}
                variant={balance >= 0 ? "gold" : "danger"}
              />
              <StatCard
                title="Receitas"
                value={formatCurrency(totalIncome)}
                icon={TrendingUp}
                variant="success"
              />
              <StatCard
                title="Despesas"
                value={formatCurrency(totalExpenses)}
                icon={TrendingDown}
                variant="danger"
              />
              <StatCard
                title="Meta do Mês"
                value="--"
                subtitle="Defina uma meta"
                icon={Target}
                variant="default"
              />
            </div>

            {/* Charts */}
            <FinanceCharts barData={barData} pieData={pieData} />

            {/* Bottom Section */}
            <div className="grid gap-6 lg:grid-cols-2">
              <UpcomingBills bills={bills} />
              <GoalProgress goals={goals} />
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
}
