import type { OrderStatus, PaymentMethod, PaymentStatus, Prisma } from "@prisma/client";
import prismaClient from "../../config/prisma";
import { generateReportExportBuffer } from "./reports.exporter";
import type {
  CouponReportResponseData,
  CustomerReportResponseData,
  ExportFormat,
  OrderReportResponseData,
  PaginationMeta,
  PaymentReportResponseData,
  ProductReportResponseData,
  ReportQueryOptions,
  RevenueBreakdownPoint,
  RevenueReportResponseData,
  SalesReportResponseData,
  SalesReportSummaryProduct,
  ShippingReportResponseData,
} from "./reports.interface";
import { calculateDateRange, formatDateString } from "./reports.utils";

export const getSalesReport = async (
  options: ReportQueryOptions
): Promise<{ data: SalesReportResponseData; meta: PaginationMeta }> => {
  const { startDate, endDate } = calculateDateRange(options.range, options.from, options.to);
  const page = options.page ?? 1;
  const limit = options.limit ?? 10;
  const skip = (page - 1) * limit;
  const search = options.search?.trim();

  // Sales and Revenue MUST ONLY use DELIVERED status with PAID payment
  const baseWhere: Prisma.OrderWhereInput = {
    status: "DELIVERED",
    payment: { status: "PAID" },
    createdAt: {
      gte: startDate,
      lte: endDate,
    },
  };

  if (search) {
    baseWhere.OR = [
      { orderCode: { contains: search, mode: "insensitive" } },
      { customerName: { contains: search, mode: "insensitive" } },
      { userEmail: { contains: search, mode: "insensitive" } },
      { items: { some: { product: { title: { contains: search, mode: "insensitive" } } } } },
      { items: { some: { productCode: { contains: search, mode: "insensitive" } } } },
    ];
  }

  // Sorting
  let orderBy: Prisma.OrderOrderByWithRelationInput = { createdAt: "desc" };
  if (options.sortBy === "revenue") {
    orderBy = { payableAmount: options.sortOrder ?? "desc" };
  } else if (options.sortBy === "date" || options.sortBy === "createdAt") {
    orderBy = { createdAt: options.sortOrder ?? "desc" };
  }

  const [totalSales, totalRevenueAgg, orders, totalItems] = await Promise.all([
    prismaClient.order.count({
      where: {
        status: "DELIVERED",
        payment: { status: "PAID" },
        createdAt: { gte: startDate, lte: endDate },
      },
    }),
    prismaClient.order.aggregate({
      _sum: { payableAmount: true },
      where: {
        status: "DELIVERED",
        payment: { status: "PAID" },
        createdAt: { gte: startDate, lte: endDate },
      },
    }),
    prismaClient.order.findMany({
      where: baseWhere,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        orderCode: true,
        customerName: true,
        userEmail: true,
        payableAmount: true,
        status: true,
        deliveredAt: true,
        createdAt: true,
      },
    }),
    prismaClient.order.count({ where: baseWhere }),
  ]);

  const totalRevenue = totalRevenueAgg._sum.payableAmount ?? 0;
  const averageOrderValue = totalSales > 0 ? Number((totalRevenue / totalSales).toFixed(2)) : 0;

  // Top & Lowest Selling Products from DELIVERED order items in range
  const productAggregates = await prismaClient.orderItem.groupBy({
    by: ["productId"],
    _sum: {
      quantity: true,
      totalPrice: true,
    },
    where: {
      order: {
        status: "DELIVERED",
        createdAt: { gte: startDate, lte: endDate },
      },
    },
  });

  const sortedByQtyDesc = [...productAggregates].sort(
    (a, b) => (b._sum.quantity ?? 0) - (a._sum.quantity ?? 0)
  );

  const topProductIds = sortedByQtyDesc.slice(0, 5).map((p) => p.productId);
  const lowestProductIds = sortedByQtyDesc.slice(-5).reverse().map((p) => p.productId);
  const allProductIds = Array.from(new Set([...topProductIds, ...lowestProductIds]));

  const productsList = await prismaClient.product.findMany({
    where: { id: { in: allProductIds } },
    select: { id: true, title: true, productCode: true },
  });
  const productMap = new Map(productsList.map((p) => [p.id, p]));

  const formatSummaryProducts = (ids: string[]): SalesReportSummaryProduct[] =>
    ids.map((id) => {
      const p = productMap.get(id);
      const agg = productAggregates.find((a) => a.productId === id);
      return {
        productId: id,
        title: p?.title ?? "Unknown Product",
        productCode: p?.productCode ?? "N/A",
        soldQuantity: agg?._sum.quantity ?? 0,
        totalRevenue: agg?._sum.totalPrice ?? 0,
      };
    });

  const topSellingProducts = formatSummaryProducts(topProductIds);
  const lowestSellingProducts = formatSummaryProducts(lowestProductIds);

  const responseItems = orders.map((o) => ({
    orderId: o.id,
    orderCode: o.orderCode,
    customerName: o.customerName,
    customerEmail: o.userEmail ?? "N/A",
    payableAmount: o.payableAmount,
    status: o.status,
    deliveredAt: formatDateString(o.deliveredAt),
    createdAt: formatDateString(o.createdAt),
  }));

  const totalPages = Math.ceil(totalItems / limit) || 1;

  return {
    data: {
      summary: {
        totalSales,
        deliveredOrders: totalSales,
        totalRevenue,
        averageOrderValue,
        topSellingProducts,
        lowestSellingProducts,
      },
      items: responseItems,
    },
    meta: {
      page,
      limit,
      total: totalItems,
      totalPages,
    },
  };
};

