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
  AlertTriangle
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

// Mock data - will be replaced with real data from database
const mockBills = [
  { id: "1", name: "Aluguel", amount: 1500, dueDate: new Date(2024, 11, 10), category: "Moradia", status: "pending" as const },
  { id: "2", name: "Conta de Luz", amount: 180, dueDate: new Date(2024, 11, 15), category: "Contas da casa", status: "pending" as const },
  { id: "3", name: "Internet", amount: 120, dueDate: new Date(2024, 11, 20), category: "Contas da casa", status: "pending" as const },
  { id: "4", name: "Netflix", amount: 55.90, dueDate: new Date(2024, 11, 5), category: "Assinaturas", status: "overdue" as const },
  { id: "5", name: "Academia", amount: 89, dueDate: new Date(2024, 11, 25), category: "Saúde", status: "pending" as const },
];

const mockBarData = [
  { name: "Sem 1", receitas: 2500, despesas: 1800 },
  { name: "Sem 2", receitas: 1200, despesas: 2100 },
  { name: "Sem 3", receitas: 3800, despesas: 2400 },
  { name: "Sem 4", receitas: 1500, despesas: 1900 },
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

export default function Dashboard() {
  const [period, setPeriod] = useState("current-month");
  const currentMonth = formatMonthYear(new Date());

  // Calculate totals from mock data
  const totalIncome = 9000;
  const totalExpenses = 8200;
  const balance = totalIncome - totalExpenses;
  const pendingBills = mockBills.filter(b => b.status === "pending" || b.status === "overdue").length;
  const overdueBills = mockBills.filter(b => b.status === "overdue").length;

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
            <Button>
              + Novo Lançamento
            </Button>
          </div>
        </div>

        {/* Alert for overdue bills */}
        {overdueBills > 0 && (
          <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 animate-fade-in">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <div className="flex-1">
              <p className="font-medium text-destructive">
                Você tem {overdueBills} conta{overdueBills > 1 ? "s" : ""} vencida{overdueBills > 1 ? "s" : ""}
              </p>
              <p className="text-sm text-destructive/80">
                Regularize para evitar juros e multas
              </p>
            </div>
            <Button variant="danger" size="sm">
              Ver contas
            </Button>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 stagger-children">
          <StatCard
            title="Saldo do Mês"
            value={formatCurrency(balance)}
            subtitle={balance >= 0 ? "Você está no azul" : "Você está no vermelho"}
            icon={Wallet}
            variant={balance >= 0 ? "gold" : "danger"}
            trend={{ value: 12, isPositive: balance >= 0 }}
          />
          <StatCard
            title="Receitas"
            value={formatCurrency(totalIncome)}
            subtitle={`${mockBarData.length} lançamentos`}
            icon={TrendingUp}
            variant="success"
          />
          <StatCard
            title="Despesas"
            value={formatCurrency(totalExpenses)}
            subtitle={`Incluindo ${pendingBills} contas fixas`}
            icon={TrendingDown}
            variant="danger"
          />
          <StatCard
            title="Meta do Mês"
            value="86%"
            subtitle={`${formatCurrency(4300)} de ${formatCurrency(5000)}`}
            icon={Target}
            variant="warning"
          />
        </div>

        {/* Charts */}
        <FinanceCharts barData={mockBarData} pieData={mockPieData} />

        {/* Bottom Section */}
        <div className="grid gap-6 lg:grid-cols-2">
          <UpcomingBills 
            bills={mockBills} 
            onPayBill={(id) => console.log("Pagar conta:", id)} 
          />
          <GoalProgress goals={mockGoals} />
        </div>
      </div>
    </MainLayout>
  );
}
