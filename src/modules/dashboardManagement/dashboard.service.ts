import type { OrderStatus, PaymentMethod, PaymentStatus, Prisma } from "@prisma/client";

import prismaClient from "../../config/prisma";
import { formatPublicUrl } from "../../utils/imageUrl";
import type {
  DashboardCharts,
  DashboardCustomerAnalytics,
  DashboardCustomerGrowthChartPoint,
  DashboardOrderAnalytics,
  DashboardOrderMonthStat,
  DashboardOrderPaymentMethodStat,
  DashboardOrderShippingMethodStat,
  DashboardOrderStatusStat,
  DashboardOrdersChartPoint,
  DashboardOverview,
  DashboardPaymentAnalytics,
  DashboardPaymentChartPoint,
  DashboardPaymentMethodStat,
  DashboardPaymentStatusStat,
  DashboardProductSummary,
  DashboardQuery,
  DashboardRangeKey,
  DashboardRangeWindow,
  DashboardRecent,
  DashboardRecentCustomerItem,
  DashboardRecentOrderItem,
  DashboardRecentPaymentItem,
  DashboardRevenueAnalytics,
  DashboardRevenueChartPoint,
  DashboardShippingSummary,
  DashboardTopSellingProductItem,
} from "./dashboard.interface";

const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const orderStatuses: readonly OrderStatus[] = ["PENDING", "CONFIRMED", "PROCESSING", "PACKED", "SHIPPED", "DELIVERED", "CANCELLED", "RETURNED"];
const paymentMethods: readonly PaymentMethod[] = ["COD", "BKASH", "NAGAD"];
const paymentStatuses: readonly PaymentStatus[] = ["PENDING", "PAID", "FAILED", "CANCELLED", "REFUNDED"];

const roundToTwo = (value: number): number => Number(value.toFixed(2));
const millisecondsPerDay = 24 * 60 * 60 * 1000;

const startOfDay = (date: Date): Date => {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
};

const endOfDay = (date: Date): Date => {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
};

const startOfMonth = (date: Date): Date => new Date(date.getFullYear(), date.getMonth(), 1);
const endOfMonthInclusive = (date: Date): Date => new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
const startOfYear = (date: Date): Date => new Date(date.getFullYear(), 0, 1);
const endOfYearInclusive = (date: Date): Date => new Date(date.getFullYear(), 11, 31, 23, 59, 59, 999);
const addDays = (date: Date, days: number): Date => new Date(date.getTime() + (days * millisecondsPerDay));

const getRangeLabel = (range: DashboardRangeKey): string => {
  switch (range) {
    case "TODAY": return "Today";
    case "YESTERDAY": return "Yesterday";
    case "LAST_7_DAYS": return "Last 7 Days";
    case "LAST_30_DAYS": return "Last 30 Days";
    case "MONTHLY": return "Monthly";
    case "YEARLY": return "Yearly";
    case "CUSTOM": return "Custom Date Range";
    default: return "Selected Range";
  }
};

const resolveRangeWindow = (query: DashboardQuery): DashboardRangeWindow => {
  const now = new Date();
  const range = query.range ?? "YEARLY";

  if (range === "CUSTOM") {
    const from = query.from ?? startOfDay(now);
    const to = query.to ?? endOfDay(now);

    return {
      range,
      from: startOfDay(from),
      to: endOfDay(to),
      label: getRangeLabel(range),
    };
  }

  if (range === "TODAY") {
    return { range, from: startOfDay(now), to: endOfDay(now), label: getRangeLabel(range) };
  }

  if (range === "YESTERDAY") {
    const yesterday = addDays(now, -1);
    return { range, from: startOfDay(yesterday), to: endOfDay(yesterday), label: getRangeLabel(range) };
  }

  if (range === "LAST_7_DAYS") {
    return { range, from: startOfDay(addDays(now, -6)), to: endOfDay(now), label: getRangeLabel(range) };
  }

  if (range === "LAST_30_DAYS") {
    return { range, from: startOfDay(addDays(now, -29)), to: endOfDay(now), label: getRangeLabel(range) };
  }

  if (range === "MONTHLY") {
    return { range, from: startOfMonth(now), to: endOfMonthInclusive(now), label: getRangeLabel(range) };
  }

  return { range: "YEARLY", from: startOfYear(now), to: endOfYearInclusive(now), label: getRangeLabel("YEARLY") };
};

