export interface MonthlyOrderStat {
  month: string;
  totalOrders: number;
}

export interface MonthlySalesStat {
  month: string;
  totalSales: number;
}

export interface DashboardStatistics {
  totalOrders: number;
  pendingOrders: number;
  confirmedOrders: number;
  cancelledOrders: number;
  deliveredOrders: number;
  totalSales: number;
  monthlySales: number;
  totalProducts: number;
  activeUsers: number;
  totalCustomers: number;
  totalResellers: number;
  monthlyOrders: MonthlyOrderStat[];
  monthlySalesChart: MonthlySalesStat[];
}