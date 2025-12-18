/**
 * Página de Relatórios
 * Análise detalhada das finanças com gráficos por período, categoria e conta
 */
import { MainLayout } from "@/components/layout/MainLayout";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency, formatMonthYear, formatShortDate } from "@/lib/formatters";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Calendar,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Wallet,
  PieChart as PieChartIcon,
  ArrowUpRight,
  ArrowDownRight,
  Loader2
} from "lucide-react";
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTransactions } from "@/hooks/useTransactions";
import { useAccounts } from "@/hooks/useAccounts";
import { 
  startOfDay, 
  subDays, 
  subMonths,
  parseISO,
  isWithinInterval,
  format,
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
  AreaChart,
  Area,
} from "recharts";
import { cn } from "@/lib/utils";

type PeriodFilter = "7" | "14" | "30" | "90" | "180" | "365";

const COLORS = [
  "hsl(48, 100%, 50%)",   // primary/gold
  "hsl(142, 71%, 45%)",   // success
  "hsl(0, 72%, 51%)",     // destructive
  "hsl(217, 91%, 60%)",   // blue
  "hsl(270, 70%, 60%)",   // purple
  "hsl(25, 95%, 53%)",    // warning/orange
  "hsl(180, 60%, 50%)",   // cyan
  "hsl(330, 70%, 55%)",   // pink
  "hsl(90, 60%, 50%)",    // lime
  "hsl(200, 80%, 50%)",   // sky
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-border bg-popover p-3 shadow-lg">
        <p className="mb-2 font-medium text-foreground">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {formatCurrency(entry.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const CustomPieTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const percentage = payload[0].payload.percentage;
    return (
      <div className="rounded-lg border border-border bg-popover p-3 shadow-lg">
        <p className="font-medium text-foreground">{payload[0].name}</p>
        <p className="text-sm text-muted-foreground">
          {formatCurrency(payload[0].value)} ({percentage.toFixed(1)}%)
        </p>
      </div>
    );
  }
  return null;
};

export default function Relatorios() {
  const [period, setPeriod] = useState<PeriodFilter>("30");
  const [activeTab, setActiveTab] = useState("overview");
  const navigate = useNavigate();

  const { transactions, isLoading: isLoadingTransactions } = useTransactions();
  const { accounts, isLoading: isLoadingAccounts } = useAccounts();

  const isLoading = isLoadingTransactions || isLoadingAccounts;

  // Calcular intervalo de datas
  const dateRange = useMemo(() => {
    const now = new Date();
    const days = parseInt(period);
    return { 
      start: startOfDay(subDays(now, days - 1)), 
      end: now 
    };
  }, [period]);

  // Filtrar transações pelo período
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const transactionDate = parseISO(t.date);
      return isWithinInterval(transactionDate, { start: dateRange.start, end: dateRange.end });
    });
  }, [transactions, dateRange]);

  // Totais
  const totals = useMemo(() => {
    const income = filteredTransactions
      .filter(t => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);
    
    const expenses = filteredTransactions
      .filter(t => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);
    
    return {
      income,
      expenses,
      balance: income - expenses,
      transactionCount: filteredTransactions.length,
    };
  }, [filteredTransactions]);

  // Dados para gráfico de evolução temporal
  const timeSeriesData = useMemo(() => {
    const days = parseInt(period);
    
    // Escolher granularidade baseado no período
    let intervals: Date[];
    let formatLabel: (date: Date) => string;
    
    if (days <= 14) {
      // Diário
      intervals = eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
      formatLabel = (date) => format(date, "dd/MM", { locale: ptBR });
    } else if (days <= 90) {
      // Semanal
      intervals = eachWeekOfInterval({ start: dateRange.start, end: dateRange.end }, { locale: ptBR });
      formatLabel = (date) => format(date, "'Sem' w", { locale: ptBR });
    } else {
      // Mensal
      intervals = eachMonthOfInterval({ start: dateRange.start, end: dateRange.end });
      formatLabel = (date) => format(date, "MMM/yy", { locale: ptBR });
    }

    return intervals.map(intervalStart => {
      let intervalEnd: Date;
      
      if (days <= 14) {
        intervalEnd = intervalStart;
      } else if (days <= 90) {
        intervalEnd = endOfWeek(intervalStart, { locale: ptBR });
      } else {
        intervalEnd = endOfMonth(intervalStart);
      }

      const intervalTransactions = filteredTransactions.filter(t => {
        const tDate = parseISO(t.date);
        return isWithinInterval(tDate, { 
          start: startOfDay(intervalStart), 
          end: days <= 14 ? intervalStart : intervalEnd 
        });
      });

      const income = intervalTransactions
        .filter(t => t.type === "income")
        .reduce((sum, t) => sum + t.amount, 0);
      
      const expenses = intervalTransactions
        .filter(t => t.type === "expense")
        .reduce((sum, t) => sum + t.amount, 0);

      return {
        name: formatLabel(intervalStart),
        receitas: income,
        despesas: expenses,
        saldo: income - expenses,
      };
    });
  }, [filteredTransactions, dateRange, period]);

  // Dados para gráfico de pizza (despesas por categoria)
  const categoryData = useMemo(() => {
    const categoryTotals: Record<string, number> = {};
    
    filteredTransactions
      .filter(t => t.type === "expense")
      .forEach(t => {
        categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
      });

    const total = Object.values(categoryTotals).reduce((sum, v) => sum + v, 0);

    return Object.entries(categoryTotals)
      .map(([name, value], index) => ({
        name,
        value,
        color: COLORS[index % COLORS.length],
        percentage: total > 0 ? (value / total) * 100 : 0,
      }))
      .sort((a, b) => b.value - a.value);
  }, [filteredTransactions]);

  // Dados por conta bancária
  const accountData = useMemo(() => {
    const accountTotals: Record<string, { income: number; expenses: number; name: string }> = {};
    
    // Inicializar contas
    accounts.forEach(acc => {
      accountTotals[acc.id] = { income: 0, expenses: 0, name: acc.name };
    });
    
    // Adicionar "Sem conta" para transações sem account_id
    accountTotals["no_account"] = { income: 0, expenses: 0, name: "Sem conta definida" };

    filteredTransactions.forEach(t => {
      const accountId = t.account_id || "no_account";
      if (!accountTotals[accountId]) {
        accountTotals[accountId] = { income: 0, expenses: 0, name: "Conta removida" };
      }
      
      if (t.type === "income") {
        accountTotals[accountId].income += t.amount;
      } else {
        accountTotals[accountId].expenses += t.amount;
      }
    });

    return Object.entries(accountTotals)
      .filter(([_, data]) => data.income > 0 || data.expenses > 0)
      .map(([id, data], index) => ({
        id,
        name: data.name,
        receitas: data.income,
        despesas: data.expenses,
        saldo: data.income - data.expenses,
        color: COLORS[index % COLORS.length],
      }));
  }, [filteredTransactions, accounts]);

  // Top despesas
  const topExpenses = useMemo(() => {
    return filteredTransactions
      .filter(t => t.type === "expense")
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);
  }, [filteredTransactions]);

  const hasData = filteredTransactions.length > 0;

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
              Relatórios
            </h1>
            <p className="text-sm text-muted-foreground">
              Análise detalhada das suas finanças
            </p>
          </div>
          <Select value={period} onValueChange={(v) => setPeriod(v as PeriodFilter)}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="14">Últimos 14 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="90">Últimos 3 meses</SelectItem>
              <SelectItem value="180">Últimos 6 meses</SelectItem>
              <SelectItem value="365">Último ano</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Empty State */}
        {!hasData ? (
          <EmptyState
            icon={BarChart3}
            title="Sem dados para relatórios"
            description="Comece adicionando lançamentos de receitas e despesas para visualizar relatórios detalhados e gráficos das suas finanças."
            actionLabel="Adicionar lançamento"
            onAction={() => navigate("/lancamentos")}
            className="min-h-[400px]"
          />
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Receitas</p>
                    <p className="mt-1 font-display text-2xl font-bold text-success">
                      {formatCurrency(totals.income)}
                    </p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-success/10">
                    <TrendingUp className="h-6 w-6 text-success" />
                  </div>
                </div>
              </Card>

              <Card className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Despesas</p>
                    <p className="mt-1 font-display text-2xl font-bold text-destructive">
                      {formatCurrency(totals.expenses)}
                    </p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-destructive/10">
                    <TrendingDown className="h-6 w-6 text-destructive" />
                  </div>
                </div>
              </Card>

              <Card className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Saldo do Período</p>
                    <p className={cn(
                      "mt-1 font-display text-2xl font-bold",
                      totals.balance >= 0 ? "text-success" : "text-destructive"
                    )}>
                      {formatCurrency(totals.balance)}
                    </p>
                  </div>
                  <div className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-lg",
                    totals.balance >= 0 ? "bg-success/10" : "bg-destructive/10"
                  )}>
                    <Wallet className={cn(
                      "h-6 w-6",
                      totals.balance >= 0 ? "text-success" : "text-destructive"
                    )} />
                  </div>
                </div>
              </Card>

              <Card className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total de Lançamentos</p>
                    <p className="mt-1 font-display text-2xl font-bold text-foreground">
                      {totals.transactionCount}
                    </p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <BarChart3 className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </Card>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:grid-cols-none lg:flex">
                <TabsTrigger value="overview">Visão Geral</TabsTrigger>
                <TabsTrigger value="categories">Por Categoria</TabsTrigger>
                <TabsTrigger value="accounts">Por Conta</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                {/* Time Series Chart */}
                <Card className="p-5">
                  <h3 className="mb-4 font-display text-lg font-semibold text-foreground">
                    Evolução no Período
                  </h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={timeSeriesData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorReceitas" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorDespesas" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(0, 72%, 51%)" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="hsl(0, 72%, 51%)" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                        <XAxis
                          dataKey="name"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                          tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Area
                          type="monotone"
                          dataKey="receitas"
                          name="Receitas"
                          stroke="hsl(142, 71%, 45%)"
                          fillOpacity={1}
                          fill="url(#colorReceitas)"
                          strokeWidth={2}
                        />
                        <Area
                          type="monotone"
                          dataKey="despesas"
                          name="Despesas"
                          stroke="hsl(0, 72%, 51%)"
                          fillOpacity={1}
                          fill="url(#colorDespesas)"
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                {/* Top Expenses */}
                <Card className="p-5">
                  <h3 className="mb-4 font-display text-lg font-semibold text-foreground">
                    Maiores Despesas
                  </h3>
                  <div className="space-y-3">
                    {topExpenses.length === 0 ? (
                      <p className="text-center text-sm text-muted-foreground py-4">
                        Nenhuma despesa no período
                      </p>
                    ) : (
                      topExpenses.map((expense, index) => (
                        <div
                          key={expense.id}
                          className="flex items-center justify-between rounded-lg border border-border/50 bg-background/50 p-3"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10 text-xs font-bold text-destructive">
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-medium text-foreground">
                                {expense.description || expense.category}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatShortDate(parseISO(expense.date))} · {expense.category}
                              </p>
                            </div>
                          </div>
                          <p className="font-semibold text-destructive">
                            {formatCurrency(expense.amount)}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </Card>
              </TabsContent>

              {/* Categories Tab */}
              <TabsContent value="categories" className="space-y-6">
                <div className="grid gap-6 lg:grid-cols-2">
                  {/* Pie Chart */}
                  <Card className="p-5">
                    <h3 className="mb-4 font-display text-lg font-semibold text-foreground">
                      Despesas por Categoria
                    </h3>
                    {categoryData.length === 0 ? (
                      <div className="flex h-64 items-center justify-center">
                        <p className="text-sm text-muted-foreground">Nenhuma despesa no período</p>
                      </div>
                    ) : (
                      <div className="flex h-64 items-center">
                        <div className="h-full w-1/2">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={categoryData}
                                cx="50%"
                                cy="50%"
                                innerRadius={50}
                                outerRadius={80}
                                paddingAngle={4}
                                dataKey="value"
                              >
                                {categoryData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip content={<CustomPieTooltip />} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="w-1/2 space-y-2 max-h-64 overflow-y-auto">
                          {categoryData.map((item, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <div
                                className="h-3 w-3 rounded-full shrink-0"
                                style={{ backgroundColor: item.color }}
                              />
                              <span className="text-xs text-muted-foreground truncate">{item.name}</span>
                              <span className="ml-auto text-xs font-medium text-foreground shrink-0">
                                {item.percentage.toFixed(1)}%
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </Card>

                  {/* Category Bar Chart */}
                  <Card className="p-5">
                    <h3 className="mb-4 font-display text-lg font-semibold text-foreground">
                      Ranking de Gastos
                    </h3>
                    {categoryData.length === 0 ? (
                      <div className="flex h-64 items-center justify-center">
                        <p className="text-sm text-muted-foreground">Nenhuma despesa no período</p>
                      </div>
                    ) : (
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart 
                            data={categoryData.slice(0, 6)} 
                            layout="vertical" 
                            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                            <XAxis 
                              type="number" 
                              axisLine={false}
                              tickLine={false}
                              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                              tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}
                            />
                            <YAxis 
                              type="category" 
                              dataKey="name" 
                              axisLine={false}
                              tickLine={false}
                              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                              width={80}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="value" name="Valor" radius={[0, 4, 4, 0]}>
                              {categoryData.slice(0, 6).map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </Card>
                </div>

                {/* Category Details Table */}
                <Card className="p-5">
                  <h3 className="mb-4 font-display text-lg font-semibold text-foreground">
                    Detalhamento por Categoria
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="pb-3 text-left text-sm font-medium text-muted-foreground">Categoria</th>
                          <th className="pb-3 text-right text-sm font-medium text-muted-foreground">Valor</th>
                          <th className="pb-3 text-right text-sm font-medium text-muted-foreground">%</th>
                        </tr>
                      </thead>
                      <tbody>
                        {categoryData.map((cat, index) => (
                          <tr key={index} className="border-b border-border/50">
                            <td className="py-3">
                              <div className="flex items-center gap-2">
                                <div
                                  className="h-3 w-3 rounded-full"
                                  style={{ backgroundColor: cat.color }}
                                />
                                <span className="text-sm font-medium text-foreground">{cat.name}</span>
                              </div>
                            </td>
                            <td className="py-3 text-right text-sm font-semibold text-foreground">
                              {formatCurrency(cat.value)}
                            </td>
                            <td className="py-3 text-right text-sm text-muted-foreground">
                              {cat.percentage.toFixed(1)}%
                            </td>
                          </tr>
                        ))}
                        {categoryData.length > 0 && (
                          <tr className="bg-muted/30">
                            <td className="py-3 text-sm font-bold text-foreground">Total</td>
                            <td className="py-3 text-right text-sm font-bold text-foreground">
                              {formatCurrency(totals.expenses)}
                            </td>
                            <td className="py-3 text-right text-sm font-bold text-foreground">100%</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </TabsContent>

              {/* Accounts Tab */}
              <TabsContent value="accounts" className="space-y-6">
                {/* Account Summary Cards */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {accountData.map((account, index) => (
                    <Card key={account.id} className="p-5">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="flex h-10 w-10 items-center justify-center rounded-lg"
                            style={{ backgroundColor: `${account.color}20` }}
                          >
                            <Wallet className="h-5 w-5" style={{ color: account.color }} />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{account.name}</p>
                            <p className={cn(
                              "text-sm font-semibold",
                              account.saldo >= 0 ? "text-success" : "text-destructive"
                            )}>
                              {account.saldo >= 0 ? "+" : ""}{formatCurrency(account.saldo)}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 pt-3 border-t border-border">
                        <div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                            <ArrowUpRight className="h-3 w-3 text-success" />
                            Entradas
                          </div>
                          <p className="text-sm font-semibold text-success">
                            {formatCurrency(account.receitas)}
                          </p>
                        </div>
                        <div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                            <ArrowDownRight className="h-3 w-3 text-destructive" />
                            Saídas
                          </div>
                          <p className="text-sm font-semibold text-destructive">
                            {formatCurrency(account.despesas)}
                          </p>
                        </div>
                      </div>
                    </Card>
                  ))}
                  {accountData.length === 0 && (
                    <div className="col-span-full text-center py-8 text-muted-foreground">
                      Nenhuma transação com conta definida no período
                    </div>
                  )}
                </div>

                {/* Account Bar Chart */}
                {accountData.length > 0 && (
                  <Card className="p-5">
                    <h3 className="mb-4 font-display text-lg font-semibold text-foreground">
                      Movimentação por Conta
                    </h3>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={accountData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                          <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                          />
                          <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                            tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}
                          />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend />
                          <Bar
                            dataKey="receitas"
                            name="Receitas"
                            fill="hsl(142, 71%, 45%)"
                            radius={[4, 4, 0, 0]}
                            maxBarSize={60}
                          />
                          <Bar
                            dataKey="despesas"
                            name="Despesas"
                            fill="hsl(0, 72%, 51%)"
                            radius={[4, 4, 0, 0]}
                            maxBarSize={60}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </MainLayout>
  );
}