export const getRevenueReport = async (
  options: ReportQueryOptions
): Promise<{ data: RevenueReportResponseData; meta: PaginationMeta }> => {
  const { startDate, endDate } = calculateDateRange(options.range, options.from, options.to);
  const page = options.page ?? 1;
  const limit = options.limit ?? 10;
  const skip = (page - 1) * limit;
  const search = options.search?.trim();

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const yesterdayStart = new Date(startOfDay);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  const yesterdayEnd = new Date(endOfDay);
  yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);

  const weeklyStart = new Date(startOfDay);
  weeklyStart.setDate(weeklyStart.getDate() - 6);

  const monthlyStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const yearlyStart = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);

  // ONLY DELIVERED orders for revenue
  const [
    todayAgg,
    yesterdayAgg,
    weeklyAgg,
    monthlyAgg,
    yearlyAgg,
    customAgg,
  ] = await Promise.all([
    prismaClient.order.aggregate({
      _sum: { payableAmount: true },
      where: { status: "DELIVERED", payment: { status: "PAID" }, createdAt: { gte: startOfDay, lte: endOfDay } },
    }),
    prismaClient.order.aggregate({
      _sum: { payableAmount: true },
      where: { status: "DELIVERED", payment: { status: "PAID" }, createdAt: { gte: yesterdayStart, lte: yesterdayEnd } },
    }),
    prismaClient.order.aggregate({
      _sum: { payableAmount: true },
      where: { status: "DELIVERED", payment: { status: "PAID" }, createdAt: { gte: weeklyStart, lte: endOfDay } },
    }),
    prismaClient.order.aggregate({
      _sum: { payableAmount: true },
      where: { status: "DELIVERED", payment: { status: "PAID" }, createdAt: { gte: monthlyStart, lte: endOfDay } },
    }),
    prismaClient.order.aggregate({
      _sum: { payableAmount: true },
      where: { status: "DELIVERED", payment: { status: "PAID" }, createdAt: { gte: yearlyStart, lte: endOfDay } },
    }),
    prismaClient.order.aggregate({
      _sum: { payableAmount: true },
      where: { status: "DELIVERED", payment: { status: "PAID" }, createdAt: { gte: startDate, lte: endDate } },
    }),
  ]);

  const baseWhere: Prisma.OrderWhereInput = {
    status: "DELIVERED",
    payment: { status: "PAID" },
    createdAt: { gte: startDate, lte: endDate },
  };

  if (search) {
    baseWhere.OR = [
      { orderCode: { contains: search, mode: "insensitive" } },
      { customerName: { contains: search, mode: "insensitive" } },
      { userEmail: { contains: search, mode: "insensitive" } },
    ];
  }

  let orderBy: Prisma.OrderOrderByWithRelationInput = { createdAt: "desc" };
  if (options.sortBy === "revenue") {
    orderBy = { payableAmount: options.sortOrder ?? "desc" };
  } else if (options.sortBy === "date" || options.sortBy === "createdAt") {
    orderBy = { createdAt: options.sortOrder ?? "desc" };
  }

  const [orders, totalItems] = await Promise.all([
    prismaClient.order.findMany({
      where: baseWhere,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        orderCode: true,
        customerName: true,
        userEmail: true,
        payableAmount: true,
        deliveredAt: true,
        createdAt: true,
      },
    }),
    prismaClient.order.count({ where: baseWhere }),
  ]);

  // Breakdown timeline points for revenue chart / table
  const deliveredOrdersInRange = await prismaClient.order.findMany({
    where: { status: "DELIVERED", createdAt: { gte: startDate, lte: endDate } },
    select: { payableAmount: true, createdAt: true },
  });

  const periodMap = new Map<string, { revenue: number; count: number }>();
  deliveredOrdersInRange.forEach((o) => {
    const periodKey = o.createdAt.toISOString().split("T")[0]!;
    const current = periodMap.get(periodKey) ?? { revenue: 0, count: 0 };
    periodMap.set(periodKey, {
      revenue: current.revenue + o.payableAmount,
      count: current.count + 1,
    });
  });

  const breakdown: RevenueBreakdownPoint[] = Array.from(periodMap.entries())
    .map(([period, data]) => ({
      period,
      revenue: data.revenue,
      deliveredOrdersCount: data.count,
    }))
    .sort((a, b) => a.period.localeCompare(b.period));

  const totalPages = Math.ceil(totalItems / limit) || 1;

  return {
    data: {
      summary: {
        todayRevenue: todayAgg._sum.payableAmount ?? 0,
        yesterdayRevenue: yesterdayAgg._sum.payableAmount ?? 0,
        weeklyRevenue: weeklyAgg._sum.payableAmount ?? 0,
        monthlyRevenue: monthlyAgg._sum.payableAmount ?? 0,
        yearlyRevenue: yearlyAgg._sum.payableAmount ?? 0,
        customDateRangeRevenue: customAgg._sum.payableAmount ?? 0,
      },
      breakdown,
      items: orders.map((o) => ({
        orderId: o.id,
        orderCode: o.orderCode,
        customerName: o.customerName,
        customerEmail: o.userEmail ?? "N/A",
        payableAmount: o.payableAmount,
        deliveredAt: formatDateString(o.deliveredAt),
        createdAt: formatDateString(o.createdAt),
      })),
    },
    meta: {
      page,
      limit,
      total: totalItems,
      totalPages,
    },
  };
};

