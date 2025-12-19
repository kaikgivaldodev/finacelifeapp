/**
 * Converte Date para string YYYY-MM-DD no fuso local (sem UTC)
 * Use SEMPRE este helper ao salvar datas de calendário no banco
 */
export const toYYYYMMDD = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

/**
 * Converte string YYYY-MM-DD para formato brasileiro dd/MM/yyyy
 * Parse manual para evitar problemas de UTC
 */
export const yyyyMmDdToBr = (s: string): string => {
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${y}`;
};

// Currency formatter for Brazilian Real
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

// Date formatter for Brazilian format (dd/MM/yyyy)
export const formatDate = (date: Date | string): string => {
  // Se for string YYYY-MM-DD, usa parse manual
  if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return yyyyMmDdToBr(date);
  }
  // Se for Date, converte para YYYY-MM-DD e depois para BR
  if (date instanceof Date) {
    return yyyyMmDdToBr(toYYYYMMDD(date));
  }
  // Fallback para outros formatos
  const d = new Date(date);
  return yyyyMmDdToBr(toYYYYMMDD(d));
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

// Parse date string to local date (avoiding UTC timezone issues)
const parseLocalDate = (date: Date | string): Date => {
  if (date instanceof Date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }
  // Parse "YYYY-MM-DD" format as local date, not UTC
  const parts = date.split("-");
  if (parts.length === 3) {
    return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  }
  // Fallback: parse and extract local date components
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

// Relative date (ex: "Em 3 dias", "Vencida há 2 dias", "Hoje")
export const formatRelativeDate = (date: Date | string): { text: string; status: "today" | "upcoming" | "overdue" } => {
  const targetDate = parseLocalDate(date);
  const today = parseLocalDate(new Date());

  // Calculate difference in calendar days
  const diffTime = targetDate.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

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
