import { MainLayout } from "@/components/layout/MainLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { FinanceCharts } from "@/components/dashboard/FinanceCharts";
import { GoalProgress } from "@/components/dashboard/GoalProgress";
import { formatCurrency, formatMonthYear } from "@/lib/formatters";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  Target,
  Calendar,
  BarChart3
} from "lucide-react";
import { useState } from "react";

// Mock data
const mockBarData = [
  { name: "Dia 1-7", receitas: 2500, despesas: 1800 },
  { name: "Dia 8-14", receitas: 1200, despesas: 2100 },
  { name: "Dia 15-21", receitas: 3800, despesas: 2400 },
  { name: "Dia 22-28", receitas: 1500, despesas: 1900 },
];

const mockPieData = [
  { name: "Moradia", value: 1800, color: "hsl(var(--chart-1))" },
  { name: "Alimentação", value: 1200, color: "hsl(var(--chart-2))" },
  { name: "Transporte", value: 600, color: "hsl(var(--chart-3))" },
  { name: "Lazer", value: 400, color: "hsl(var(--chart-4))" },
  { name: "Outros", value: 300, color: "hsl(var(--chart-5))" },
];

const mockGoals = [
  { id: "1", name: "Limite mensal", targetAmount: 5000, currentAmount: 4300, type: "spending" as const },
  { id: "2", name: "Reserva de emergência", targetAmount: 10000, currentAmount: 6500, type: "saving" as const },
];

export default function Relatorios() {
  const [period, setPeriod] = useState("30");

  // Calculate totals from mock data
  const totalIncome = 9000;
  const totalExpenses = 8200;
  const balance = totalIncome - totalExpenses;

  const periodLabel = {
    "7": "últimos 7 dias",
    "14": "últimos 14 dias",
    "30": "últimos 30 dias",
    "90": "últimos 90 dias",
  }[period] || "período selecionado";

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">
              Relatórios
            </h1>
            <p className="text-sm text-muted-foreground">
              Análise detalhada das suas finanças
            </p>
          </div>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="14">Últimos 14 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Period Summary */}
        <div className="rounded-xl border border-primary/20 bg-gradient-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <BarChart3 className="h-5 w-5 text-primary" />
            <h2 className="font-display text-lg font-semibold text-foreground">
              Resumo dos {periodLabel}
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg bg-background/50 p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <TrendingUp className="h-4 w-4 text-success" />
                Receitas
              </div>
              <p className="mt-1 font-display text-2xl font-bold text-success">
                {formatCurrency(totalIncome)}
              </p>
            </div>
            <div className="rounded-lg bg-background/50 p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <TrendingDown className="h-4 w-4 text-destructive" />
                Despesas
              </div>
              <p className="mt-1 font-display text-2xl font-bold text-destructive">
                {formatCurrency(totalExpenses)}
              </p>
            </div>
            <div className="rounded-lg bg-background/50 p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Wallet className="h-4 w-4 text-primary" />
                Saldo
              </div>
              <p className={`mt-1 font-display text-2xl font-bold ${balance >= 0 ? 'text-success' : 'text-destructive'}`}>
                {formatCurrency(balance)}
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 stagger-children">
          <StatCard
            title="Média diária de gastos"
            value={formatCurrency(totalExpenses / 30)}
            subtitle="baseado no período"
            icon={TrendingDown}
            variant="default"
          />
          <StatCard
            title="Maior despesa"
            value={formatCurrency(1500)}
            subtitle="Aluguel"
            icon={Wallet}
            variant="danger"
          />
          <StatCard
            title="Economia do período"
            value={formatCurrency(balance)}
            subtitle={balance >= 0 ? "Parabéns!" : "Atenção ao orçamento"}
            icon={Target}
            variant={balance >= 0 ? "success" : "danger"}
          />
          <StatCard
            title="Meta de gastos"
            value="86%"
            subtitle={`${formatCurrency(4300)} de ${formatCurrency(5000)}`}
            icon={Target}
            variant="warning"
          />
        </div>

        {/* Charts */}
        <FinanceCharts barData={mockBarData} pieData={mockPieData} />

        {/* Goals Progress */}
        <div className="grid gap-6 lg:grid-cols-2">
          <GoalProgress goals={mockGoals} />
          
          {/* Top Categories */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="mb-4 font-display text-lg font-semibold text-foreground">
              Top Categorias de Gastos
            </h3>
            <div className="space-y-4">
              {mockPieData.map((item, index) => (
                <div key={item.name} className="flex items-center gap-3 animate-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg text-lg" style={{ backgroundColor: `${item.color}20` }}>
                    {getCategoryIcon(item.name)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-foreground">{item.name}</p>
                      <p className="text-sm font-semibold text-foreground">{formatCurrency(item.value)}</p>
                    </div>
                    <div className="mt-1 h-1.5 w-full rounded-full bg-muted">
                      <div 
                        className="h-full rounded-full transition-all duration-500"
                        style={{ 
                          width: `${(item.value / mockPieData.reduce((s, i) => s + i.value, 0)) * 100}%`,
                          backgroundColor: item.color
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    "Moradia": "🏠",
    "Alimentação": "🍽️",
    "Transporte": "🚗",
    "Lazer": "🎮",
    "Outros": "📋",
  };
  return icons[category] || "📋";
}