export const getOrderReport = async (
  options: ReportQueryOptions
): Promise<{ data: OrderReportResponseData; meta: PaginationMeta }> => {
  const { startDate, endDate } = calculateDateRange(options.range, options.from, options.to);
  const page = options.page ?? 1;
  const limit = options.limit ?? 10;
  const skip = (page - 1) * limit;
  const search = options.search?.trim();

  const baseWhere: Prisma.OrderWhereInput = {
    createdAt: { gte: startDate, lte: endDate },
  };

  if (options.status) {
    baseWhere.status = options.status as OrderStatus;
  }

  if (search) {
    baseWhere.OR = [
      { orderCode: { contains: search, mode: "insensitive" } },
      { customerName: { contains: search, mode: "insensitive" } },
      { userEmail: { contains: search, mode: "insensitive" } },
      { customerPhone: { contains: search, mode: "insensitive" } },
    ];
  }

  let orderBy: Prisma.OrderOrderByWithRelationInput = { createdAt: "desc" };
  if (options.sortBy === "revenue") {
    orderBy = { payableAmount: options.sortOrder ?? "desc" };
  } else if (options.sortBy === "date" || options.sortBy === "createdAt") {
    orderBy = { createdAt: options.sortOrder ?? "desc" };
  }

  const [statusGroup, orders, totalItems] = await Promise.all([
    prismaClient.order.groupBy({
      by: ["status"],
      _count: { _all: true },
      where: { createdAt: { gte: startDate, lte: endDate } },
    }),
    prismaClient.order.findMany({
      where: baseWhere,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        orderCode: true,
        customerName: true,
        userEmail: true,
        customerPhone: true,
        status: true,
        payableAmount: true,
        payment: { select: { method: true } },
        createdAt: true,
      },
    }),
    prismaClient.order.count({ where: baseWhere }),
  ]);

  const getStatusCount = (st: OrderStatus): number =>
    statusGroup.find((s) => s.status === st)?._count._all ?? 0;

  const totalOrders = statusGroup.reduce((acc, curr) => acc + curr._count._all, 0);

  const totalPages = Math.ceil(totalItems / limit) || 1;

  return {
    data: {
      summary: {
        totalOrders,
        pendingOrders: getStatusCount("PENDING"),
        confirmedOrders: getStatusCount("CONFIRMED"),
        processingOrders: getStatusCount("PROCESSING"),
        packedOrders: getStatusCount("PACKED"),
        shippedOrders: getStatusCount("SHIPPED"),
        deliveredOrders: getStatusCount("DELIVERED"),
        cancelledOrders: getStatusCount("CANCELLED"),
        returnedOrders: getStatusCount("RETURNED"),
      },
      items: orders.map((o) => ({
        orderId: o.id,
        orderCode: o.orderCode,
        customerName: o.customerName,
        customerEmail: o.userEmail ?? "N/A",
        customerPhone: o.customerPhone,
        status: o.status,
        payableAmount: o.payableAmount,
        paymentMethod: o.payment?.method ?? null,
        createdAt: formatDateString(o.createdAt),
      })),
    },
    meta: {
      page,
      limit,
      total: totalItems,
      totalPages,
    },
  };
};