const getChartGranularity = (range: DashboardRangeWindow): "hour" | "day" | "month" => {
  if (range.range === "TODAY" || range.range === "YESTERDAY") {
    return "hour";
  }

  const spanDays = Math.max(1, Math.ceil((range.to.getTime() - range.from.getTime()) / millisecondsPerDay));
  if (spanDays <= 31) {
    return "day";
  }

  return "month";
};

const bucketKey = (date: Date, granularity: "hour" | "day" | "month"): string => {
  if (granularity === "hour") {
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}`;
  }

  if (granularity === "day") {
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  }

  return `${date.getFullYear()}-${date.getMonth()}`;
};

const buildBuckets = (range: DashboardRangeWindow): Array<{ key: string; label: string }> => {
  const granularity = getChartGranularity(range);
  const buckets: Array<{ key: string; label: string }> = [];

  if (granularity === "hour") {
    const base = startOfDay(range.from);
    for (let hour = 0; hour < 24; hour += 1) {
      const date = new Date(base);
      date.setHours(hour, 0, 0, 0);
      buckets.push({ key: bucketKey(date, granularity), label: `${String(hour).padStart(2, "0")}:00` });
    }
    return buckets;
  }

  if (granularity === "day") {
    let cursor = startOfDay(range.from);
    const end = startOfDay(range.to);

    while (cursor <= end) {
      buckets.push({ key: bucketKey(cursor, granularity), label: `${monthLabels[cursor.getMonth()]} ${cursor.getDate()}` });
      cursor = addDays(cursor, 1);
    }

    return buckets;
  }

  let cursor = startOfMonth(range.from);
  const end = startOfMonth(range.to);

  while (cursor <= end) {
    buckets.push({ key: bucketKey(cursor, granularity), label: `${monthLabels[cursor.getMonth()]} ${cursor.getFullYear()}` });
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
  }

  return buckets;
};

const buildDeliveredRevenueWhere = (from?: Date, to?: Date): Prisma.OrderWhereInput => ({
  status: "DELIVERED",
  payment: { status: "PAID" },
  ...(from && to ? { createdAt: { gte: from, lte: to } } : {}),
});

const sumGroupedField = <T extends string>(grouped: Array<Record<string, T> & { _count: { _all: number } }>, key: string, value: T): number => {
  const item = grouped.find((entry) => entry[key] === value);
  return item?._count._all ?? 0;
};

const aggregateByDate = <T extends { createdAt: Date }>(range: DashboardRangeWindow, records: T[]): Map<string, number> => {
  const granularity = getChartGranularity(range);
  const totals = new Map<string, number>();

  for (const record of records) {
    const key = bucketKey(record.createdAt, granularity);
    totals.set(key, (totals.get(key) ?? 0) + 1);
  }

  return totals;
};

const aggregateRevenueByDate = (range: DashboardRangeWindow, records: Array<{ createdAt: Date; payableAmount: number }>): Map<string, number> => {
  const granularity = getChartGranularity(range);
  const totals = new Map<string, number>();

  for (const record of records) {
    const key = bucketKey(record.createdAt, granularity);
    totals.set(key, roundToTwo((totals.get(key) ?? 0) + record.payableAmount));
  }

  return totals;
};

const mapRevenueSummary = async (query: DashboardQuery): Promise<DashboardRevenueAnalytics> => {
  const now = new Date();
  const range = resolveRangeWindow(query);
  const [
    totalRevenueAggregate,
    todayRevenueAggregate,
    yesterdayRevenueAggregate,
    weeklyRevenueAggregate,
    monthlyRevenueAggregate,
    yearlyRevenueAggregate,
    selectedRevenueAggregate,
  ] = await Promise.all([
    prismaClient.order.aggregate({ where: buildDeliveredRevenueWhere(), _sum: { payableAmount: true } }),
    prismaClient.order.aggregate({ where: buildDeliveredRevenueWhere(startOfDay(now), endOfDay(now)), _sum: { payableAmount: true } }),
    prismaClient.order.aggregate({ where: buildDeliveredRevenueWhere(startOfDay(addDays(now, -1)), endOfDay(addDays(now, -1))), _sum: { payableAmount: true } }),
    prismaClient.order.aggregate({ where: buildDeliveredRevenueWhere(startOfDay(addDays(now, -6)), endOfDay(now)), _sum: { payableAmount: true } }),
    prismaClient.order.aggregate({ where: buildDeliveredRevenueWhere(startOfMonth(now), endOfMonthInclusive(now)), _sum: { payableAmount: true } }),
    prismaClient.order.aggregate({ where: buildDeliveredRevenueWhere(startOfYear(now), endOfYearInclusive(now)), _sum: { payableAmount: true } }),
    prismaClient.order.aggregate({ where: buildDeliveredRevenueWhere(range.from, range.to), _sum: { payableAmount: true } }),
  ]);

  return {
    range,
    totalRevenue: roundToTwo(totalRevenueAggregate._sum.payableAmount ?? 0),
    todayRevenue: roundToTwo(todayRevenueAggregate._sum.payableAmount ?? 0),
    yesterdayRevenue: roundToTwo(yesterdayRevenueAggregate._sum.payableAmount ?? 0),
    weeklyRevenue: roundToTwo(weeklyRevenueAggregate._sum.payableAmount ?? 0),
    monthlyRevenue: roundToTwo(monthlyRevenueAggregate._sum.payableAmount ?? 0),
    yearlyRevenue: roundToTwo(yearlyRevenueAggregate._sum.payableAmount ?? 0),
    selectedRevenue: roundToTwo(selectedRevenueAggregate._sum.payableAmount ?? 0),
  };
};

const mapOrderSummary = async (): Promise<DashboardOrderAnalytics> => {
  const now = new Date();
  const [
    totalOrders,
    statusGroups,
    paymentGroups,
    shippingGroups,
    yearlyOrders,
  ] = await Promise.all([
    prismaClient.order.count(),
    prismaClient.order.groupBy({ by: ["status"], _count: { _all: true } }),
    prismaClient.payment.groupBy({ by: ["method"], _count: { _all: true } }),
    prismaClient.order.groupBy({ by: ["shippingMethodName"], where: { shippingMethodName: { not: null } }, _count: { _all: true } }),
    prismaClient.order.findMany({ where: { createdAt: { gte: startOfYear(now), lte: endOfYearInclusive(now) } }, select: { createdAt: true } }),
  ]);

  const statusMap = new Map(statusGroups.map((item) => [item.status, item._count._all]));
  const paymentMap = new Map(paymentGroups.map((item) => [item.method, item._count._all]));
  const shippingMap = new Map(shippingGroups.map((item) => [item.shippingMethodName ?? "Unassigned", item._count._all]));
  const monthlyOrders: DashboardOrderMonthStat[] = monthLabels.map((month) => ({ month, totalOrders: 0 }));

  for (const order of yearlyOrders) {
    monthlyOrders[order.createdAt.getMonth()].totalOrders += 1;
  }

  return {
    range: resolveRangeWindow({ range: "YEARLY" }),
    totalOrders,
    pendingOrders: statusMap.get("PENDING") ?? 0,
    confirmedOrders: statusMap.get("CONFIRMED") ?? 0,
    processingOrders: statusMap.get("PROCESSING") ?? 0,
    packedOrders: statusMap.get("PACKED") ?? 0,
    shippedOrders: statusMap.get("SHIPPED") ?? 0,
    deliveredOrders: statusMap.get("DELIVERED") ?? 0,
    cancelledOrders: statusMap.get("CANCELLED") ?? 0,
    returnedOrders: statusMap.get("RETURNED") ?? 0,
    ordersByStatus: orderStatuses.map((status) => ({ status, totalOrders: statusMap.get(status) ?? 0 })),
    ordersByMonth: monthlyOrders,
    ordersByPaymentMethod: paymentMethods.map((method) => ({ method, totalOrders: paymentMap.get(method) ?? 0 })),
    ordersByShippingMethod: [...shippingMap.entries()].map(([shippingMethod, totalOrders]) => ({ shippingMethod, totalOrders })),
  };
};

const mapProductSummary = async (): Promise<DashboardProductSummary> => {
  const [totalProducts, activeProducts, inactiveProducts, featuredProducts] = await Promise.all([
    prismaClient.product.count(),
    prismaClient.product.count({ where: { status: "ACTIVE" } }),
    prismaClient.product.count({ where: { status: "INACTIVE" } }),
    prismaClient.product.count({ where: { isFeatured: true } }),
  ]);

  return { totalProducts, activeProducts, inactiveProducts, featuredProducts };
};

const mapCustomerSummary = async (): Promise<DashboardCustomerAnalytics> => {
  const now = new Date();
  const range = resolveRangeWindow({ range: "YEARLY" });
  const [
    totalCustomers,
    todayCustomers,
    weeklyCustomers,
    monthlyCustomers,
    yearlyCustomers,
    growthCustomers,
  ] = await Promise.all([
    prismaClient.user.count({ where: { role: "CUSTOMER" } }),
    prismaClient.user.count({ where: { role: "CUSTOMER", createdAt: { gte: startOfDay(now), lte: endOfDay(now) } } }),
    prismaClient.user.count({ where: { role: "CUSTOMER", createdAt: { gte: startOfDay(addDays(now, -6)), lte: endOfDay(now) } } }),
    prismaClient.user.count({ where: { role: "CUSTOMER", createdAt: { gte: startOfMonth(now), lte: endOfMonthInclusive(now) } } }),
    prismaClient.user.count({ where: { role: "CUSTOMER", createdAt: { gte: startOfYear(now), lte: endOfYearInclusive(now) } } }),
    prismaClient.user.findMany({ where: { role: "CUSTOMER", createdAt: { gte: range.from, lte: range.to } }, select: { createdAt: true } }),
  ]);

  const growthMap = aggregateByDate(range, growthCustomers);
  const buckets = buildBuckets(range);
  const growthChart: DashboardCustomerGrowthChartPoint[] = buckets.map((bucket) => ({ label: bucket.label, totalCustomers: growthMap.get(bucket.key) ?? 0 }));

  return { range, totalCustomers, todayCustomers, weeklyCustomers, monthlyCustomers, yearlyCustomers, growthChart };
};

const mapPaymentSummary = async (): Promise<DashboardPaymentAnalytics> => {
  const range = resolveRangeWindow({ range: "YEARLY" });
  const [
    totalPayments,
    statusGroups,
    methodGroups,
    refundedPaymentsRecords,
    paidPaymentsRecords,
  ] = await Promise.all([
    prismaClient.payment.count(),
    prismaClient.payment.groupBy({ by: ["status"], _count: { _all: true } }),
    prismaClient.payment.groupBy({ by: ["method"], _count: { _all: true } }),
    prismaClient.payment.findMany({
      where: { status: "REFUNDED" },
      select: { paidAmount: true, order: { select: { payableAmount: true } } },
    }),
    prismaClient.payment.findMany({
      where: { status: "PAID" },
      select: { paidAmount: true, order: { select: { payableAmount: true } } },
    }),
  ]);

  const statusMap = new Map(statusGroups.map((item) => [item.status, item._count._all]));
  const methodMap = new Map(methodGroups.map((item) => [item.method, item._count._all]));

  const refundedPayments = statusMap.get("REFUNDED") ?? 0;
  const totalRefundAmount = roundToTwo(
    refundedPaymentsRecords.reduce(
      (sum, p) => sum + (p.paidAmount ?? p.order?.payableAmount ?? 0),
      0
    )
  );

  const totalPaidAmount = roundToTwo(
    paidPaymentsRecords.reduce(
      (sum, p) => sum + (p.paidAmount ?? p.order?.payableAmount ?? 0),
      0
    )
  );

  return {
    range,
    totalPayments,
    pendingPayments: statusMap.get("PENDING") ?? 0,
    paidPayments: statusMap.get("PAID") ?? 0,
    failedPayments: statusMap.get("FAILED") ?? 0,
    cancelledPayments: statusMap.get("CANCELLED") ?? 0,
    refundedPayments,
    totalRefundAmount,
    refundedAmount: totalRefundAmount,
    totalPaidAmount,
    paymentsByStatus: paymentStatuses.map((status) => ({ status, totalPayments: statusMap.get(status) ?? 0 })),
    paymentsByMethod: paymentMethods.map((method) => ({ method, totalPayments: methodMap.get(method) ?? 0 })),
  };
};

const mapShippingSummary = async (): Promise<DashboardShippingSummary> => {
  const [totalShippingMethods, activeShippingMethods, inactiveShippingMethods] = await Promise.all([
    prismaClient.shippingMethod.count({ where: { deletedAt: null } }),
    prismaClient.shippingMethod.count({ where: { deletedAt: null, status: "ACTIVE" } }),
    prismaClient.shippingMethod.count({ where: { deletedAt: null, status: "INACTIVE" } }),
  ]);

  return { totalShippingMethods, activeShippingMethods, inactiveShippingMethods };
};

const mapCouponSummary = async () => ({ totalCoupons: await prismaClient.coupon.count({ where: { deletedAt: null } }) });

const mapRevenueChart = async (range: DashboardRangeWindow): Promise<DashboardRevenueChartPoint[]> => {
  const records = await prismaClient.order.findMany({
    where: { status: "DELIVERED", createdAt: { gte: range.from, lte: range.to } },
    select: { createdAt: true, payableAmount: true },
  });

  const revenueMap = aggregateRevenueByDate(range, records);
  const buckets = buildBuckets(range);

  return buckets.map((bucket) => ({ label: bucket.label, revenue: roundToTwo(revenueMap.get(bucket.key) ?? 0) }));
};

const mapOrderChart = async (range: DashboardRangeWindow): Promise<DashboardOrdersChartPoint[]> => {
  const records = await prismaClient.order.findMany({ where: { createdAt: { gte: range.from, lte: range.to } }, select: { createdAt: true, status: true } });
  const granularity = getChartGranularity(range);
  const orderMap = new Map<string, Partial<Record<OrderStatus, number>>>();

  for (const record of records) {
    const key = bucketKey(record.createdAt, granularity);
    const current = orderMap.get(key) ?? {};
    current[record.status] = (current[record.status] ?? 0) + 1;
    orderMap.set(key, current);
  }

  return buildBuckets(range).map((bucket) => {
    const current = orderMap.get(bucket.key) ?? {};
    return {
      label: bucket.label,
      totalOrders: orderStatuses.reduce((sum, status) => sum + (current[status] ?? 0), 0),
      pendingOrders: current.PENDING ?? 0,
      confirmedOrders: current.CONFIRMED ?? 0,
      processingOrders: current.PROCESSING ?? 0,
      packedOrders: current.PACKED ?? 0,
      shippedOrders: current.SHIPPED ?? 0,
      deliveredOrders: current.DELIVERED ?? 0,
      cancelledOrders: current.CANCELLED ?? 0,
      returnedOrders: current.RETURNED ?? 0,
    };
  });
};

const mapPaymentChart = async (range: DashboardRangeWindow): Promise<DashboardPaymentChartPoint[]> => {
  const records = await prismaClient.payment.findMany({ where: { createdAt: { gte: range.from, lte: range.to } }, select: { createdAt: true, status: true } });
  const granularity = getChartGranularity(range);
  const paymentMap = new Map<string, Partial<Record<PaymentStatus, number>>>();

  for (const record of records) {
    const key = bucketKey(record.createdAt, granularity);
    const current = paymentMap.get(key) ?? {};
    current[record.status] = (current[record.status] ?? 0) + 1;
    paymentMap.set(key, current);
  }

  return buildBuckets(range).map((bucket) => {
    const current = paymentMap.get(bucket.key) ?? {};
    return {
      label: bucket.label,
      totalPayments: paymentStatuses.reduce((sum, status) => sum + (current[status] ?? 0), 0),
      pendingPayments: current.PENDING ?? 0,
      paidPayments: current.PAID ?? 0,
      failedPayments: current.FAILED ?? 0,
      cancelledPayments: current.CANCELLED ?? 0,
      refundedPayments: current.REFUNDED ?? 0,
    };
  });
};

const mapCustomerChart = async (range: DashboardRangeWindow): Promise<DashboardCustomerGrowthChartPoint[]> => {
  const records = await prismaClient.user.findMany({ where: { role: "CUSTOMER", createdAt: { gte: range.from, lte: range.to } }, select: { createdAt: true } });
  const growthMap = aggregateByDate(range, records);

  return buildBuckets(range).map((bucket) => ({ label: bucket.label, totalCustomers: growthMap.get(bucket.key) ?? 0 }));
};

const mapRecentOrders = async (query: DashboardQuery): Promise<DashboardRecentOrderItem[]> => {
  const page = query.page ?? 1;
  const limit = query.limit ?? 10;
  const orderBy = query.sortOrder ?? "desc";

  const orders = await prismaClient.order.findMany({
    orderBy: { createdAt: orderBy },
    skip: (page - 1) * limit,
    take: limit,
    select: {
      orderCode: true,
      customerName: true,
      payableAmount: true,
      status: true,
      createdAt: true,
      payment: { select: { method: true, status: true } },
    },
  });

  return orders.map((order) => ({
    orderNumber: order.orderCode,
    customerName: order.customerName,
    totalAmount: roundToTwo(order.payableAmount),
    paymentMethod: order.payment?.method ?? null,
    paymentStatus: order.payment?.status ?? null,
    orderStatus: order.status,
    createdAt: order.createdAt,
  }));
};

const mapRecentCustomers = async (query: DashboardQuery): Promise<DashboardRecentCustomerItem[]> => {
  const page = query.page ?? 1;
  const limit = query.limit ?? 10;
  const orderBy = query.sortOrder ?? "desc";

  const users = await prismaClient.user.findMany({
    where: { role: "CUSTOMER" },
    orderBy: { createdAt: orderBy },
    skip: (page - 1) * limit,
    take: limit,
    select: { name: true, email: true, createdAt: true },
  });

  return users.map((user) => ({ name: user.name, email: user.email, registrationDate: user.createdAt }));
};

const mapTopSellingProducts = async (query: DashboardQuery): Promise<DashboardTopSellingProductItem[]> => {
  const page = query.page ?? 1;
  const limit = query.limit ?? 10;
  const sortBy = query.sortBy ?? "soldQuantity";
  const orderBy = query.sortOrder ?? "desc";

  const groupedItems = await prismaClient.orderItem.groupBy({
    by: ["productId"],
    where: { order: { status: "DELIVERED" } },
    _sum: { quantity: true, totalPrice: true },
    orderBy: sortBy === "revenue" ? { _sum: { totalPrice: orderBy } } : { _sum: { quantity: orderBy } },
    skip: (page - 1) * limit,
    take: limit,
  });

  const products = await prismaClient.product.findMany({
    where: { id: { in: groupedItems.map((item) => item.productId) } },
    select: { id: true, title: true, slug: true, thumbnailImage: true },
  });

  const productMap = new Map(products.map((product) => [product.id, product]));

  return groupedItems.map((item) => {
    const product = productMap.get(item.productId);
    return {
      productId: item.productId,
      productName: product?.title ?? "Unknown Product",
      slug: product?.slug ?? item.productId,
      thumbnailImage: formatPublicUrl(product?.thumbnailImage),
      soldQuantity: item._sum.quantity ?? 0,
      revenue: roundToTwo(item._sum.totalPrice ?? 0),
    };
  });
};

const mapRecentPayments = async (query: DashboardQuery): Promise<DashboardRecentPaymentItem[]> => {
  const page = query.page ?? 1;
  const limit = query.limit ?? 10;
  const orderBy = query.sortOrder ?? "desc";

  const payments = await prismaClient.payment.findMany({
    orderBy: { createdAt: orderBy },
    skip: (page - 1) * limit,
    take: limit,
    select: {
      method: true,
      status: true,
      paidAmount: true,
      createdAt: true,
      order: { select: { customerName: true, payableAmount: true } },
    },
  });

  return payments.map((payment) => ({
    customer: payment.order.customerName,
    amount: roundToTwo(payment.paidAmount ?? payment.order.payableAmount),
    paymentMethod: payment.method,
    paymentStatus: payment.status,
    date: payment.createdAt,
  }));
};

export const getDashboardRevenueAnalytics = async (query: DashboardQuery): Promise<DashboardRevenueAnalytics> => mapRevenueSummary(query);

export const getDashboardOrderAnalytics = async (): Promise<DashboardOrderAnalytics> => mapOrderSummary();

export const getDashboardCustomerAnalytics = async (): Promise<DashboardCustomerAnalytics> => mapCustomerSummary();

export const getDashboardPaymentAnalytics = async (): Promise<DashboardPaymentAnalytics> => mapPaymentSummary();

export const getDashboardCharts = async (query: DashboardQuery): Promise<DashboardCharts> => {
  const range = resolveRangeWindow(query);
  const [revenueChart, ordersChart, paymentChart, customerGrowthChart] = await Promise.all([
    mapRevenueChart(range),
    mapOrderChart(range),
    mapPaymentChart(range),
    mapCustomerChart(range),
  ]);

  return { range, revenueChart, ordersChart, paymentChart, customerGrowthChart };
};

export const getDashboardRecent = async (query: DashboardQuery): Promise<DashboardRecent> => {
  const [recentOrders, recentCustomers, topSellingProducts, recentPayments] = await Promise.all([
    mapRecentOrders(query),
    mapRecentCustomers(query),
    mapTopSellingProducts(query),
    mapRecentPayments(query),
  ]);

  return { recentOrders, recentCustomers, topSellingProducts, recentPayments };
};

export const getDashboardOverview = async (query: DashboardQuery): Promise<DashboardOverview> => {
  const [revenue, orders, products, customers, payments, coupons, shipping] = await Promise.all([
    mapRevenueSummary(query),
    mapOrderSummary(),
    mapProductSummary(),
    mapCustomerSummary(),
    mapPaymentSummary(),
    mapCouponSummary(),
    mapShippingSummary(),
  ]);

  return { generatedAt: new Date(), revenue, orders, products, customers, payments, coupons, shipping };
};

export const getDashboardStatistics = getDashboardOverview;