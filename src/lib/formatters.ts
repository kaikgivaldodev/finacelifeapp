// Currency formatter for Brazilian Real
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

// Date formatter for Brazilian format
export const formatDate = (date: Date | string): string => {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
};

// Short date format (day/month)
export const formatShortDate = (date: Date | string): string => {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  }).format(d);
};

// Month/Year format
export const formatMonthYear = (date: Date | string): string => {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(d);
};

// Relative date (ex: "Em 3 dias", "Vencida há 2 dias", "Hoje")
export const formatRelativeDate = (date: Date | string): { text: string; status: "today" | "upcoming" | "overdue" } => {
  const d = typeof date === "string" ? new Date(date) : date;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);

  const diffTime = d.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return { text: "Hoje", status: "today" };
  } else if (diffDays > 0) {
    return { text: `Em ${diffDays} dia${diffDays > 1 ? "s" : ""}`, status: "upcoming" };
  } else {
    const absDays = Math.abs(diffDays);
    return { text: `Vencida há ${absDays} dia${absDays > 1 ? "s" : ""}`, status: "overdue" };
  }
};

// Compact number format
export const formatCompactNumber = (value: number): string => {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toString();
};

// Percentage format
export const formatPercentage = (value: number, decimals: number = 1): string => {
  return `${value.toFixed(decimals)}%`;
};

// Due day format (ex: "todo dia 10")
export const formatDueDay = (day: number): string => {
  return `todo dia ${day}`;
};