export const getProductReport = async (
  options: ReportQueryOptions
): Promise<{ data: ProductReportResponseData; meta: PaginationMeta }> => {
  const { startDate, endDate } = calculateDateRange(options.range, options.from, options.to);
  const page = options.page ?? 1;
  const limit = options.limit ?? 10;
  const skip = (page - 1) * limit;
  const search = options.search?.trim();

  const [
    totalProducts,
    activeProducts,
    inactiveProducts,
    featuredProducts,
  ] = await Promise.all([
    prismaClient.product.count(),
    prismaClient.product.count({ where: { status: "ACTIVE" } }),
    prismaClient.product.count({ where: { status: "INACTIVE" } }),
    prismaClient.product.count({ where: { isFeatured: true } }),
  ]);

  const baseWhere: Prisma.ProductWhereInput = {};
  if (options.status) {
    baseWhere.status = options.status as any;
  }

  if (search) {
    baseWhere.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { productCode: { contains: search, mode: "insensitive" } },
      { category: { contains: search, mode: "insensitive" } },
    ];
  }

  const [products, totalItems, deliveredOrderItems] = await Promise.all([
    prismaClient.product.findMany({
      where: baseWhere,
      skip,
      take: limit,
      select: {
        id: true,
        title: true,
        productCode: true,
        category: true,
        categoryRel: { select: { name: true } },
        status: true,
        isFeatured: true,
        customerSellPrice: true,
        costPrice: true,
        createdAt: true,
      },
    }),
    prismaClient.product.count({ where: baseWhere }),
    prismaClient.orderItem.findMany({
      where: {
        order: {
          status: "DELIVERED",
          createdAt: { gte: startDate, lte: endDate },
        },
      },
      select: {
        productId: true,
        quantity: true,
        totalPrice: true,
      },
    }),
  ]);

  // Aggregate product performance metrics
  const productPerformanceMap = new Map<
    string,
    { ordersCount: number; soldQuantity: number; totalRevenue: number }
  >();

  deliveredOrderItems.forEach((item) => {
    const current = productPerformanceMap.get(item.productId) ?? {
      ordersCount: 0,
      soldQuantity: 0,
      totalRevenue: 0,
    };
    productPerformanceMap.set(item.productId, {
      ordersCount: current.ordersCount + 1,
      soldQuantity: current.soldQuantity + item.quantity,
      totalRevenue: current.totalRevenue + item.totalPrice,
    });
  });

  const formattedItems = products.map((p) => {
    const perf = productPerformanceMap.get(p.id) ?? {
      ordersCount: 0,
      soldQuantity: 0,
      totalRevenue: 0,
    };
    return {
      productId: p.id,
      title: p.title,
      productCode: p.productCode,
      category: p.categoryRel?.name ?? p.category ?? "Uncategorized",
      status: p.status,
      isFeatured: p.isFeatured,
      customerSellPrice: p.customerSellPrice,
      costPrice: p.costPrice,
      totalOrdersCount: perf.ordersCount,
      soldQuantity: perf.soldQuantity,
      totalRevenue: perf.totalRevenue,
      createdAt: formatDateString(p.createdAt),
    };
  });

  // Sorting
  if (options.sortBy === "revenue") {
    formattedItems.sort((a, b) =>
      options.sortOrder === "asc"
        ? a.totalRevenue - b.totalRevenue
        : b.totalRevenue - a.totalRevenue
    );
  } else if (options.sortBy === "orders") {
    formattedItems.sort((a, b) =>
      options.sortOrder === "asc"
        ? a.soldQuantity - b.soldQuantity
        : b.soldQuantity - a.soldQuantity
    );
  } else if (options.sortBy === "date" || options.sortBy === "createdAt") {
    formattedItems.sort((a, b) =>
      options.sortOrder === "asc"
        ? a.createdAt.localeCompare(b.createdAt)
        : b.createdAt.localeCompare(a.createdAt)
    );
  }

  const allPerformances = Array.from(productPerformanceMap.entries()).map(([productId, perf]) => ({
    productId,
    ...perf,
  }));
  allPerformances.sort((a, b) => b.soldQuantity - a.soldQuantity);

  const topIds = allPerformances.slice(0, 5).map((p) => p.productId);
  const lowIds = allPerformances.slice(-5).reverse().map((p) => p.productId);

  const summaryProductsList = await prismaClient.product.findMany({
    where: { id: { in: Array.from(new Set([...topIds, ...lowIds])) } },
    select: { id: true, title: true, productCode: true },
  });
  const summaryProductMap = new Map(summaryProductsList.map((p) => [p.id, p]));

  const formatSummary = (ids: string[]): SalesReportSummaryProduct[] =>
    ids.map((id) => {
      const p = summaryProductMap.get(id);
      const perf = productPerformanceMap.get(id);
      return {
        productId: id,
        title: p?.title ?? "Unknown",
        productCode: p?.productCode ?? "N/A",
        soldQuantity: perf?.soldQuantity ?? 0,
        totalRevenue: perf?.totalRevenue ?? 0,
      };
    });

  const totalPages = Math.ceil(totalItems / limit) || 1;

  return {
    data: {
      summary: {
        totalProducts,
        activeProducts,
        inactiveProducts,
        featuredProducts,
        bestSellingProducts: formatSummary(topIds),
        lowestSellingProducts: formatSummary(lowIds),
      },
      items: formattedItems,
    },
    meta: {
      page,
      limit,
      total: totalItems,
      totalPages,
    },
  };
};

