import type { ReportDateRange } from "./reports.interface";

export interface DateRangeBounds {
  startDate: Date;
  endDate: Date;
}

export const calculateDateRange = (
  range?: ReportDateRange,
  from?: string,
  to?: string
): DateRangeBounds => {
  const now = new Date();

  // If CUSTOM range is specified with from and to
  if (range === "CUSTOM" || (from && to && !range)) {
    const startDate = from ? new Date(from) : new Date(0);
    const endDate = to ? new Date(to) : new Date();

    if (isNaN(startDate.getTime())) {
      throw new Error("Invalid 'from' date parameter");
    }

    if (isNaN(endDate.getTime())) {
      throw new Error("Invalid 'to' date parameter");
    }

    // Set end of day if time was omitted in ISO date string (YYYY-MM-DD)
    if (to && to.length === 10) {
      endDate.setHours(23, 59, 59, 999);
    }

    return { startDate, endDate };
  }

  const selectedRange = range ?? "LAST_30_DAYS";

  const startOfDay = (d: Date): Date => {
    const res = new Date(d);
    res.setHours(0, 0, 0, 0);
    return res;
  };

  const endOfDay = (d: Date): Date => {
    const res = new Date(d);
    res.setHours(23, 59, 59, 999);
    return res;
  };

  switch (selectedRange) {
    case "TODAY": {
      return {
        startDate: startOfDay(now),
        endDate: endOfDay(now),
      };
    }
    case "YESTERDAY": {
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      return {
        startDate: startOfDay(yesterday),
        endDate: endOfDay(yesterday),
      };
    }
    case "LAST_7_DAYS": {
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(now.getDate() - 6);
      return {
        startDate: startOfDay(sevenDaysAgo),
        endDate: endOfDay(now),
      };
    }
    case "LAST_30_DAYS": {
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(now.getDate() - 29);
      return {
        startDate: startOfDay(thirtyDaysAgo),
        endDate: endOfDay(now),
      };
    }
    case "THIS_MONTH": {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      return {
        startDate: startOfMonth,
        endDate: endOfDay(now),
      };
    }
    case "LAST_MONTH": {
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return {
        startDate: startOfLastMonth,
        endDate: endOfLastMonth,
      };
    }
    case "THIS_YEAR": {
      const startOfYear = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      return {
        startDate: startOfYear,
        endDate: endOfDay(now),
      };
    }
    default: {
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(now.getDate() - 29);
      return {
        startDate: startOfDay(thirtyDaysAgo),
        endDate: endOfDay(now),
      };
    }
  }
};

export const formatDateString = (date: Date | string | null | undefined): string => {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  return d.toISOString();
};
