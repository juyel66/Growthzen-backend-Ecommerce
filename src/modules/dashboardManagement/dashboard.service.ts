import prismaClient from "../../config/prisma";
import type { DashboardStatistics } from "./dashboard.interface";

const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const isSalesCountableStatus = (status: string): boolean => status === "CONFIRMED" || status === "DELIVERED";

const roundToTwo = (value: number): number => Number(value.toFixed(2));

export const getDashboardStatistics = async (): Promise<DashboardStatistics> => {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const endOfYear = new Date(now.getFullYear() + 1, 0, 1);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [
    totalOrders,
    pendingOrders,
    confirmedOrders,
    cancelledOrders,
    deliveredOrders,
    totalSalesAggregate,
    monthlySalesAggregate,
    totalProducts,
    activeUsers,
    totalCustomers,
    totalResellers,
    yearlyOrders,
  ] = await Promise.all([
    prismaClient.order.count(),
    prismaClient.order.count({ where: { status: "PENDING" } }),
    prismaClient.order.count({ where: { status: "CONFIRMED" } }),
    prismaClient.order.count({ where: { status: "CANCELLED" } }),
    prismaClient.order.count({ where: { status: "DELIVERED" } }),
    prismaClient.order.aggregate({
      where: { status: { in: ["CONFIRMED", "DELIVERED"] } },
      _sum: { payableAmount: true },
    }),
    prismaClient.order.aggregate({
      where: {
        createdAt: {
          gte: startOfMonth,
          lt: endOfMonth,
        },
        status: { in: ["CONFIRMED", "DELIVERED"] },
      },
      _sum: { payableAmount: true },
    }),
    prismaClient.product.count(),
    prismaClient.user.count({ where: { isActive: true } }),
    prismaClient.user.count({ where: { role: "CUSTOMER" } }),
    prismaClient.user.count({ where: { role: "RESELLER" } }),
    prismaClient.order.findMany({
      where: {
        createdAt: {
          gte: startOfYear,
          lt: endOfYear,
        },
      },
      select: {
        createdAt: true,
        payableAmount: true,
        status: true,
      },
    }),
  ]);

  const monthlyOrders = monthLabels.map((month) => ({ month, totalOrders: 0 }));
  const monthlySalesChart = monthLabels.map((month) => ({ month, totalSales: 0 }));

  for (const order of yearlyOrders) {
    const monthIndex = order.createdAt.getMonth();

    monthlyOrders[monthIndex].totalOrders += 1;

    if (isSalesCountableStatus(order.status)) {
      monthlySalesChart[monthIndex].totalSales = roundToTwo(monthlySalesChart[monthIndex].totalSales + order.payableAmount);
    }
  }

  return {
    totalOrders,
    pendingOrders,
    confirmedOrders,
    cancelledOrders,
    deliveredOrders,
    totalSales: roundToTwo(totalSalesAggregate._sum.payableAmount ?? 0),
    monthlySales: roundToTwo(monthlySalesAggregate._sum.payableAmount ?? 0),
    totalProducts,
    activeUsers,
    totalCustomers,
    totalResellers,
    monthlyOrders,
    monthlySalesChart,
  };
};