export const getCustomerReport = async (
  options: ReportQueryOptions
): Promise<{ data: CustomerReportResponseData; meta: PaginationMeta }> => {
  const { startDate, endDate } = calculateDateRange(options.range, options.from, options.to);
  const page = options.page ?? 1;
  const limit = options.limit ?? 10;
  const skip = (page - 1) * limit;
  const search = options.search?.trim();

  const baseUserWhere: Prisma.UserWhereInput = {
    role: { in: ["CUSTOMER", "RESELLER"] },
  };

  if (search) {
    baseUserWhere.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  const [totalCustomers, newCustomers, activeCustomers, users, totalItems] = await Promise.all([
    prismaClient.user.count({ where: { role: { in: ["CUSTOMER", "RESELLER"] } } }),
    prismaClient.user.count({
      where: {
        role: { in: ["CUSTOMER", "RESELLER"] },
        createdAt: { gte: startDate, lte: endDate },
      },
    }),
    prismaClient.user.count({
      where: {
        role: { in: ["CUSTOMER", "RESELLER"] },
        orders: { some: {} },
      },
    }),
    prismaClient.user.findMany({
      where: baseUserWhere,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        orders: {
          select: {
            id: true,
            status: true,
            payableAmount: true,
          },
        },
      },
    }),
    prismaClient.user.count({ where: baseUserWhere }),
  ]);

  const items = users.map((u) => {
    const totalOrdersCount = u.orders.length;
    const deliveredOrders = u.orders.filter((o) => o.status === "DELIVERED");
    const totalSpent = deliveredOrders.reduce((sum, o) => sum + o.payableAmount, 0);

    return {
      userId: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      isActive: u.isActive,
      totalOrders: totalOrdersCount,
      deliveredOrders: deliveredOrders.length,
      totalSpent,
      registeredAt: formatDateString(u.createdAt),
    };
  });

  // Sorting
  if (options.sortBy === "revenue") {
    items.sort((a, b) =>
      options.sortOrder === "asc" ? a.totalSpent - b.totalSpent : b.totalSpent - a.totalSpent
    );
  } else if (options.sortBy === "orders") {
    items.sort((a, b) =>
      options.sortOrder === "asc" ? a.totalOrders - b.totalOrders : b.totalOrders - a.totalOrders
    );
  } else if (options.sortBy === "date" || options.sortBy === "createdAt") {
    items.sort((a, b) =>
      options.sortOrder === "asc"
        ? a.registeredAt.localeCompare(b.registeredAt)
        : b.registeredAt.localeCompare(a.registeredAt)
    );
  }

  // Top Customers by DELIVERED spend
  const topUsersAgg = await prismaClient.user.findMany({
    where: { role: { in: ["CUSTOMER", "RESELLER"] }, orders: { some: { status: "DELIVERED" } } },
    take: 5,
    select: {
      id: true,
      name: true,
      email: true,
      orders: {
        where: { status: "DELIVERED" },
        select: { payableAmount: true },
      },
    },
  });

  const topCustomers = topUsersAgg
    .map((u) => ({
      userId: u.id,
      name: u.name,
      email: u.email,
      totalOrders: u.orders.length,
      totalSpent: u.orders.reduce((acc, curr) => acc + curr.payableAmount, 0),
    }))
    .sort((a, b) => b.totalSpent - a.totalSpent);

  const totalPages = Math.ceil(totalItems / limit) || 1;

  return {
    data: {
      summary: {
        totalCustomers,
        newCustomers,
        activeCustomers,
        topCustomers,
      },
      items,
    },
    meta: {
      page,
      limit,
      total: totalItems,
      totalPages,
    },
  };
};

