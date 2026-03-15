import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";

export type PeriodKey = "today" | "week" | "month" | "custom";

export function getPeriodRange(
  key: PeriodKey,
  customStart?: string,
  customEnd?: string
): { startDate: string; endDate: string } {
  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");

  switch (key) {
    case "today":
      return { startDate: todayStr, endDate: todayStr };
    case "week": {
      const start = startOfWeek(today, { weekStartsOn: 0 });
      const end = endOfWeek(today, { weekStartsOn: 0 });
      return {
        startDate: format(start, "yyyy-MM-dd"),
        endDate: format(end, "yyyy-MM-dd"),
      };
    }
    case "month": {
      const start = startOfMonth(today);
      const end = endOfMonth(today);
      return {
        startDate: format(start, "yyyy-MM-dd"),
        endDate: format(end, "yyyy-MM-dd"),
      };
    }
    case "custom":
      return {
        startDate: customStart ?? todayStr,
        endDate: customEnd ?? todayStr,
      };
    default:
      return { startDate: todayStr, endDate: todayStr };
  }
}

export function formatPeriodLabel(
  key: PeriodKey,
  startDate: string,
  endDate: string
): string {
  if (key === "today") return "Hoje";
  if (key === "week") return "Semana";
  if (key === "month") return "Mês";
  return `${startDate} até ${endDate}`;
}