export const getPaymentReport = async (
  options: ReportQueryOptions
): Promise<{ data: PaymentReportResponseData; meta: PaginationMeta }> => {
  const { startDate, endDate } = calculateDateRange(options.range, options.from, options.to);
  const page = options.page ?? 1;
  const limit = options.limit ?? 10;
  const skip = (page - 1) * limit;
  const search = options.search?.trim();

  const baseWhere: Prisma.PaymentWhereInput = {
    createdAt: { gte: startDate, lte: endDate },
  };

  if (options.paymentMethod) {
    baseWhere.method = options.paymentMethod as PaymentMethod;
  }

  if (options.status) {
    baseWhere.status = options.status as PaymentStatus;
  }

  if (search) {
    baseWhere.OR = [
      { transactionId: { contains: search, mode: "insensitive" } },
      { senderNumber: { contains: search, mode: "insensitive" } },
      { order: { orderCode: { contains: search, mode: "insensitive" } } },
      { order: { customerName: { contains: search, mode: "insensitive" } } },
      { order: { userEmail: { contains: search, mode: "insensitive" } } },
    ];
  }

  let orderBy: Prisma.PaymentOrderByWithRelationInput = { createdAt: "desc" };
  if (options.sortBy === "revenue") {
    orderBy = { paidAmount: options.sortOrder ?? "desc" };
  } else if (options.sortBy === "date" || options.sortBy === "createdAt") {
    orderBy = { createdAt: options.sortOrder ?? "desc" };
  }

  const [paymentStatusGroup, payments, totalItems] = await Promise.all([
    prismaClient.payment.groupBy({
      by: ["status"],
      _count: { _all: true },
      where: { createdAt: { gte: startDate, lte: endDate } },
    }),
    prismaClient.payment.findMany({
      where: baseWhere,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        orderId: true,
        method: true,
        status: true,
        paidAmount: true,
        transactionId: true,
        createdAt: true,
        order: {
          select: {
            orderCode: true,
            customerName: true,
            userEmail: true,
          },
        },
      },
    }),
    prismaClient.payment.count({ where: baseWhere }),
  ]);

  const getStatusCount = (st: PaymentStatus): number =>
    paymentStatusGroup.find((s) => s.status === st)?._count._all ?? 0;

  const totalPayments = paymentStatusGroup.reduce((acc, curr) => acc + curr._count._all, 0);

  const totalPages = Math.ceil(totalItems / limit) || 1;

  return {
    data: {
      summary: {
        totalPayments,
        paidPayments: getStatusCount("PAID"),
        pendingPayments: getStatusCount("PENDING"),
        failedPayments: getStatusCount("FAILED"),
        refundedPayments: getStatusCount("REFUNDED"),
      },
      items: payments.map((p) => ({
        paymentId: p.id,
        orderId: p.orderId,
        orderCode: p.order.orderCode,
        customerName: p.order.customerName,
        customerEmail: p.order.userEmail ?? "N/A",
        method: p.method,
        status: p.status,
        paidAmount: p.paidAmount,
        transactionId: p.transactionId,
        createdAt: formatDateString(p.createdAt),
      })),
    },
    meta: {
      page,
      limit,
      total: totalItems,
      totalPages,
    },
  };
};

export const getShippingReport = async (
  options: ReportQueryOptions
): Promise<{ data: ShippingReportResponseData; meta: PaginationMeta }> => {
  const { startDate, endDate } = calculateDateRange(options.range, options.from, options.to);
  const page = options.page ?? 1;
  const limit = options.limit ?? 10;
  const skip = (page - 1) * limit;
  const search = options.search?.trim();

  const baseWhere: Prisma.ShippingMethodWhereInput = {
    deletedAt: null,
  };

  if (search) {
    baseWhere.name = { contains: search, mode: "insensitive" };
  }

  const [shippingMethodsCount, methods, totalItems, deliveredShipments, returnedShipments] = await Promise.all([
    prismaClient.shippingMethod.count({ where: { deletedAt: null } }),
    prismaClient.shippingMethod.findMany({
      where: baseWhere,
      skip,
      take: limit,
      select: {
        id: true,
        name: true,
        charge: true,
        status: true,
        orders: {
          where: { createdAt: { gte: startDate, lte: endDate } },
          select: {
            id: true,
            status: true,
            payableAmount: true,
            deliveryCharge: true,
          },
        },
      },
    }),
    prismaClient.shippingMethod.count({ where: baseWhere }),
    prismaClient.order.count({
      where: {
        status: "DELIVERED",
        shippingMethodId: { not: null },
        createdAt: { gte: startDate, lte: endDate },
      },
    }),
    prismaClient.order.count({
      where: {
        status: "RETURNED",
        shippingMethodId: { not: null },
        createdAt: { gte: startDate, lte: endDate },
      },
    }),
  ]);

  const ordersByShippingMethod = methods.map((m) => {
    const totalOrders = m.orders.length;
    const totalDeliveryCharge = m.orders.reduce((sum, o) => sum + o.deliveryCharge, 0);
    return {
      shippingMethodId: m.id,
      name: m.name,
      totalOrders,
      totalDeliveryCharge,
    };
  });

  const items = methods.map((m) => {
    const totalOrders = m.orders.length;
    const deliveredOrders = m.orders.filter((o) => o.status === "DELIVERED").length;
    const returnedOrders = m.orders.filter((o) => o.status === "RETURNED").length;
    const totalRevenue = m.orders
      .filter((o) => o.status === "DELIVERED")
      .reduce((sum, o) => sum + o.payableAmount, 0);

    return {
      shippingMethodId: m.id,
      name: m.name,
      charge: m.charge,
      status: m.status,
      totalOrders,
      deliveredOrders,
      returnedOrders,
      totalRevenue,
    };
  });

  const totalPages = Math.ceil(totalItems / limit) || 1;

  return {
    data: {
      summary: {
        shippingMethods: shippingMethodsCount,
        ordersByShippingMethod,
        deliveredShipments,
        returnedShipments,
      },
      items,
    },
    meta: {
      page,
      limit,
      total: totalItems,
      totalPages,
    },
  };
};

export const getCouponReport = async (
  options: ReportQueryOptions
): Promise<{ data: CouponReportResponseData; meta: PaginationMeta }> => {
  const { startDate, endDate } = calculateDateRange(options.range, options.from, options.to);
  const page = options.page ?? 1;
  const limit = options.limit ?? 10;
  const skip = (page - 1) * limit;
  const search = options.search?.trim();

  const now = new Date();

  const baseWhere: Prisma.CouponWhereInput = {
    deletedAt: null,
  };

  if (search) {
    baseWhere.OR = [
      { code: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  const [
    totalCoupons,
    activeCoupons,
    expiredCoupons,
    totalUsagesAgg,
    coupons,
    totalItems,
  ] = await Promise.all([
    prismaClient.coupon.count({ where: { deletedAt: null } }),
    prismaClient.coupon.count({
      where: { deletedAt: null, isActive: true, expiresAt: { gte: now } },
    }),
    prismaClient.coupon.count({
      where: {
        deletedAt: null,
        OR: [{ isActive: false }, { expiresAt: { lt: now } }],
      },
    }),
    prismaClient.couponUsage.aggregate({
      _count: { _all: true },
      _sum: { discountAmount: true },
      where: { createdAt: { gte: startDate, lte: endDate } },
    }),
    prismaClient.coupon.findMany({
      where: baseWhere,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        code: true,
        discountType: true,
        discountValue: true,
        isActive: true,
        startsAt: true,
        expiresAt: true,
        createdAt: true,
        usages: {
          where: { createdAt: { gte: startDate, lte: endDate } },
          select: {
            discountAmount: true,
          },
        },
      },
    }),
    prismaClient.coupon.count({ where: baseWhere }),
  ]);

  const items = coupons.map((c) => {
    const usageCount = c.usages.length;
    const totalDiscountGiven = c.usages.reduce((sum, u) => sum + u.discountAmount, 0);

    return {
      couponId: c.id,
      code: c.code,
      discountType: c.discountType,
      discountValue: c.discountValue,
      isActive: c.isActive,
      startsAt: formatDateString(c.startsAt),
      expiresAt: formatDateString(c.expiresAt),
      usageCount,
      totalDiscountGiven,
      createdAt: formatDateString(c.createdAt),
    };
  });

  const totalPages = Math.ceil(totalItems / limit) || 1;

  return {
    data: {
      summary: {
        totalCoupons,
        activeCoupons,
        expiredCoupons,
        couponUsageCount: totalUsagesAgg._count._all ?? 0,
        totalDiscountGiven: totalUsagesAgg._sum.discountAmount ?? 0,
      },
      items,
    },
    meta: {
      page,
      limit,
      total: totalItems,
      totalPages,
    },
  };
};

export const exportReportData = async (
  reportType:
    | "sales"
    | "revenue"
    | "orders"
    | "products"
    | "customers"
    | "payments"
    | "shipping"
    | "coupons",
  format: ExportFormat,
  options: ReportQueryOptions
): Promise<{ buffer: Buffer; contentType: string; fileName: string }> => {
  const exportOptions: ReportQueryOptions = {
    ...options,
    page: 1,
    limit: 5000, // Export full filtered dataset
  };

  switch (reportType) {
    case "sales": {
      const result = await getSalesReport(exportOptions);
      const headers = ["Order ID", "Order Code", "Customer Name", "Customer Email", "Payable Amount", "Status", "Delivered At", "Created At"];
      const rows = result.data.items.map((i) => [
        i.orderId,
        i.orderCode,
        i.customerName,
        i.customerEmail,
        i.payableAmount,
        i.status,
        i.deliveredAt || "",
        i.createdAt,
      ]);
      return generateReportExportBuffer(format, "Sales Report", headers, rows);
    }
    case "revenue": {
      const result = await getRevenueReport(exportOptions);
      const headers = ["Order ID", "Order Code", "Customer Name", "Customer Email", "Revenue Amount", "Delivered At", "Created At"];
      const rows = result.data.items.map((i) => [
        i.orderId,
        i.orderCode,
        i.customerName,
        i.customerEmail,
        i.payableAmount,
        i.deliveredAt || "",
        i.createdAt,
      ]);
      return generateReportExportBuffer(format, "Revenue Report", headers, rows);
    }
    case "orders": {
      const result = await getOrderReport(exportOptions);
      const headers = ["Order ID", "Order Code", "Customer Name", "Customer Email", "Customer Phone", "Status", "Payable Amount", "Payment Method", "Created At"];
      const rows = result.data.items.map((i) => [
        i.orderId,
        i.orderCode,
        i.customerName,
        i.customerEmail,
        i.customerPhone,
        i.status,
        i.payableAmount,
        i.paymentMethod || "N/A",
        i.createdAt,
      ]);
      return generateReportExportBuffer(format, "Order Report", headers, rows);
    }
    case "products": {
      const result = await getProductReport(exportOptions);
      const headers = ["Product ID", "Title", "Product Code", "Category", "Status", "Featured", "Sell Price", "Cost Price", "Sold Qty", "Total Revenue", "Created At"];
      const rows = result.data.items.map((i) => [
        i.productId,
        i.title,
        i.productCode,
        i.category,
        i.status,
        i.isFeatured ? "Yes" : "No",
        i.customerSellPrice,
        i.costPrice,
        i.soldQuantity,
        i.totalRevenue,
        i.createdAt,
      ]);
      return generateReportExportBuffer(format, "Product Report", headers, rows);
    }
    case "customers": {
      const result = await getCustomerReport(exportOptions);
      const headers = ["User ID", "Name", "Email", "Role", "Active", "Total Orders", "Delivered Orders", "Total Spent", "Registered At"];
      const rows = result.data.items.map((i) => [
        i.userId,
        i.name,
        i.email,
        i.role,
        i.isActive ? "Yes" : "No",
        i.totalOrders,
        i.deliveredOrders,
        i.totalSpent,
        i.registeredAt,
      ]);
      return generateReportExportBuffer(format, "Customer Report", headers, rows);
    }
    case "payments": {
      const result = await getPaymentReport(exportOptions);
      const headers = ["Payment ID", "Order Code", "Customer Name", "Customer Email", "Method", "Status", "Paid Amount", "Transaction ID", "Created At"];
      const rows = result.data.items.map((i) => [
        i.paymentId,
        i.orderCode,
        i.customerName,
        i.customerEmail,
        i.method,
        i.status,
        i.paidAmount ?? 0,
        i.transactionId || "N/A",
        i.createdAt,
      ]);
      return generateReportExportBuffer(format, "Payment Report", headers, rows);
    }
    case "shipping": {
      const result = await getShippingReport(exportOptions);
      const headers = ["Shipping Method ID", "Method Name", "Charge", "Status", "Total Orders", "Delivered Orders", "Returned Orders", "Total Revenue"];
      const rows = result.data.items.map((i) => [
        i.shippingMethodId,
        i.name,
        i.charge,
        i.status,
        i.totalOrders,
        i.deliveredOrders,
        i.returnedOrders,
        i.totalRevenue,
      ]);
      return generateReportExportBuffer(format, "Shipping Report", headers, rows);
    }
    case "coupons": {
      const result = await getCouponReport(exportOptions);
      const headers = ["Coupon ID", "Code", "Discount Type", "Discount Value", "Active", "Starts At", "Expires At", "Usage Count", "Total Discount Given", "Created At"];
      const rows = result.data.items.map((i) => [
        i.couponId,
        i.code,
        i.discountType,
        i.discountValue,
        i.isActive ? "Yes" : "No",
        i.startsAt,
        i.expiresAt,
        i.usageCount,
        i.totalDiscountGiven,
        i.createdAt,
      ]);
      return generateReportExportBuffer(format, "Coupon Report", headers, rows);
    }
    default:
      throw new Error(`Invalid report type: ${reportType}`);
  }
};
